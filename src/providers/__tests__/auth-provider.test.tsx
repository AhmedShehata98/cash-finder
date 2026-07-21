import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { act, render, waitFor } from "@testing-library/react-native"
import { Text } from "react-native"
import { AuthProvider, useAuth } from "../auth-provider"
import { supabase } from "@/lib/supabase"
import { claimGuestProgress } from "@/features/gamification/services/gamification-repository"
import { queryClient } from "@/lib/query-client"

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOtp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

jest.mock("@/features/auth/auth-redirect", () => ({
  getAuthRedirectUrl: jest.fn(() => "cashfinder://auth/callback?returnTo=%2Frewards"),
}))

jest.mock("@/features/auth/auth-callback", () => ({
  completeAuthCallback: jest.fn(),
}))

jest.mock("@/features/gamification/services/gamification-repository", () => ({
  claimGuestProgress: jest.fn(),
}))

jest.mock("@/lib/query-client", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}))

const getSession = jest.mocked(supabase.auth.getSession)
const onAuthStateChange = jest.mocked(supabase.auth.onAuthStateChange)
const signInWithOtp = jest.mocked(supabase.auth.signInWithOtp)
const claimProgress = jest.mocked(claimGuestProgress)
const invalidateQueries = jest.mocked(queryClient.invalidateQueries)
const unsubscribe = jest.fn()
let authListener: ((event: string, session: unknown) => void) | undefined

function Consumer() {
  const auth = useAuth()
  return <Text>{auth.isLoading ? "loading" : auth.user?.id ?? "guest"}</Text>
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    authListener = undefined
    getSession.mockResolvedValue({ data: { session: null }, error: null } as never)
    onAuthStateChange.mockImplementation((listener) => {
      authListener = listener as typeof authListener
      return { data: { subscription: { unsubscribe } } } as never
    })
    signInWithOtp.mockResolvedValue({ data: { user: null, session: null }, error: null } as never)
    claimProgress.mockResolvedValue({ transferredXp: 1 } as never)
    invalidateQueries.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("registers one auth listener and cleans it up", async () => {
    const view = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => expect(view.getByText("guest")).toBeTruthy())
    expect(onAuthStateChange).toHaveBeenCalledTimes(1)
    await view.unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it("merges guest progress once for repeated events from the same user", async () => {
    const view = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )
    await waitFor(() => expect(authListener).toBeDefined())

    await act(async () => {
      authListener?.("SIGNED_IN", { user: { id: "user-id" } })
      authListener?.("TOKEN_REFRESHED", { user: { id: "user-id" } })
    })

    await waitFor(() => expect(view.getByText("user-id")).toBeTruthy())
    expect(claimProgress).toHaveBeenCalledTimes(1)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["gamification"] })
  })

  it("keeps the authenticated session when guest merging fails", async () => {
    claimProgress.mockRejectedValue(new Error("temporary failure"))
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
    const view = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )
    await waitFor(() => expect(authListener).toBeDefined())

    await act(async () => {
      authListener?.("SIGNED_IN", { user: { id: "authenticated-user" } })
    })

    await waitFor(() => expect(view.getByText("authenticated-user")).toBeTruthy())
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})

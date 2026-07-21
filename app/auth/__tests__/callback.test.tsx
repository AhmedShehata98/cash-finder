import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { fireEvent, render, waitFor } from "@testing-library/react-native"
import AuthCallbackScreen from "../callback"
import type { AuthCallbackResult } from "@/features/auth/auth-callback"

const mockReplace = jest.fn()
const mockComplete = jest.fn<() => Promise<AuthCallbackResult>>()
let mockUrl: string | null = "cashfinder://auth/callback?code=value&returnTo=%2Frewards"

jest.mock("expo-linking", () => ({ useLinkingURL: () => mockUrl }))
jest.mock("@/features/auth/auth-callback", () => ({
  isAuthCallbackError: (error: { name?: string }) => error?.name === "AuthCallbackError",
}))
jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ returnTo: "/rewards" }),
}))
jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ completeAuthCallback: mockComplete }),
}))
jest.mock("@/i18n", () => ({
  useI18n: () => ({ isRTL: false, t: (key: string) => key }),
}))

describe("AuthCallbackScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUrl = "cashfinder://auth/callback?code=value&returnTo=%2Frewards"
  })

  it("processes the incoming link and replaces the callback route", async () => {
    mockComplete.mockResolvedValue({
      session: { user: { id: "user-id" } },
      destination: "/rewards",
    } as AuthCallbackResult)

    await render(<AuthCallbackScreen />)

    await waitFor(() => expect(mockComplete).toHaveBeenCalledWith(mockUrl))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/rewards"))
  })

  it("shows a stable invalid-link message and preserves the return destination", async () => {
    mockComplete.mockRejectedValue({ name: "AuthCallbackError", code: "invalid" })
    const screen = await render(<AuthCallbackScreen />)

    await waitFor(() => expect(screen.getByText("auth.callback.invalid")).toBeTruthy())
    await fireEvent.press(screen.getByText("auth.callback.requestNew"))

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/auth/sign-in",
      params: { returnTo: "/rewards" },
    })
  })

  it("shows unsupported state when no callback URL is available", async () => {
    mockUrl = null
    const screen = await render(<AuthCallbackScreen />)

    await waitFor(() => expect(screen.getByText("auth.callback.unsupported")).toBeTruthy())
    expect(mockComplete).not.toHaveBeenCalled()
  })
})

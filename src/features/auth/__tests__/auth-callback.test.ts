import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { supabase } from "@/lib/supabase"
import { AuthCallbackError, completeAuthCallback } from "../auth-callback"

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}))

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `digest:${value}`),
}))

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: jest.fn(),
      setSession: jest.fn(),
      verifyOtp: jest.fn(),
      getSession: jest.fn(),
    },
  },
}))

const session = { user: { id: "user-id" }, access_token: "session-token" }
const exchangeCodeForSession = jest.mocked(supabase.auth.exchangeCodeForSession)
const setSession = jest.mocked(supabase.auth.setSession)
const verifyOtp = jest.mocked(supabase.auth.verifyOtp)
const getSession = jest.mocked(supabase.auth.getSession)
const getItem = jest.mocked(AsyncStorage.getItem)
const setItem = jest.mocked(AsyncStorage.setItem)

describe("completeAuthCallback", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getItem.mockResolvedValue(null)
    setItem.mockResolvedValue(undefined)
  })

  it("exchanges a PKCE code and restores an allowlisted destination", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null } as never)

    await expect(
      completeAuthCallback("cashfinder://auth/callback?code=one-time&returnTo=%2Frewards")
    ).resolves.toEqual({ session, destination: "/rewards" })

    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time")
    expect(setItem).toHaveBeenCalledWith("last_completed_auth_callback", "digest:code:one-time")
  })

  it("accepts a legacy implicit callback without exposing tokens", async () => {
    setSession.mockResolvedValue({ data: { session }, error: null } as never)

    await expect(
      completeAuthCallback(
        "cashfinder://auth/callback#access_token=access-secret&refresh_token=refresh-secret"
      )
    ).resolves.toMatchObject({ destination: "/discover" })

    expect(setSession).toHaveBeenCalledWith({
      access_token: "access-secret",
      refresh_token: "refresh-secret",
    })
  })

  it("verifies a supported token hash callback", async () => {
    verifyOtp.mockResolvedValue({ data: { session }, error: null } as never)

    await completeAuthCallback("cashfinder://auth/callback?token_hash=hash&type=email")

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type: "email" })
  })

  it("prevents duplicate exchanges while a callback is in flight", async () => {
    let resolveExchange: ((value: unknown) => void) | undefined
    exchangeCodeForSession.mockImplementation(
      () => new Promise((resolve) => (resolveExchange = resolve)) as never
    )

    const first = completeAuthCallback("cashfinder://auth/callback?code=duplicate")
    const second = completeAuthCallback("cashfinder://auth/callback?code=duplicate")
    for (let attempt = 0; attempt < 10 && !resolveExchange; attempt += 1) {
      await Promise.resolve()
    }
    expect(resolveExchange).toBeDefined()
    resolveExchange?.({ data: { session }, error: null })

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
  })

  it("reuses an active session for an already completed callback", async () => {
    getItem.mockResolvedValue("digest:code:completed")
    getSession.mockResolvedValue({ data: { session }, error: null } as never)

    await expect(
      completeAuthCallback("cashfinder://auth/callback?code=completed")
    ).resolves.toMatchObject({ session })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it.each([
    ["cashfinder://auth/callback?error_code=otp_expired", "expired"],
    ["cashfinder://auth/callback?error=access_denied", "invalid"],
    ["https://example.com/auth/callback?code=value", "unsupported"],
    ["cashfinder://auth/callback", "unsupported"],
  ])("maps an invalid callback to %s", async (url, expectedCode) => {
    await expect(completeAuthCallback(url)).rejects.toMatchObject({
      name: "AuthCallbackError",
      code: expectedCode,
    })
  })

  it("maps retryable exchange failures to a network error", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { name: "AuthRetryableFetchError", message: "fetch failed" },
    } as never)

    await expect(
      completeAuthCallback("cashfinder://auth/callback?code=offline")
    ).rejects.toEqual(new AuthCallbackError("network"))
  })

  it("keeps a successful session when fingerprint persistence fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null } as never)
    setItem.mockRejectedValue(new Error("storage unavailable"))

    await expect(
      completeAuthCallback("cashfinder://auth/callback?code=storage-failure")
    ).resolves.toMatchObject({ session })
  })
})

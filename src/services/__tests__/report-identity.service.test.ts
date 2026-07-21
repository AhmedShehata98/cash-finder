import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"
import { supabase } from "@/lib/supabase"
import {
  ANONYMOUS_INSTALLATION_ID_KEY,
  getOrCreateAnonymousInstallationId,
  REPORT_IDENTITY_UNAVAILABLE,
  resolveReportIdentity,
} from "@/services/report-identity.service"

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(),
  getRandomBytesAsync: jest.fn(async () => new Uint8Array(32).fill(1)),
}))

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}))

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}))

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: jest.fn() } },
}))

const FIRST_ID = "11111111-1111-4111-8111-111111111111"
const SECOND_ID = "22222222-2222-4222-8222-222222222222"

const getItemAsync = jest.mocked(SecureStore.getItemAsync)
const setItemAsync = jest.mocked(SecureStore.setItemAsync)
const getSession = jest.mocked(supabase.auth.getSession)
const randomUUID = jest.mocked(Crypto.randomUUID)
const originalPlatform = Platform.OS
const originalCrypto = globalThis.crypto

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os })
}

describe("report identity", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setPlatform("ios")
    randomUUID.mockReturnValue(FIRST_ID)
  })

  afterEach(() => {
    setPlatform(originalPlatform)
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto })
    jest.restoreAllMocks()
  })

  it("reuses a valid native installation identity", async () => {
    getItemAsync.mockResolvedValue(FIRST_ID)

    await expect(getOrCreateAnonymousInstallationId()).resolves.toBe(FIRST_ID)
    expect(setItemAsync).not.toHaveBeenCalled()
  })

  it("regenerates and persists an invalid native identity", async () => {
    getItemAsync.mockResolvedValueOnce("invalid").mockResolvedValueOnce(FIRST_ID)

    await expect(getOrCreateAnonymousInstallationId()).resolves.toBe(FIRST_ID)
    expect(setItemAsync).toHaveBeenCalledWith(ANONYMOUS_INSTALLATION_ID_KEY, FIRST_ID)
  })

  it("generates an identity when global crypto is unavailable", async () => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined })
    getItemAsync.mockResolvedValueOnce(null).mockResolvedValueOnce(FIRST_ID)

    await expect(getOrCreateAnonymousInstallationId()).resolves.toBe(FIRST_ID)
    expect(randomUUID).toHaveBeenCalledTimes(1)
  })

  it("uses localStorage on web", async () => {
    setPlatform("web")
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: jest.fn((key: string) => values.get(key) ?? null),
        setItem: jest.fn((key: string, value: string) => values.set(key, value)),
      },
    })

    await expect(getOrCreateAnonymousInstallationId()).resolves.toBe(FIRST_ID)
    await expect(getOrCreateAnonymousInstallationId()).resolves.toBe(FIRST_ID)
  })

  it("prefers an authenticated Supabase session", async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: "user-id" } } },
      error: null,
    } as never)

    await expect(resolveReportIdentity()).resolves.toEqual({
      reporterType: "authenticated",
      anonymousInstallationId: null,
      anonymousClaimToken: null,
    })
    expect(getItemAsync).not.toHaveBeenCalled()
  })

  it("uses the stable installation identity for a guest", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null } as never)
    getItemAsync.mockImplementation(async (key) => key === ANONYMOUS_INSTALLATION_ID_KEY ? FIRST_ID : null)

    await expect(resolveReportIdentity()).resolves.toMatchObject({ reporterType: "guest" })
  })

  it("retries persistence once and returns the stable identity error", async () => {
    randomUUID.mockReturnValueOnce(FIRST_ID).mockReturnValueOnce(SECOND_ID)
    getItemAsync.mockRejectedValue(new Error("unavailable"))
    setItemAsync.mockRejectedValue(new Error("unavailable"))

    await expect(getOrCreateAnonymousInstallationId()).rejects.toMatchObject({
      code: REPORT_IDENTITY_UNAVAILABLE,
    })
    expect(setItemAsync).toHaveBeenCalledTimes(2)
  })
})

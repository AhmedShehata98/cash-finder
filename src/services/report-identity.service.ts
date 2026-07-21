import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"
import { supabase } from "@/lib/supabase"

export const ANONYMOUS_INSTALLATION_ID_KEY = "anonymous_installation_id"
export const ANONYMOUS_CLAIM_TOKEN_KEY = "anonymous_claim_token"
export const ANONYMOUS_INSTALLATION_MARKER_KEY = "anonymous_installation_marker"
export const ANONYMOUS_CLAIMED_KEY = "anonymous_progress_claimed"
export const REPORT_IDENTITY_UNAVAILABLE = "REPORT_IDENTITY_UNAVAILABLE"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class ReportIdentityError extends Error {
  readonly code = REPORT_IDENTITY_UNAVAILABLE

  constructor() {
    super("Unable to identify this installation. Please try again.")
    this.name = "ReportIdentityError"
  }
}

function isValidUuid(value: string | null): value is string {
  return value !== null && UUID_PATTERN.test(value)
}

function webStorage() {
  if (typeof globalThis.localStorage === "undefined") throw new ReportIdentityError()
  return globalThis.localStorage
}

async function readInstallationId(): Promise<string | null> {
  if (Platform.OS === "web") {
    return webStorage().getItem(ANONYMOUS_INSTALLATION_ID_KEY)
  }
  return SecureStore.getItemAsync(ANONYMOUS_INSTALLATION_ID_KEY)
}

async function writeInstallationId(value: string): Promise<void> {
  if (Platform.OS === "web") {
    webStorage().setItem(ANONYMOUS_INSTALLATION_ID_KEY, value)
    return
  }
  await SecureStore.setItemAsync(ANONYMOUS_INSTALLATION_ID_KEY, value)
}

function createInstallationId(): string {
  const id = Crypto.randomUUID()
  if (!isValidUuid(id)) throw new ReportIdentityError()
  return id
}

async function createClaimToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")
}

export async function getOrCreateAnonymousInstallationId(): Promise<string> {
  try {
    const stored = await readInstallationId()
    if (isValidUuid(stored)) return stored
  } catch {
    // A fresh write below may recover from a transient read failure.
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const generated = createInstallationId()
      await writeInstallationId(generated)
      const persisted = await readInstallationId()
      if (persisted === generated) return generated
    } catch {
      // Retry once with a fresh identifier before surfacing the stable error.
    }
  }

  throw new ReportIdentityError()
}

export async function getOrCreateGuestIdentity() {
  if (Platform.OS === "web") return null
  const marker = await AsyncStorage.getItem(ANONYMOUS_INSTALLATION_MARKER_KEY)
  let installationId = await SecureStore.getItemAsync(ANONYMOUS_INSTALLATION_ID_KEY)
  let claimToken = await SecureStore.getItemAsync(ANONYMOUS_CLAIM_TOKEN_KEY)
  const isClaimed = (await AsyncStorage.getItem(ANONYMOUS_CLAIMED_KEY)) === "true"

  if (isClaimed && marker && isValidUuid(installationId)) {
    return { installationId, claimToken: claimToken ?? "", isClaimed: true }
  }

  if (!marker || !isValidUuid(installationId) || !claimToken) {
    installationId = createInstallationId()
    claimToken = await createClaimToken()
    await Promise.all([
      SecureStore.setItemAsync(ANONYMOUS_INSTALLATION_ID_KEY, installationId),
      SecureStore.setItemAsync(ANONYMOUS_CLAIM_TOKEN_KEY, claimToken),
      AsyncStorage.setItem(ANONYMOUS_INSTALLATION_MARKER_KEY, installationId),
      AsyncStorage.removeItem(ANONYMOUS_CLAIMED_KEY),
    ])
  }

  return { installationId, claimToken, isClaimed: false }
}

export async function getStoredGuestIdentity() {
  if (Platform.OS === "web") return null
  const [installationId, claimToken, marker, claimed] = await Promise.all([
    SecureStore.getItemAsync(ANONYMOUS_INSTALLATION_ID_KEY),
    SecureStore.getItemAsync(ANONYMOUS_CLAIM_TOKEN_KEY),
    AsyncStorage.getItem(ANONYMOUS_INSTALLATION_MARKER_KEY),
    AsyncStorage.getItem(ANONYMOUS_CLAIMED_KEY),
  ])
  if (!marker || !isValidUuid(installationId)) return null
  return { installationId, claimToken: claimToken ?? "", isClaimed: claimed === "true" }
}

export async function markGuestIdentityClaimed() {
  if (Platform.OS === "web") return
  await Promise.all([
    SecureStore.deleteItemAsync(ANONYMOUS_CLAIM_TOKEN_KEY),
    AsyncStorage.setItem(ANONYMOUS_CLAIMED_KEY, "true"),
  ])
}

export type ReportIdentity =
  | { reporterType: "authenticated"; anonymousInstallationId: null; anonymousClaimToken: null }
  | { reporterType: "guest"; anonymousInstallationId: string; anonymousClaimToken: string | null }

export async function resolveReportIdentity(): Promise<ReportIdentity> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (data.session?.user) {
    return {
      reporterType: "authenticated",
      anonymousInstallationId: null,
      anonymousClaimToken: null,
    }
  }

  const guest = await getOrCreateGuestIdentity()
  return guest
    ? {
        reporterType: "guest",
        anonymousInstallationId: guest.installationId,
        anonymousClaimToken: guest.claimToken || null,
      }
    : {
        reporterType: "guest",
        anonymousInstallationId: await getOrCreateAnonymousInstallationId(),
        anonymousClaimToken: null,
      }
}

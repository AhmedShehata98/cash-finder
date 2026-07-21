import AsyncStorage from "@react-native-async-storage/async-storage"
import type { EmailOtpType, Session } from "@supabase/supabase-js"
import * as Crypto from "expo-crypto"
import { supabase } from "@/lib/supabase"
import {
  APP_SCHEME,
  AUTH_CALLBACK_PATH,
  normalizeAuthDestination,
  type AuthenticatedDestination,
} from "./auth-config"

const LAST_COMPLETED_CALLBACK_KEY = "last_completed_auth_callback"
const SUPPORTED_EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "signup",
  "magiclink",
  "invite",
  "recovery",
  "email_change",
])
const inFlightCallbacks = new Map<string, Promise<AuthCallbackResult>>()

export type AuthCallbackErrorCode =
  | "expired"
  | "invalid"
  | "network"
  | "exchange-failure"
  | "unsupported"

export class AuthCallbackError extends Error {
  constructor(readonly code: AuthCallbackErrorCode) {
    super(code)
    this.name = "AuthCallbackError"
  }
}

export type AuthCallbackResult = {
  session: Session
  destination: AuthenticatedDestination
}

type ParsedCallback = {
  params: URLSearchParams
  destination: AuthenticatedDestination
  fingerprintSource: string
}

function validatedCallbackUrl(url: string): URL {
  let callbackUrl: URL
  try {
    callbackUrl = new URL(url)
  } catch {
    throw new AuthCallbackError("unsupported")
  }

  const expectedPath = AUTH_CALLBACK_PATH.split("/")
  const actualPath = [callbackUrl.hostname, ...callbackUrl.pathname.split("/").filter(Boolean)]
  if (callbackUrl.protocol !== `${APP_SCHEME}:` || actualPath.join("/") !== expectedPath.join("/")) {
    throw new AuthCallbackError("unsupported")
  }
  return callbackUrl
}

function callbackParams(callbackUrl: URL): URLSearchParams {
  const params = new URLSearchParams(callbackUrl.search)
  const fragmentParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""))
  fragmentParams.forEach((parameterValue, key) => {
    if (!params.has(key)) params.set(key, parameterValue)
  })
  return params
}

function callbackFingerprintSource(params: URLSearchParams): string {
  const code = params.get("code")
  const accessToken = params.get("access_token")
  const refreshToken = params.get("refresh_token")
  const tokenHash = params.get("token_hash")
  return code
    ? `code:${code}`
    : accessToken && refreshToken
      ? `tokens:${accessToken}:${refreshToken}`
      : tokenHash
        ? `token-hash:${tokenHash}:${params.get("type") ?? ""}`
        : `error:${params.get("error_code") ?? ""}:${params.get("error") ?? ""}`
}

function parseCallbackUrl(url: string): ParsedCallback {
  const params = callbackParams(validatedCallbackUrl(url))
  return {
    params,
    destination: normalizeAuthDestination(params.get("returnTo")),
    fingerprintSource: callbackFingerprintSource(params),
  }
}

function mapCallbackError(error: unknown): AuthCallbackError {
  if (error instanceof AuthCallbackError) return error
  const details =
    typeof error === "object" && error !== null
      ? (error as { code?: string; message?: string; name?: string; status?: number })
      : {}
  const normalizedError = `${details.code ?? ""} ${details.message ?? ""}`.toLowerCase()
  if (normalizedError.includes("expired")) return new AuthCallbackError("expired")
  if (
    normalizedError.includes("already") ||
    normalizedError.includes("invalid") ||
    normalizedError.includes("otp_disabled") ||
    details.status === 400
  ) {
    return new AuthCallbackError("invalid")
  }
  if (
    details.name === "AuthRetryableFetchError" ||
    normalizedError.includes("network") ||
    normalizedError.includes("fetch") ||
    details.status === 0
  ) {
    return new AuthCallbackError("network")
  }
  return new AuthCallbackError("exchange-failure")
}

function callbackErrorFromParams(params: URLSearchParams): AuthCallbackError | null {
  const errorCode = params.get("error_code")
  const authError = params.get("error")
  const description = params.get("error_description")
  if (!errorCode && !authError && !description) return null
  return mapCallbackError({ code: errorCode ?? authError, message: description ?? undefined, status: 400 })
}

async function requireSession(session: Session | null): Promise<Session> {
  if (!session) throw new AuthCallbackError("exchange-failure")
  return session
}

async function exchangePkceCode(code: string): Promise<Session> {
  const { data: authResponse, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) throw error
  return requireSession(authResponse.session)
}

async function restoreLegacySession(accessToken: string, refreshToken: string): Promise<Session> {
  const { data: authResponse, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (error) throw error
  return requireSession(authResponse.session)
}

async function verifyTokenHash(tokenHash: string, otpType: EmailOtpType): Promise<Session> {
  const { data: authResponse, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType,
  })
  if (error) throw error
  return requireSession(authResponse.session)
}

async function exchangeParsedCallback(parsed: ParsedCallback): Promise<AuthCallbackResult> {
  const callbackError = callbackErrorFromParams(parsed.params)
  if (callbackError) throw callbackError

  const code = parsed.params.get("code")
  const accessToken = parsed.params.get("access_token")
  const refreshToken = parsed.params.get("refresh_token")
  const tokenHash = parsed.params.get("token_hash")
  const otpType = parsed.params.get("type") as EmailOtpType | null

  try {
    if (code) {
      return { session: await exchangePkceCode(code), destination: parsed.destination }
    }

    if (accessToken && refreshToken) {
      return {
        session: await restoreLegacySession(accessToken, refreshToken),
        destination: parsed.destination,
      }
    }

    if (tokenHash && otpType && SUPPORTED_EMAIL_OTP_TYPES.has(otpType)) {
      return { session: await verifyTokenHash(tokenHash, otpType), destination: parsed.destination }
    }
  } catch (error) {
    throw mapCallbackError(error)
  }

  throw new AuthCallbackError("unsupported")
}

async function completedSession(fingerprint: string): Promise<Session | null> {
  let completedFingerprint: string | null = null
  try {
    completedFingerprint = await AsyncStorage.getItem(LAST_COMPLETED_CALLBACK_KEY)
  } catch {
    // The idempotency cache is best-effort and must never block authentication.
  }
  if (completedFingerprint !== fingerprint) return null

  const { data: sessionResponse, error } = await supabase.auth.getSession()
  if (error) throw mapCallbackError(error)
  if (!sessionResponse.session) throw new AuthCallbackError("invalid")
  return sessionResponse.session
}

async function cacheCompletedCallback(fingerprint: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_COMPLETED_CALLBACK_KEY, fingerprint)
  } catch {
    // The active Supabase session remains authoritative if local cache persistence fails.
  }
}

async function runCallbackExchange(
  parsed: ParsedCallback,
  fingerprint: string
): Promise<AuthCallbackResult> {
  const existingSession = await completedSession(fingerprint)
  if (existingSession) return { session: existingSession, destination: parsed.destination }

  const callbackResult = await exchangeParsedCallback(parsed)
  await cacheCompletedCallback(fingerprint)
  return callbackResult
}

export async function completeAuthCallback(url: string): Promise<AuthCallbackResult> {
  const parsed = parseCallbackUrl(url)
  const fingerprint = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    parsed.fingerprintSource
  )
  const existing = inFlightCallbacks.get(fingerprint)
  if (existing) return existing

  const operation = runCallbackExchange(parsed, fingerprint)

  inFlightCallbacks.set(fingerprint, operation)
  try {
    return await operation
  } finally {
    inFlightCallbacks.delete(fingerprint)
  }
}

export function isAuthCallbackError(error: unknown): error is AuthCallbackError {
  return error instanceof AuthCallbackError
}

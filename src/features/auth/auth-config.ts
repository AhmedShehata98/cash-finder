import authConfig from "../../../auth.config.json"

export const APP_SCHEME = authConfig.appScheme
export const AUTH_CALLBACK_PATH = authConfig.authCallbackPath

export const DEFAULT_AUTH_DESTINATION = "/discover" as const
export const AUTHENTICATED_DESTINATIONS = ["/rewards"] as const

export type AuthenticatedDestination =
  | (typeof AUTHENTICATED_DESTINATIONS)[number]
  | typeof DEFAULT_AUTH_DESTINATION

export function normalizeAuthDestination(candidateDestination?: string | null): AuthenticatedDestination {
  return AUTHENTICATED_DESTINATIONS.includes(
    candidateDestination as (typeof AUTHENTICATED_DESTINATIONS)[number]
  )
    ? (candidateDestination as (typeof AUTHENTICATED_DESTINATIONS)[number])
    : DEFAULT_AUTH_DESTINATION
}

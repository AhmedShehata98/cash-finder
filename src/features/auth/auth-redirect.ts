import Constants from "expo-constants"
import * as Linking from "expo-linking"
import { Platform } from "react-native"
import {
  APP_SCHEME,
  AUTH_CALLBACK_PATH,
  normalizeAuthDestination,
  type AuthenticatedDestination,
} from "./auth-config"

export class AuthRedirectUnavailableError extends Error {
  constructor() {
    super("Email link authentication requires an installed Cash Finder development or release build.")
    this.name = "AuthRedirectUnavailableError"
  }
}

export function getAuthRedirectUrl(returnTo?: string | null): string {
  if (Platform.OS === "web" || Constants.appOwnership === "expo") {
    throw new AuthRedirectUnavailableError()
  }

  const destination: AuthenticatedDestination = normalizeAuthDestination(returnTo)
  return Linking.createURL(AUTH_CALLBACK_PATH, {
    scheme: APP_SCHEME,
    queryParams: { returnTo: destination },
  })
}

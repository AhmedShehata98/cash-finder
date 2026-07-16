import Constants from "expo-constants"
import type { HereMapsConfig } from "./types"

const DEFAULT_BASE_URL = "https://browse.search.hereapi.com/v1"

export const hereMapsConfig: HereMapsConfig = {
  apiKey: (Constants.expoConfig?.extra?.hereMapsApiKey as string) || "",
  baseUrl: (Constants.expoConfig?.extra?.hereMapsBaseUrl as string) || DEFAULT_BASE_URL,
}

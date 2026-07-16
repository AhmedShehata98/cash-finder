import type { NearbySearchParams, PlacesProvider } from "../types"
import type { HereMapsBrowseResponse } from "./types"
import { ATM_CATEGORY, BANK_CATEGORY } from "./types"
import { hereMapsConfig } from "./config"
import { mapHereMapsPlacesToFinancialLocations } from "./mapper"

export function createHereMapsProvider(
  configOverride?: Partial<typeof hereMapsConfig>
): PlacesProvider {
  const config = { ...hereMapsConfig, ...configOverride }

  return {
    searchNearby: async (params: NearbySearchParams) => {
      const url = new URL(`${config.baseUrl}/browse`)

      url.searchParams.set("at", `${params.latitude},${params.longitude}`)
      url.searchParams.set("limit", String(params.limit))
      url.searchParams.set("apiKey", config.apiKey)

      if (params.radius > 0) {
        url.searchParams.set("in", `circle:${params.longitude},${params.latitude};r=${params.radius}`)
      }

      const categories = params.categories || [ATM_CATEGORY, BANK_CATEGORY]
      url.searchParams.set("categories", categories.join(","))

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`HERE Maps API error: ${response.status} ${response.statusText}`)
      }

      const data: HereMapsBrowseResponse = await response.json()
      return mapHereMapsPlacesToFinancialLocations(
        data.items,
        params.latitude,
        params.longitude
      )
    },
  }
}

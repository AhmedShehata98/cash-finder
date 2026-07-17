import type { NearbySearchParams, PlacesProvider } from "../types"
import { hereMapsConfig } from "./config"
import { lookupPlaceById } from "./lookup"
import { mapHereMapsPlacesToFinancialLocations } from "./mapper"
import {
  ATM_CATEGORY,
  BANK_CATEGORY,
  MONEY_TRANSFER_CATEGORY,
  type HereMapsBrowseResponse,
} from "./types"

const BROWSE_BASE_URL = "https://browse.search.hereapi.com/v1"
const DISCOVER_BASE_URL = "https://discover.search.hereapi.com/v1"

const DEFAULT_CATEGORIES = [ATM_CATEGORY, BANK_CATEGORY, MONEY_TRANSFER_CATEGORY]

export function createHereMapsProvider(
  configOverride?: Partial<typeof hereMapsConfig>
): PlacesProvider {
  const config = { ...hereMapsConfig, ...configOverride }

  return {
    searchNearby: async (params: NearbySearchParams) => {
      const trimmedQuery = params.query?.trim() ?? ""
      const hasQuery = trimmedQuery.length > 0
      const baseUrl = hasQuery ? DISCOVER_BASE_URL : config.baseUrl || BROWSE_BASE_URL
      const endpoint = hasQuery ? "discover" : "browse"
      const url = new URL(`${baseUrl}/${endpoint}`)

      url.searchParams.set("at", `${params.latitude},${params.longitude}`)
      url.searchParams.set("limit", String(params.limit))
      url.searchParams.set("apiKey", config.apiKey)

      if (hasQuery) {
        url.searchParams.set("q", trimmedQuery)
      }

      if (!hasQuery) {
        const categories = params.categories?.length ? params.categories : DEFAULT_CATEGORIES
        url.searchParams.set("categories", categories.join(","))
      }

      if (params.offset !== undefined && params.offset > 0) {
        url.searchParams.set("offset", String(params.offset))
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`HERE Maps API error: ${response.status} ${response.statusText}`)
      }

      const data: HereMapsBrowseResponse = await response.json()
      return {
        items: mapHereMapsPlacesToFinancialLocations(data.items, params.latitude, params.longitude),
        nextOffset: data.nextOffset ?? null,
      }
    },

    getById: async (id: string) => {
      return lookupPlaceById(id)
    },
  }
}

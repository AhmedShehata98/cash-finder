import { hereMapsConfig } from "./config"
import { mapHereMapsPlaceToFinancialLocation } from "./mapper"
import type { HereMapsLookupResponse } from "./types"

const LOOKUP_BASE_URL = "https://lookup.search.hereapi.com/v1"

export async function lookupPlaceById(id: string) {
  const url = new URL(`${LOOKUP_BASE_URL}/lookup`)

  url.searchParams.set("id", id)
  url.searchParams.set("apiKey", hereMapsConfig.apiKey)

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`HERE Lookup API error: ${response.status} ${response.statusText}`)
  }

  const place: HereMapsLookupResponse = await response.json()

  return mapHereMapsPlaceToFinancialLocation(place, 0, 0)
}
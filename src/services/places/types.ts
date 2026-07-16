import { FinancialLocation } from "@/types"

export type NearbySearchParams = {
  latitude: number
  longitude: number
  radius: number
  limit: number
  categories?: string[]
}

export type PlacesProvider = {
  searchNearby: (_params: NearbySearchParams) => Promise<FinancialLocation[]>
}

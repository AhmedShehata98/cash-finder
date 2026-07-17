import { FinancialLocation } from "@/types"

export type NearbySearchParams = {
  latitude: number
  longitude: number
  radius: number
  limit: number
  query?: string
  offset?: number
  categories?: string[]
}

export type PaginatedNearbySearchResult = {
  items: FinancialLocation[]
  nextOffset: number | null
}

export type PlacesProvider = {
  searchNearby: (_params: NearbySearchParams) => Promise<PaginatedNearbySearchResult>
  getById: (_id: string) => Promise<FinancialLocation>
}

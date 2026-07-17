import { PlacesProvider, NearbySearchParams, PaginatedNearbySearchResult } from "./places"

type FinancialLocationsServiceDeps = {
  placesProvider: PlacesProvider
}

export function createFinancialLocationsService(deps: FinancialLocationsServiceDeps) {
  const { placesProvider } = deps

  return {
    searchNearby: async (params: NearbySearchParams): Promise<PaginatedNearbySearchResult> => {
      return placesProvider.searchNearby(params)
    },
  }
}

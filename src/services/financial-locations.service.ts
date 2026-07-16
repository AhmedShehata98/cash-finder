import { FinancialLocation } from "@/types"
import { PlacesProvider, NearbySearchParams } from "./places"

type FinancialLocationsServiceDeps = {
  placesProvider: PlacesProvider
}

export function createFinancialLocationsService(deps: FinancialLocationsServiceDeps) {
  const { placesProvider } = deps

  return {
    searchNearby: async (params: NearbySearchParams): Promise<FinancialLocation[]> => {
      return placesProvider.searchNearby(params)
    },
  }
}

import { getPlacesProvider } from "@/services/provider-registry"
import type { FinancialLocation } from "@/types"
import { useInfiniteQuery } from "@tanstack/react-query"

type UseNearbyLocationsParams = {
  latitude: number | null
  longitude: number | null
  radius: number
  limit: number
  query?: string
  categories?: string[]
}

export type NearbyLocationsPage = {
  items: FinancialLocation[]
  nextOffset: number | null
}

export function useNearbyLocations(params: UseNearbyLocationsParams) {
  const { latitude, longitude, radius, limit, query = "", categories } = params

  return useInfiniteQuery<NearbyLocationsPage, Error>({
    queryKey: ["nearby-locations", latitude, longitude, radius, limit, query, categories],
    queryFn: async ({ pageParam }) => {
      if (latitude === null || longitude === null) {
        throw new Error("Location not available")
      }

      const provider = getPlacesProvider()
      return provider.searchNearby({
        latitude,
        longitude,
        radius,
        limit,
        query,
        offset: pageParam as number | undefined,
        categories,
      })
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: latitude !== null && longitude !== null,
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
  })
}

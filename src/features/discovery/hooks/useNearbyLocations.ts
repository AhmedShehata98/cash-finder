import { useQuery } from "@tanstack/react-query"
import { getPlacesProvider } from "@/services/provider-registry"
import type { FinancialLocation } from "@/types"

type UseNearbyLocationsParams = {
  latitude: number | null
  longitude: number | null
  radius: number
  limit: number
}

export function useNearbyLocations(params: UseNearbyLocationsParams) {
  const { latitude, longitude, radius, limit } = params

  return useQuery<FinancialLocation[], Error>({
    queryKey: ["nearby-locations", latitude, longitude, radius, limit],
    queryFn: async () => {
      if (latitude === null || longitude === null) {
        throw new Error("Location not available")
      }

      const provider = getPlacesProvider()
      return provider.searchNearby({
        latitude,
        longitude,
        radius,
        limit,
      })
    },
    enabled: latitude !== null && longitude !== null,
    staleTime: 1000 * 60 * 2,
  })
}

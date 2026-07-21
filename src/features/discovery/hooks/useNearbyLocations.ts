import { searchNearbyFinancialServices } from "@/services/supabase/financial-services.repository"
import { FinancialServiceType, type FinancialLocation } from "@/types"
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

      return searchNearbyFinancialServices({
        latitude,
        longitude,
        radius,
        limit,
        query,
        offset: pageParam as number | undefined,
        serviceTypes: mapCategoriesToServiceTypes(categories),
      })
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: latitude !== null && longitude !== null,
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
  })
}

function mapCategoriesToServiceTypes(categories?: string[]): FinancialServiceType[] {
  if (!categories || categories.length === 0 || categories.includes("all")) return []

  const types = new Set<FinancialServiceType>()
  if (categories.includes("atm")) types.add(FinancialServiceType.ATM)
  if (categories.includes("banks")) {
    types.add(FinancialServiceType.BankBranch)
    types.add(FinancialServiceType.CashDepositMachine)
  }
  if (categories.includes("money-transfer")) {
    types.add(FinancialServiceType.Fawry)
    types.add(FinancialServiceType.Aman)
    types.add(FinancialServiceType.Masary)
    types.add(FinancialServiceType.Bee)
    types.add(FinancialServiceType.Dafaa)
    types.add(FinancialServiceType.OtherProvider)
  }

  return [...types]
}

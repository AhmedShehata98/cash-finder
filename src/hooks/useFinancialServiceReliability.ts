import { useQuery } from "@tanstack/react-query"
import { getFinancialServiceReliability } from "@/services/supabase/financial-services.repository"

export const financialServiceReliabilityKey = (id: string) =>
  ["financial-service-reliability", id] as const

export function useFinancialServiceReliability(id: string) {
  return useQuery({
    queryKey: financialServiceReliabilityKey(id),
    queryFn: () => getFinancialServiceReliability(id),
    enabled: !!id,
    staleTime: 1000 * 60,
    retry: 2,
  })
}

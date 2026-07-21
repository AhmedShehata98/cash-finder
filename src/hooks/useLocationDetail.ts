import { useQuery } from "@tanstack/react-query"
import { getFinancialServiceById } from "@/services/supabase/financial-services.repository"

export function useLocationDetail(id: string) {
  return useQuery({
    queryKey: ["location-detail", id],
    queryFn: () => getFinancialServiceById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })
}

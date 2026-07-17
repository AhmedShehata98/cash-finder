import { useQuery } from "@tanstack/react-query"
import { getPlacesProvider } from "@/services/provider-registry"

export function useLocationDetail(id: string) {
  return useQuery({
    queryKey: ["location-detail", id],
    queryFn: () => getPlacesProvider().getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })
}
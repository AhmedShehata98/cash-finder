import { useMutation, useQueryClient } from "@tanstack/react-query"
import { submitFinancialServiceReport } from "@/services/supabase/financial-services.repository"
import type { ReportSubmissionResult, SubmitFinancialServiceReportInput } from "@/types"
import { financialServiceReliabilityKey } from "./useFinancialServiceReliability"

export function useSubmitFinancialServiceReport() {
  const queryClient = useQueryClient()

  return useMutation<ReportSubmissionResult, Error, SubmitFinancialServiceReportInput>({
    mutationFn: submitFinancialServiceReport,
    onSuccess: (result) => {
      const location = result.location
      if (!location) return
      queryClient.setQueryData(["location-detail", location.id], location)
      queryClient.invalidateQueries({ queryKey: financialServiceReliabilityKey(location.id) })
      queryClient.invalidateQueries({ queryKey: ["nearby-locations"] })
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      queryClient.invalidateQueries({ queryKey: ["gamification"] })
    },
  })
}

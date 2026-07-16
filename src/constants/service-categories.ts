import { LocationType, ServiceProvider } from "@/types"

type CategoryDefinition = {
  key: string
  label: string
  locationType: LocationType | null
  serviceProvider: ServiceProvider | null
}

export const serviceCategories: CategoryDefinition[] = [
  { key: "all", label: "All", locationType: null, serviceProvider: null },
  { key: "banks", label: "Banks", locationType: LocationType.Bank, serviceProvider: null },
  { key: "atm", label: "ATM", locationType: LocationType.ATM, serviceProvider: null },
  {
    key: "fawry",
    label: "Fawry",
    locationType: LocationType.FinancialServiceProvider,
    serviceProvider: ServiceProvider.Fawry,
  },
  {
    key: "bee",
    label: "Bee",
    locationType: LocationType.FinancialServiceProvider,
    serviceProvider: ServiceProvider.Bee,
  },
  {
    key: "aman",
    label: "Aman",
    locationType: LocationType.FinancialServiceProvider,
    serviceProvider: ServiceProvider.Aman,
  },
  {
    key: "dafaa",
    label: "Dafaa",
    locationType: LocationType.FinancialServiceProvider,
    serviceProvider: ServiceProvider.Dafaa,
  },
] as const

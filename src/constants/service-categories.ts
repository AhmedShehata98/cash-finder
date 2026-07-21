import { FinancialServiceType } from "@/types"

export type CategoryDefinition = {
  key: string
  label: string
  categories: string[]
  serviceTypes: FinancialServiceType[]
}

export const ALL_CATEGORIES_KEY = "all"

export const serviceCategories: CategoryDefinition[] = [
  {
    key: "atm",
    label: "ATM",
    categories: ["700-7010-0108"],
    serviceTypes: [FinancialServiceType.ATM],
  },
  {
    key: "banks",
    label: "Banks",
    categories: ["700-7000-0107"],
    serviceTypes: [FinancialServiceType.BankBranch, FinancialServiceType.CashDepositMachine],
  },
  {
    key: "money-transfer",
    label: "Fintech / Money Transfer",
    categories: ["700-7050-0109"],
    serviceTypes: [
      FinancialServiceType.Fawry,
      FinancialServiceType.Aman,
      FinancialServiceType.Masary,
      FinancialServiceType.Bee,
      FinancialServiceType.Dafaa,
      FinancialServiceType.OtherProvider,
    ],
  },
  {
    key: ALL_CATEGORIES_KEY,
    label: "All",
    categories: ["700-7010-0108", "700-7000-0107", "700-7050-0109"],
    serviceTypes: [],
  },
] as const

export function getCategoryDefinition(key: string): CategoryDefinition | undefined {
  return serviceCategories.find((category) => category.key === key)
}

export const filterableServiceTypes = [
  FinancialServiceType.ATM,
  FinancialServiceType.BankBranch,
  FinancialServiceType.CashDepositMachine,
  FinancialServiceType.Fawry,
  FinancialServiceType.Aman,
  FinancialServiceType.Masary,
  FinancialServiceType.Bee,
  FinancialServiceType.Dafaa,
  FinancialServiceType.OtherProvider,
] as const

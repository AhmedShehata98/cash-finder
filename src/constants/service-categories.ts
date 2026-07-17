export type CategoryDefinition = {
  key: string
  label: string
  categories: string[]
}

export const ALL_CATEGORIES_KEY = "all"

export const serviceCategories: CategoryDefinition[] = [
  { key: "atm", label: "ATM", categories: ["700-7010-0108"] },
  { key: "banks", label: "Banks", categories: ["700-7000-0107"] },
  { key: "money-transfer", label: "Fintech / Money Transfer", categories: ["700-7050-0109"] },
  { key: ALL_CATEGORIES_KEY, label: "All", categories: ["700-7010-0108", "700-7000-0107", "700-7050-0109"] },
] as const

export function getCategoryDefinition(key: string): CategoryDefinition | undefined {
  return serviceCategories.find((category) => category.key === key)
}

/* eslint-disable no-redeclare */
export const LocationType = {
  Bank: "Bank",
  ATM: "ATM",
  FinancialServiceProvider: "Financial Service Provider",
} as const

export type LocationType = (typeof LocationType)[keyof typeof LocationType]

export const ServiceProvider = {
  Fawry: "Fawry",
  Bee: "Bee",
  Aman: "Aman",
  Dafaa: "Dafaa",
} as const

export type ServiceProvider = (typeof ServiceProvider)[keyof typeof ServiceProvider]

export type FinancialLocationCategory = {
  id: string
  name: string
}

export type OpeningHourInfo = {
  text: string[]
  isOpen: boolean | null
}

export type FinancialLocation = {
  id: string
  name: string
  logo: string | null
  type: LocationType
  category: FinancialLocationCategory | null
  provider: ServiceProvider | null
  latitude: number
  longitude: number
  address: string
  distanceFromUser: number | null
  isOpen: boolean | null
  phone: string | null
  website: string | null
  email: string | null
  openingHours: OpeningHourInfo[] | null
}

import { CashAvailabilityStatus, FinancialServiceType, LocationType, ServiceProvider } from "@/types"
import type { FinancialLocation, FinancialLocationCategory, OpeningHourInfo } from "@/types"
import type { HereMapsPlace, HereMapsCategory } from "./types"
import { ATM_CATEGORY, BANK_CATEGORY, MONEY_TRANSFER_CATEGORY } from "./types"

const KNOWN_SERVICE_PROVIDERS: Record<string, ServiceProvider> = {
  fawry: ServiceProvider.Fawry,
  bee: ServiceProvider.Bee,
  aman: ServiceProvider.Aman,
  masary: ServiceProvider.Masary,
  dafaa: ServiceProvider.Dafaa,
}

function detectServiceProvider(title: string): ServiceProvider | null {
  const lower = title.toLowerCase()
  for (const [key, provider] of Object.entries(KNOWN_SERVICE_PROVIDERS)) {
    if (lower.includes(key)) {
      return provider
    }
  }
  return null
}

function findPrimaryCategory(categories: HereMapsCategory[]): HereMapsCategory | null {
  if (categories.length === 0) return null
  const primary = categories.find((category) => category.primary === true)
  return primary ?? categories[0] ?? null
}

function inferLocationType(categories: HereMapsCategory[]): LocationType {
  const categoryIds = categories.map((category) => category.id)

  if (categoryIds.some((id) => id === ATM_CATEGORY || id.startsWith("700-7010-"))) {
    return LocationType.ATM
  }

  if (categoryIds.some((id) => id === BANK_CATEGORY || id.startsWith("700-7000-"))) {
    return LocationType.Bank
  }

  if (categoryIds.some((id) => id === MONEY_TRANSFER_CATEGORY || id.startsWith("700-7050-"))) {
    return LocationType.FinancialServiceProvider
  }

  const firstName = categories[0]?.name.toLowerCase() ?? ""
  if (firstName.includes("bank") || firstName.includes("branch")) {
    return LocationType.Bank
  }

  if (firstName.includes("atm")) {
    return LocationType.ATM
  }

  return LocationType.FinancialServiceProvider
}

function inferServiceTypes(
  title: string,
  categories: HereMapsCategory[],
  provider: ServiceProvider | null
): FinancialServiceType[] {
  const lowerTitle = title.toLowerCase()
  const categoryIds = categories.map((category) => category.id)
  const categoryNames = categories.map((category) => category.name.toLowerCase())
  const types = new Set<FinancialServiceType>()

  if (
    categoryIds.some((id) => id === ATM_CATEGORY || id.startsWith("700-7010-")) ||
    lowerTitle.includes("atm") ||
    categoryNames.some((name) => name.includes("atm"))
  ) {
    types.add(FinancialServiceType.ATM)
  }

  if (
    categoryIds.some((id) => id === BANK_CATEGORY || id.startsWith("700-7000-")) ||
    lowerTitle.includes("branch") ||
    categoryNames.some((name) => name.includes("bank") || name.includes("branch"))
  ) {
    types.add(FinancialServiceType.BankBranch)
  }

  if (
    lowerTitle.includes("deposit") ||
    lowerTitle.includes("cdm") ||
    categoryNames.some((name) => name.includes("deposit"))
  ) {
    types.add(FinancialServiceType.CashDepositMachine)
  }

  switch (provider) {
    case ServiceProvider.Fawry:
      types.add(FinancialServiceType.Fawry)
      break
    case ServiceProvider.Aman:
      types.add(FinancialServiceType.Aman)
      break
    case ServiceProvider.Masary:
      types.add(FinancialServiceType.Masary)
      break
    case ServiceProvider.Bee:
      types.add(FinancialServiceType.Bee)
      break
    case ServiceProvider.Dafaa:
      types.add(FinancialServiceType.Dafaa)
      break
  }

  if (
    types.size === 0 &&
    categoryIds.some((id) => id === MONEY_TRANSFER_CATEGORY || id.startsWith("700-7050-"))
  ) {
    types.add(FinancialServiceType.OtherProvider)
  }

  if (types.size === 0) {
    types.add(FinancialServiceType.OtherProvider)
  }

  return Array.from(types)
}

function getPrimaryServiceType(
  type: LocationType,
  serviceTypes: FinancialServiceType[]
): FinancialServiceType {
  if (type === LocationType.ATM && serviceTypes.includes(FinancialServiceType.ATM)) {
    return FinancialServiceType.ATM
  }

  if (type === LocationType.Bank && serviceTypes.includes(FinancialServiceType.BankBranch)) {
    return FinancialServiceType.BankBranch
  }

  return serviceTypes[0] ?? FinancialServiceType.OtherProvider
}

function extractPhone(place: HereMapsPlace): string | null {
  const phones = place.contacts?.flatMap((c) => c.phone ?? [])
  return phones && phones.length > 0 ? phones[0]?.value ?? null : null
}

function extractWebsite(place: HereMapsPlace): string | null {
  const websites = place.contacts?.flatMap((c) => c.www ?? [])
  return websites && websites.length > 0 ? websites[0]?.value ?? null : null
}

function extractEmail(place: HereMapsPlace): string | null {
  const emails = place.contacts?.flatMap((c) => c.email ?? [])
  return emails && emails.length > 0 ? emails[0]?.value ?? null : null
}

function extractOpeningHours(place: HereMapsPlace): OpeningHourInfo[] | null {
  if (!place.openingHours || place.openingHours.length === 0) return null
  return place.openingHours.map((oh) => ({ text: oh.text, isOpen: oh.isOpen }))
}

export function mapHereMapsPlaceToFinancialLocation(
  place: HereMapsPlace,
  _userLat: number,
  _userLng: number
): FinancialLocation {
  const isOpen = place.openingHours?.some((oh) => oh.isOpen) ?? null
  const primaryCategory = findPrimaryCategory(place.categories)
  const category: FinancialLocationCategory | null = primaryCategory
    ? { id: primaryCategory.id, name: primaryCategory.name }
    : null
  const type = inferLocationType(place.categories)
  const provider = detectServiceProvider(place.title)
  const serviceTypes = inferServiceTypes(place.title, place.categories, provider)

  return {
    id: place.id,
    name: place.title,
    logo: place.icon || null,
    type,
    category,
    provider,
    serviceTypes,
    primaryServiceType: getPrimaryServiceType(type, serviceTypes),
    latitude: place.position.lat,
    longitude: place.position.lng,
    address: place.address.label,
    distanceFromUser: place.distance ?? null,
    isOpen,
    cashAvailabilityStatus: CashAvailabilityStatus.Unknown,
    confidenceScore: null,
    estimatedSuccessProbability: null,
    lastConfirmedAt: null,
    phone: extractPhone(place),
    website: extractWebsite(place),
    email: extractEmail(place),
    openingHours: extractOpeningHours(place),
  }
}

export function mapHereMapsPlacesToFinancialLocations(
  places: HereMapsPlace[],
  userLat: number,
  userLng: number
): FinancialLocation[] {
  return places.map((place) => mapHereMapsPlaceToFinancialLocation(place, userLat, userLng))
}

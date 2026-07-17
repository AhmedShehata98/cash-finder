import { LocationType, ServiceProvider } from "@/types"
import type { FinancialLocation, FinancialLocationCategory, OpeningHourInfo } from "@/types"
import type { HereMapsPlace, HereMapsCategory } from "./types"
import { ATM_CATEGORY, BANK_CATEGORY, MONEY_TRANSFER_CATEGORY } from "./types"

const KNOWN_SERVICE_PROVIDERS: Record<string, ServiceProvider> = {
  fawry: ServiceProvider.Fawry,
  bee: ServiceProvider.Bee,
  aman: ServiceProvider.Aman,
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

  return {
    id: place.id,
    name: place.title,
    logo: place.icon || null,
    type: inferLocationType(place.categories),
    category,
    provider: detectServiceProvider(place.title),
    latitude: place.position.lat,
    longitude: place.position.lng,
    address: place.address.label,
    distanceFromUser: place.distance ?? null,
    isOpen,
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

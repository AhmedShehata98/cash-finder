import { LocationType, ServiceProvider } from "@/types"
import type { FinancialLocation } from "@/types"
import type { HereMapsPlace, HereMapsCategory } from "./types"

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

function inferLocationType(categories: HereMapsCategory[]): LocationType {
  const categoryIds = categories.map((c) => c.id)

  if (categoryIds.some((id) => id.startsWith("700-7000-0117"))) {
    return LocationType.ATM
  }

  if (categoryIds.some((id) => id.startsWith("700-7000-0115"))) {
    return LocationType.Bank
  }

  const title = (categories[0]?.name || "").toLowerCase()
  if (title.includes("bank") || title.includes("branch")) {
    return LocationType.Bank
  }

  return LocationType.FinancialServiceProvider
}

export function mapHereMapsPlaceToFinancialLocation(
  place: HereMapsPlace,
  _userLat: number,
  _userLng: number
): FinancialLocation {
  const isOpen = place.openingHours?.some((oh) => oh.isOpen) ?? null

  return {
    id: place.id,
    name: place.title,
    logo: place.icon || null,
    type: inferLocationType(place.categories),
    provider: detectServiceProvider(place.title),
    latitude: place.position.lat,
    longitude: place.position.lng,
    address: place.address.label,
    distanceFromUser: place.distance ?? null,
    isOpen,
  }
}

export function mapHereMapsPlacesToFinancialLocations(
  places: HereMapsPlace[],
  userLat: number,
  userLng: number
): FinancialLocation[] {
  return places.map((place) => mapHereMapsPlaceToFinancialLocation(place, userLat, userLng))
}

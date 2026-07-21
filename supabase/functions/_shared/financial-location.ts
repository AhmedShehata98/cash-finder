export type FinancialServiceType =
  | "ATM"
  | "Bank Branch"
  | "Cash Deposit Machine"
  | "Fawry"
  | "Aman"
  | "Masary"
  | "Bee"
  | "Dafaa"
  | "Other Financial Service Provider"

export type FinancialServiceRecord = {
  id: string
  external_id: string
  name: string
  logo: string | null
  location_type: "Bank" | "ATM" | "Financial Service Provider"
  category_id: string | null
  category_name: string | null
  provider: "Fawry" | "Bee" | "Aman" | "Masary" | "Dafaa" | null
  service_types: FinancialServiceType[]
  primary_service_type: FinancialServiceType
  address: string
  latitude: number
  longitude: number
  is_open: boolean | null
  cash_availability_status: "available" | "unavailable" | "unknown"
  current_status: string
  confidence_score: number | null
  estimated_success_probability: number | null
  last_confirmed_at: string | null
  phone: string | null
  website: string | null
  email: string | null
  opening_hours: { text: string[]; isOpen: boolean | null }[] | null
  synced_at: string
}

export function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const radius = 6371000
  const latDelta = toRadians(latitudeB - latitudeA)
  const lngDelta = toRadians(longitudeB - longitudeA)
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(lngDelta / 2) ** 2

  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function score(value: number | null) {
  return value ?? -1
}

function timeValue(value: string | null) {
  if (!value) return -1
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? -1 : parsed
}

export function toApiLocation(
  record: FinancialServiceRecord,
  origin: { latitude: number; longitude: number }
) {
  return {
    id: record.id,
    externalId: record.external_id,
    name: record.name,
    logo: record.logo,
    type: record.location_type,
    category:
      record.category_id && record.category_name
        ? { id: record.category_id, name: record.category_name }
        : null,
    provider: record.provider,
    serviceTypes: record.service_types,
    primaryServiceType: record.primary_service_type,
    latitude: record.latitude,
    longitude: record.longitude,
    address: record.address,
    distanceFromUser: Math.round(
      distanceMeters(origin.latitude, origin.longitude, record.latitude, record.longitude)
    ),
    isOpen: record.is_open,
    cashAvailabilityStatus: record.cash_availability_status,
    currentStatus: record.current_status,
    confidenceScore: record.confidence_score,
    estimatedSuccessProbability: record.estimated_success_probability,
    lastConfirmedAt: record.last_confirmed_at,
    phone: record.phone,
    website: record.website,
    email: record.email,
    openingHours: record.opening_hours,
    syncedAt: record.synced_at,
  }
}

export function rankApiLocations<T extends ReturnType<typeof toApiLocation>>(items: T[]) {
  return [...items].sort((a, b) => {
    const confidenceDelta = score(b.confidenceScore) - score(a.confidenceScore)
    if (confidenceDelta !== 0) return confidenceDelta

    const confirmedDelta = timeValue(b.lastConfirmedAt) - timeValue(a.lastConfirmedAt)
    if (confirmedDelta !== 0) return confirmedDelta

    const distanceDelta = (a.distanceFromUser ?? Number.POSITIVE_INFINITY) - (b.distanceFromUser ?? Number.POSITIVE_INFINITY)
    if (distanceDelta !== 0) return distanceDelta

    const successDelta = score(b.estimatedSuccessProbability) - score(a.estimatedSuccessProbability)
    if (successDelta !== 0) return successDelta

    return a.id.localeCompare(b.id)
  })
}

import type { FinancialLocation, FinancialServiceType } from "@/types"

export const CONFIDENCE_FILTER_THRESHOLD = 80
export const DISTANCE_FILTER_THRESHOLD_METERS = 2000
export const RECENT_FILTER_THRESHOLD_MS = 24 * 60 * 60 * 1000

export type NearbyFilterState = {
  serviceTypes: FinancialServiceType[]
  requireHighConfidence: boolean
  requireNearbyDistance: boolean
  requireRecentlyUpdated: boolean
}

function scoreValue(value: number | null): number {
  return value ?? -1
}

function confirmedTimeValue(value: string | null): number {
  if (!value) return -1

  const time = Date.parse(value)
  return Number.isNaN(time) ? -1 : time
}

function distanceValue(value: number | null): number {
  return value ?? Number.POSITIVE_INFINITY
}

export function rankFinancialLocations(locations: FinancialLocation[]): FinancialLocation[] {
  return [...locations].sort((a, b) => {
    const confidenceDelta = scoreValue(b.confidenceScore) - scoreValue(a.confidenceScore)
    if (confidenceDelta !== 0) return confidenceDelta

    const confirmedDelta =
      confirmedTimeValue(b.lastConfirmedAt) - confirmedTimeValue(a.lastConfirmedAt)
    if (confirmedDelta !== 0) return confirmedDelta

    const distanceDelta = distanceValue(a.distanceFromUser) - distanceValue(b.distanceFromUser)
    if (distanceDelta !== 0) return distanceDelta

    const successDelta =
      scoreValue(b.estimatedSuccessProbability) - scoreValue(a.estimatedSuccessProbability)
    if (successDelta !== 0) return successDelta

    return a.id.localeCompare(b.id)
  })
}

export function filterFinancialLocations(
  locations: FinancialLocation[],
  filters: NearbyFilterState,
  now = Date.now()
): FinancialLocation[] {
  return locations.filter((location) => {
    const matchesServiceType =
      filters.serviceTypes.length === 0 ||
      location.serviceTypes.some((serviceType) => filters.serviceTypes.includes(serviceType))

    if (!matchesServiceType) return false

    if (
      filters.requireHighConfidence &&
      (location.confidenceScore === null ||
        location.confidenceScore < CONFIDENCE_FILTER_THRESHOLD)
    ) {
      return false
    }

    if (
      filters.requireNearbyDistance &&
      (location.distanceFromUser === null ||
        location.distanceFromUser > DISTANCE_FILTER_THRESHOLD_METERS)
    ) {
      return false
    }

    if (filters.requireRecentlyUpdated) {
      const confirmedTime = confirmedTimeValue(location.lastConfirmedAt)
      if (confirmedTime < 0 || now - confirmedTime > RECENT_FILTER_THRESHOLD_MS) {
        return false
      }
    }

    return true
  })
}

export function filterAndRankFinancialLocations(
  locations: FinancialLocation[],
  filters: NearbyFilterState
): FinancialLocation[] {
  return rankFinancialLocations(filterFinancialLocations(locations, filters))
}

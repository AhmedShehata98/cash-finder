import Constants from "expo-constants"
import {
  CashAvailabilityStatus,
  FinancialServiceType,
  LocationType,
  ServiceProvider,
  type FinancialLocation,
} from "@/types"

const RELIABILITY_BATCH_PATH = "/v1/financial-locations/reliability:batch"
const REQUEST_TIMEOUT_MS = 4000
const DEFAULT_API_URL = "https://api.example.com"

type ReliabilityRequestLocation = {
  id: string
  name: string
  latitude: number
  longitude: number
  serviceTypes: FinancialServiceType[]
}

type ReliabilityBatchResponseItem = {
  id: string
  serviceTypes?: unknown
  confidenceScore?: unknown
  estimatedSuccessProbability?: unknown
  lastConfirmedAt?: unknown
  cashAvailabilityStatus?: unknown
}

type ReliabilityBatchResponse = {
  locations?: ReliabilityBatchResponseItem[]
}

function getApiBaseUrl(): string | null {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl

  if (typeof apiUrl !== "string" || apiUrl.trim().length === 0 || apiUrl === DEFAULT_API_URL) {
    return null
  }

  return apiUrl.replace(/\/$/, "")
}

function clampPercent(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseLastConfirmedAt(value: unknown): string | null {
  if (typeof value !== "string") return null
  return Number.isNaN(Date.parse(value)) ? null : value
}

function parseCashAvailabilityStatus(value: unknown): CashAvailabilityStatus {
  switch (value) {
    case CashAvailabilityStatus.Available:
      return CashAvailabilityStatus.Available
    case CashAvailabilityStatus.Unavailable:
      return CashAvailabilityStatus.Unavailable
    case CashAvailabilityStatus.Unknown:
    default:
      return CashAvailabilityStatus.Unknown
  }
}

function parseServiceTypes(value: unknown): FinancialServiceType[] | null {
  if (!Array.isArray(value)) return null

  const supported = new Set<string>(Object.values(FinancialServiceType))
  const serviceTypes = value.filter(
    (item): item is FinancialServiceType => typeof item === "string" && supported.has(item)
  )

  return serviceTypes.length > 0 ? serviceTypes : null
}

function getLegacyType(primaryServiceType: FinancialServiceType): LocationType {
  switch (primaryServiceType) {
    case FinancialServiceType.ATM:
    case FinancialServiceType.CashDepositMachine:
      return LocationType.ATM
    case FinancialServiceType.BankBranch:
      return LocationType.Bank
    default:
      return LocationType.FinancialServiceProvider
  }
}

function getLegacyProvider(serviceTypes: FinancialServiceType[]): ServiceProvider | null {
  if (serviceTypes.includes(FinancialServiceType.Fawry)) return ServiceProvider.Fawry
  if (serviceTypes.includes(FinancialServiceType.Aman)) return ServiceProvider.Aman
  if (serviceTypes.includes(FinancialServiceType.Masary)) return ServiceProvider.Masary
  if (serviceTypes.includes(FinancialServiceType.Bee)) return ServiceProvider.Bee
  if (serviceTypes.includes(FinancialServiceType.Dafaa)) return ServiceProvider.Dafaa
  return null
}

function mergeReliability(
  location: FinancialLocation,
  reliability: ReliabilityBatchResponseItem
): FinancialLocation {
  const serviceTypes = parseServiceTypes(reliability.serviceTypes) ?? location.serviceTypes
  const primaryServiceType = serviceTypes[0] ?? location.primaryServiceType

  return {
    ...location,
    serviceTypes,
    primaryServiceType,
    type: getLegacyType(primaryServiceType),
    provider: getLegacyProvider(serviceTypes) ?? location.provider,
    confidenceScore: clampPercent(reliability.confidenceScore),
    estimatedSuccessProbability: clampPercent(reliability.estimatedSuccessProbability),
    lastConfirmedAt: parseLastConfirmedAt(reliability.lastConfirmedAt),
    cashAvailabilityStatus: parseCashAvailabilityStatus(reliability.cashAvailabilityStatus),
  }
}

function isRecoverableReliabilityError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    error instanceof SyntaxError ||
    (typeof DOMException !== "undefined" && error instanceof DOMException)
  )
}

async function postReliabilityBatch(
  baseUrl: string,
  locations: FinancialLocation[]
): Promise<ReliabilityBatchResponse | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}${RELIABILITY_BATCH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: locations.map(toReliabilityRequestLocation) }),
      signal: controller.signal,
    })

    if (!response.ok) return null

    return (await response.json()) as ReliabilityBatchResponse
  } catch (error) {
    if (isRecoverableReliabilityError(error)) {
      return null
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function toReliabilityRequestLocation(location: FinancialLocation): ReliabilityRequestLocation {
  return {
    id: location.id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    serviceTypes: location.serviceTypes,
  }
}

export async function enrichFinancialLocationsWithReliability(
  locations: FinancialLocation[]
): Promise<FinancialLocation[]> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl || locations.length === 0) return locations

  const reliabilityResponse = await postReliabilityBatch(baseUrl, locations)
  const reliabilityById = new Map(
    (reliabilityResponse?.locations ?? []).map((location) => [location.id, location])
  )

  return locations.map((location) => {
    const reliability = reliabilityById.get(location.id)
    return reliability ? mergeReliability(location, reliability) : location
  })
}

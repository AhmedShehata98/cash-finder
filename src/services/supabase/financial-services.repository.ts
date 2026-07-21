import { supabase } from "@/lib/supabase"
import { resolveReportIdentity } from "@/services/report-identity.service"
import { gamificationSummarySchema } from "@/features/gamification/services/gamification-schemas"
import type {
  FinancialLocation,
  FinancialServiceReliabilitySummary,
  FinancialServiceReportStatus,
  FinancialServiceType,
  NearbyFinancialServicesResult,
  SubmitFinancialServiceReportInput,
  ReportSubmissionResult,
} from "@/types"

export class FinancialServiceRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = "FinancialServiceRepositoryError"
  }
}

type NearbyParams = {
  latitude: number
  longitude: number
  radius: number
  limit: number
  query?: string
  offset?: number
  serviceTypes?: FinancialServiceType[]
}

type RoutePoint = { latitude: number; longitude: number }

type RouteResponse = {
  legs: {
    polyline: string
    distance: number
    duration: number
    transportMode: string
  }[]
}

type FinancialServiceRow = {
  id: string
  external_id: string
  name: string
  logo: string | null
  location_type: FinancialLocation["type"]
  category_id: string | null
  category_name: string | null
  provider: FinancialLocation["provider"]
  service_types: FinancialLocation["serviceTypes"]
  primary_service_type: FinancialLocation["primaryServiceType"]
  latitude: number
  longitude: number
  address: string
  distance_from_user?: number | null
  is_open: boolean | null
  cash_availability_status: FinancialLocation["cashAvailabilityStatus"]
  current_status: FinancialLocation["currentStatus"]
  confidence_score: number | null
  estimated_success_probability: number | null
  last_confirmed_at: string | null
  synced_at: string | null
  phone: string | null
  website: string | null
  email: string | null
  opening_hours: FinancialLocation["openingHours"]
}

const REPORT_STATUSES = new Set<string>([
  "cash_available",
  "recently_confirmed",
  "no_cash",
  "out_of_service",
  "partially_available",
  "crowded",
  "service_available",
  "location_closed",
])

function isReportStatus(candidate: unknown): candidate is FinancialServiceReportStatus {
  return typeof candidate === "string" && REPORT_STATUSES.has(candidate)
}

function nullablePercent(candidate: unknown): number | null {
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? Math.max(0, Math.min(100, Math.round(candidate)))
    : null
}

function validDate(candidate: unknown): string | null {
  return typeof candidate === "string" && !Number.isNaN(Date.parse(candidate)) ? candidate : null
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return !!candidate && typeof candidate === "object"
}

function mapVoteDistribution(candidate: unknown) {
  return Array.isArray(candidate)
    ? candidate
        .filter(isRecord)
        .filter((vote) => isReportStatus(vote.status))
        .map((vote) => ({
          status: vote.status as FinancialServiceReportStatus,
          count: Math.max(0, Math.round(Number(vote.count) || 0)),
          percentage: Math.max(0, Math.min(100, Math.round(Number(vote.percentage) || 0))),
        }))
    : []
}

function mapRecentActivity(candidate: unknown) {
  return Array.isArray(candidate)
    ? candidate
        .filter(isRecord)
        .filter((activity) => isReportStatus(activity.status) && validDate(activity.created_at))
        .map((activity) => ({
          status: activity.status as FinancialServiceReportStatus,
          createdAt: activity.created_at as string,
          isVerified: activity.is_verified === true,
        }))
    : []
}

function mapReliabilitySummary(payload: unknown): FinancialServiceReliabilitySummary {
  if (!isRecord(payload)) {
    throw new FinancialServiceRepositoryError("Invalid reliability response")
  }

  const row = payload
  const freshness = row.report_freshness

  return {
    currentStatus: isReportStatus(row.current_status) ? row.current_status : "unknown",
    confidenceScore: nullablePercent(row.confidence_score),
    estimatedSuccessProbability: nullablePercent(row.estimated_success_probability),
    lastConfirmedAt: validDate(row.last_confirmed_at),
    activeReportsCount: Math.max(0, Math.round(Number(row.active_reports_count) || 0)),
    verifiedReportsCount: Math.max(0, Math.round(Number(row.verified_reports_count) || 0)),
    mostCommonRecentStatus: isReportStatus(row.most_common_recent_status)
      ? row.most_common_recent_status
      : null,
    lastReportAt: validDate(row.last_report_at),
    freshness:
      freshness === "fresh" || freshness === "aging" || freshness === "stale" ? freshness : "none",
    voteDistribution: mapVoteDistribution(row.report_vote_distribution),
    recentActivity: mapRecentActivity(row.recent_report_activity),
  }
}

function throwSupabaseError(error: { message: string; code?: string; details?: string } | null) {
  if (!error) return
  const code = error.message.match(/REPORT_[A-Z_]+/)?.[0] ?? error.code
  throw new FinancialServiceRepositoryError(error.message, code)
}

function mapFinancialServiceRow(row: FinancialServiceRow): FinancialLocation {
  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    logo: row.logo,
    type: row.location_type,
    category:
      row.category_id && row.category_name
        ? { id: row.category_id, name: row.category_name }
        : null,
    provider: row.provider,
    serviceTypes: row.service_types,
    primaryServiceType: row.primary_service_type,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    distanceFromUser: row.distance_from_user ?? null,
    isOpen: row.is_open,
    cashAvailabilityStatus: row.cash_availability_status,
    currentStatus: row.current_status,
    confidenceScore: row.confidence_score,
    estimatedSuccessProbability: row.estimated_success_probability,
    lastConfirmedAt: row.last_confirmed_at,
    syncedAt: row.synced_at,
    phone: row.phone,
    website: row.website,
    email: row.email,
    openingHours: row.opening_hours,
  }
}

export async function searchNearbyFinancialServices(
  params: NearbyParams
): Promise<NearbyFinancialServicesResult> {
  const { data, error } = await supabase.functions.invoke<NearbyFinancialServicesResult>(
    "get-nearby-financial-services",
    {
      body: {
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius,
        limit: params.limit,
        query: params.query ?? "",
        offset: params.offset ?? 0,
        serviceTypes: params.serviceTypes ?? [],
      },
    }
  )

  throwSupabaseError(error)
  if (!data) throw new FinancialServiceRepositoryError("No nearby locations returned")
  return data
}

export async function getFinancialServiceById(id: string): Promise<FinancialLocation> {
  const { data, error } = await supabase
    .from("financial_services")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single()

  throwSupabaseError(error)
  if (!data) throw new FinancialServiceRepositoryError("Location not found")

  return mapFinancialServiceRow(data)
}

export async function getFinancialServiceReliability(
  id: string
): Promise<FinancialServiceReliabilitySummary> {
  const { data, error } = await supabase.rpc("get_financial_service_reliability", {
    p_financial_service_id: id,
  })

  throwSupabaseError(error)
  return mapReliabilitySummary(data)
}

export async function submitFinancialServiceReport(
  input: SubmitFinancialServiceReportInput
): Promise<ReportSubmissionResult> {
  const identity = input.anonymousInstallationId
    ? {
        reporterType: "guest" as const,
        anonymousInstallationId: input.anonymousInstallationId,
        anonymousClaimToken: null,
      }
    : await resolveReportIdentity()

  const claimToken = "anonymousClaimToken" in identity ? identity.anonymousClaimToken : null
  if (identity.reporterType === "guest" && !claimToken) {
    const { data, error } = await supabase.rpc("submit_financial_service_report", {
      p_financial_service_id: input.financialServiceId,
      p_reported_status: input.reportedStatus,
      p_failure_reason: input.failureReason ?? null,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_request_id: input.requestId,
      p_note: input.note ?? null,
      p_anonymous_installation_id: identity.anonymousInstallationId,
    })
    throwSupabaseError(error)
    if (!data)
      throw new FinancialServiceRepositoryError("Report did not return an updated location")
    return {
      accepted: true,
      location: mapFinancialServiceRow(data),
      rewardStatus: "sign_in_required",
      xpAwarded: 0,
      rewards: { badges: [], achievements: [] },
    }
  }

  const { data, error } = await supabase.rpc("submit_financial_service_report_with_rewards", {
    p_financial_service_id: input.financialServiceId,
    p_reported_status: input.reportedStatus,
    p_failure_reason: input.failureReason ?? null,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_request_id: input.requestId,
    p_note: input.note ?? null,
    p_anonymous_installation_id: identity.anonymousInstallationId,
    p_anonymous_claim_token: claimToken,
  })

  throwSupabaseError(error)
  if (!isRecord(data))
    throw new FinancialServiceRepositoryError("Report did not return a reward result")
  if (data.accepted !== true) {
    throw new FinancialServiceRepositoryError(
      "Report was rejected",
      typeof data.errorCode === "string" ? data.errorCode : "REPORT_ERROR"
    )
  }
  if (!isRecord(data.location))
    throw new FinancialServiceRepositoryError("Report did not return an updated location")
  return {
    accepted: true,
    location: mapFinancialServiceRow(data.location as unknown as FinancialServiceRow),
    rewardStatus: data.rewardStatus === "sign_in_required" ? "sign_in_required" : "awarded",
    xpAwarded: Math.max(0, Number(data.xpAwarded) || 0),
    levelProgress: isRecord(data.levelProgress)
      ? (data.levelProgress as ReportSubmissionResult["levelProgress"])
      : undefined,
    rewards: isRecord(data.rewards)
      ? {
          badges: Array.isArray(data.rewards.badges)
            ? (data.rewards.badges as ReportSubmissionResult["rewards"]["badges"])
            : [],
          achievements: Array.isArray(data.rewards.achievements)
            ? (data.rewards.achievements as ReportSubmissionResult["rewards"]["achievements"])
            : [],
        }
      : { badges: [], achievements: [] },
    summary: isRecord(data.summary) ? gamificationSummarySchema.parse(data.summary) : undefined,
  }
}

export async function calculateSupabaseRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  transportMode: "pedestrian" | "car"
): Promise<RouteResponse> {
  const { data, error } = await supabase.functions.invoke<RouteResponse>("get-route", {
    body: { origin, destination, transportMode },
  })

  throwSupabaseError(error)
  if (!data) throw new FinancialServiceRepositoryError("No route returned")
  return data
}

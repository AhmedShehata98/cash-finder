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
  Masary: "Masary",
  Dafaa: "Dafaa",
} as const

export type ServiceProvider = (typeof ServiceProvider)[keyof typeof ServiceProvider]

export const FinancialServiceType = {
  ATM: "ATM",
  BankBranch: "Bank Branch",
  CashDepositMachine: "Cash Deposit Machine",
  Fawry: "Fawry",
  Aman: "Aman",
  Masary: "Masary",
  Bee: "Bee",
  Dafaa: "Dafaa",
  OtherProvider: "Other Financial Service Provider",
} as const

export type FinancialServiceType =
  (typeof FinancialServiceType)[keyof typeof FinancialServiceType]

export const CashAvailabilityStatus = {
  Available: "available",
  Unavailable: "unavailable",
  Unknown: "unknown",
} as const

export type CashAvailabilityStatus =
  (typeof CashAvailabilityStatus)[keyof typeof CashAvailabilityStatus]

export const FinancialServiceReportStatus = {
  CashAvailable: "cash_available",
  RecentlyConfirmed: "recently_confirmed",
  NoCash: "no_cash",
  OutOfService: "out_of_service",
  PartiallyAvailable: "partially_available",
  Crowded: "crowded",
  ServiceAvailable: "service_available",
  LocationClosed: "location_closed",
} as const

export type FinancialServiceReportStatus =
  (typeof FinancialServiceReportStatus)[keyof typeof FinancialServiceReportStatus]

export const FinancialServiceFailureReason = {
  NoCash: "no_cash",
  OutOfService: "out_of_service",
  QueueTooLong: "queue_too_long",
  LocationClosed: "location_closed",
  DepositOnly: "deposit_only",
  Other: "other",
} as const

export type FinancialServiceFailureReason =
  (typeof FinancialServiceFailureReason)[keyof typeof FinancialServiceFailureReason]

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
  serviceTypes: FinancialServiceType[]
  primaryServiceType: FinancialServiceType
  latitude: number
  longitude: number
  address: string
  distanceFromUser: number | null
  isOpen: boolean | null
  cashAvailabilityStatus: CashAvailabilityStatus
  confidenceScore: number | null
  estimatedSuccessProbability: number | null
  lastConfirmedAt: string | null
  currentStatus?: FinancialServiceReportStatus | "unknown"
  syncedAt?: string | null
  externalId?: string | null
  phone: string | null
  website: string | null
  email: string | null
  openingHours: OpeningHourInfo[] | null
}

export type FinancialServiceFreshness = {
  source: "here" | "cache"
  isStale: boolean
  syncedAt: string
}

export type NearbyFinancialServicesResult = {
  items: FinancialLocation[]
  nextOffset: number | null
  freshness: FinancialServiceFreshness
}

export type SubmitFinancialServiceReportInput = {
  financialServiceId: string
  reportedStatus: FinancialServiceReportStatus
  failureReason?: FinancialServiceFailureReason | null
  latitude: number
  longitude: number
  requestId: string
  anonymousInstallationId?: string | null
  note?: string | null
}

export type ReportVoteDistribution = {
  status: FinancialServiceReportStatus
  count: number
  percentage: number
}

export type RecentReportActivity = {
  status: FinancialServiceReportStatus
  createdAt: string
  isVerified: boolean
}

export type FinancialServiceReliabilitySummary = {
  currentStatus: FinancialServiceReportStatus | "unknown"
  confidenceScore: number | null
  estimatedSuccessProbability: number | null
  lastConfirmedAt: string | null
  activeReportsCount: number
  verifiedReportsCount: number
  mostCommonRecentStatus: FinancialServiceReportStatus | null
  lastReportAt: string | null
  freshness: "fresh" | "aging" | "stale" | "none"
  voteDistribution: ReportVoteDistribution[]
  recentActivity: RecentReportActivity[]
}

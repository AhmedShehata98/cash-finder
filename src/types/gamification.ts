import type { FinancialLocation } from "./financial-location"

export type GuestIdentity = { installationId: string; claimToken: string; isClaimed: boolean }
export type LevelProgress = {
  level: number
  currentXp: number
  currentLevelXp: number
  nextLevelXp: number | null
  progressPercentage: number
}
export type GamificationSummary = {
  ownerType: "guest" | "authenticated"
  displayName: string
  avatarUrl: string | null
  xp: number
  level: number
  levelProgress: LevelProgress
  reputationScore: number
  reportsCount: number
  verifiedReportsCount: number
  helpfulReportsCount: number
  currentStreak: number
  longestStreak: number
  lastContributionDate: string | null
  showOnLeaderboard: boolean
}
export type BadgeProgress = {
  code: string
  name: string
  description: string
  iconKey: string
  category: string
  requirement: number
  progress: number
  state: "locked" | "in_progress" | "unlocked"
  earnedAt: string | null
  xpReward: number
}
export type AchievementProgress = {
  code: string
  title: string
  description: string
  currentProgress: number
  target: number
  percentage: number
  isCompleted: boolean
  completedAt: string | null
  xpReward: number
}
export type LeaderboardPeriod = "weekly" | "monthly" | "all_time"
export type LeaderboardEntry = {
  rank: number
  displayName: string
  avatarUrl: string | null
  level: number
  periodXp: number
  verifiedReportsCount: number
  reputationScore: number
  badgesCount: number
}
export type LeaderboardPage = {
  period: LeaderboardPeriod
  entries: LeaderboardEntry[]
  hasMore: boolean
}
export type EarnedBadge = Pick<BadgeProgress, "code" | "name" | "iconKey" | "xpReward">
export type CompletedAchievement = Pick<AchievementProgress, "code" | "title" | "xpReward">
export type ReportSubmissionResult = {
  accepted: boolean
  errorCode?: string
  location?: FinancialLocation
  rewardStatus?: "awarded" | "sign_in_required"
  xpAwarded: number
  levelProgress?: LevelProgress
  rewards: { badges: EarnedBadge[]; achievements: CompletedAchievement[] }
  summary?: GamificationSummary
}
export type ClaimGuestProgressResult = {
  summary: GamificationSummary
  transferredXp: number
  badgesPreserved: number
  contributionsLinked: number
  alreadyClaimed: boolean
}
export type ContributionHistoryEntry = {
  id: string
  financialServiceId: string
  locationName: string
  status: string
  isVerified: boolean
  isConfirmed: boolean
  createdAt: string
}
export type ContributionHistoryPage = { entries: ContributionHistoryEntry[]; hasMore: boolean }

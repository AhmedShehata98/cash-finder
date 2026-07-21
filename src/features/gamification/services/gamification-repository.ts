import { Platform } from "react-native"
import { supabase } from "@/lib/supabase"
import {
  getOrCreateGuestIdentity,
  getStoredGuestIdentity,
  markGuestIdentityClaimed,
} from "@/services/report-identity.service"
import type {
  AchievementProgress,
  BadgeProgress,
  ClaimGuestProgressResult,
  GamificationSummary,
  LeaderboardPage,
  LeaderboardPeriod,
  ContributionHistoryPage,
} from "@/types"
import {
  achievementProgressListSchema,
  badgeProgressListSchema,
  claimGuestProgressSchema,
  contributionHistoryPageSchema,
  gamificationSummarySchema,
  leaderboardPageSchema,
} from "./gamification-schemas"

export class GamificationRepositoryError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message)
    this.name = "GamificationRepositoryError"
  }
}

function throwRpcError(error: { message: string; code?: string } | null) {
  if (error) throw new GamificationRepositoryError(error.message, error.code)
}

async function guestCredentials() {
  const identity = await getOrCreateGuestIdentity()
  return identity
    ? {
        p_anonymous_installation_id: identity.installationId,
        p_anonymous_claim_token: identity.claimToken,
      }
    : null
}

export async function getGamificationSummary(
  authenticated: boolean
): Promise<GamificationSummary | null> {
  if (authenticated) {
    const { data, error } = await supabase.rpc("get_user_gamification_summary")
    throwRpcError(error)
    return data === null ? null : gamificationSummarySchema.parse(data)
  }
  if (Platform.OS === "web") return null
  const credentials = await guestCredentials()
  if (!credentials) return null
  const { data, error } = await supabase.rpc("get_guest_gamification_summary", credentials)
  if (error?.message.includes("GUEST_IDENTITY_INVALID")) return null
  throwRpcError(error)
  return data === null ? null : gamificationSummarySchema.parse(data)
}

export async function getBadges(authenticated: boolean): Promise<BadgeProgress[]> {
  const credentials = authenticated ? null : await guestCredentials()
  const { data, error } = await supabase.rpc("get_profile_badges", credentials ?? {})
  throwRpcError(error)
  return badgeProgressListSchema.parse(data)
}

export async function getAchievements(authenticated: boolean): Promise<AchievementProgress[]> {
  const credentials = authenticated ? null : await guestCredentials()
  const { data, error } = await supabase.rpc("get_profile_achievements", credentials ?? {})
  throwRpcError(error)
  return achievementProgressListSchema.parse(data)
}

export async function getLeaderboard(
  period: LeaderboardPeriod,
  offset = 0
): Promise<LeaderboardPage> {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_period: period,
    p_limit: 25,
    p_offset: offset,
  })
  throwRpcError(error)
  return leaderboardPageSchema.parse(data)
}

export async function getContributionHistory(offset = 0): Promise<ContributionHistoryPage> {
  const { data, error } = await supabase.rpc("get_contribution_history", {
    p_limit: 25,
    p_offset: offset,
  })
  throwRpcError(error)
  return contributionHistoryPageSchema.parse(data)
}

export async function claimGuestProgress(): Promise<ClaimGuestProgressResult | null> {
  const identity = await getStoredGuestIdentity()
  if (!identity || identity.isClaimed) return null
  const { data, error } = await supabase.rpc("claim_guest_progress", {
    p_anonymous_installation_id: identity.installationId,
    p_anonymous_claim_token: identity.claimToken,
  })
  throwRpcError(error)
  if (!data) return null
  await markGuestIdentityClaimed()
  return claimGuestProgressSchema.parse(data)
}

export async function updateLeaderboardVisibility(showOnLeaderboard: boolean) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  throwRpcError(sessionError)
  const userId = sessionData.session?.user.id
  if (!userId) throw new GamificationRepositoryError("Authentication required", "AUTH_REQUIRED")
  const { error } = await supabase
    .from("user_profiles")
    .update({ show_on_leaderboard: showOnLeaderboard })
    .eq("user_id", userId)
  throwRpcError(error)
}

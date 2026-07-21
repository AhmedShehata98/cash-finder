import { z } from "zod"

const levelProgressSchema = z.object({
  level: z.number(),
  currentXp: z.number(),
  currentLevelXp: z.number(),
  nextLevelXp: z.number().nullable(),
  progressPercentage: z.number(),
})

export const gamificationSummarySchema = z.object({
  ownerType: z.enum(["guest", "authenticated"]),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  xp: z.number(),
  level: z.number(),
  levelProgress: levelProgressSchema,
  reputationScore: z.number(),
  reportsCount: z.number(),
  verifiedReportsCount: z.number(),
  helpfulReportsCount: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastContributionDate: z.string().nullable(),
  showOnLeaderboard: z.boolean(),
})

export const badgeProgressListSchema = z.array(
  z.object({
    code: z.string(),
    name: z.string(),
    description: z.string(),
    iconKey: z.string(),
    category: z.string(),
    requirement: z.number(),
    progress: z.number(),
    state: z.enum(["locked", "in_progress", "unlocked"]),
    earnedAt: z.string().nullable(),
    xpReward: z.number(),
  })
)

export const achievementProgressListSchema = z.array(
  z.object({
    code: z.string(),
    title: z.string(),
    description: z.string(),
    currentProgress: z.number(),
    target: z.number(),
    percentage: z.number(),
    isCompleted: z.boolean(),
    completedAt: z.string().nullable(),
    xpReward: z.number(),
  })
)

const leaderboardEntrySchema = z.object({
  rank: z.number(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  level: z.number(),
  periodXp: z.number(),
  verifiedReportsCount: z.number(),
  reputationScore: z.number(),
  badgesCount: z.number(),
})

export const leaderboardPageSchema = z.object({
  period: z.enum(["weekly", "monthly", "all_time"]),
  entries: z.array(leaderboardEntrySchema),
  hasMore: z.boolean(),
})

export const contributionHistoryPageSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      financialServiceId: z.string(),
      locationName: z.string(),
      status: z.string(),
      isVerified: z.boolean(),
      isConfirmed: z.boolean(),
      createdAt: z.string(),
    })
  ),
  hasMore: z.boolean(),
})

export const claimGuestProgressSchema = z.object({
  summary: gamificationSummarySchema,
  transferredXp: z.number(),
  badgesPreserved: z.number(),
  contributionsLinked: z.number(),
  alreadyClaimed: z.boolean(),
})

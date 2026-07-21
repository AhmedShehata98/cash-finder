import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { supabase } from "@/lib/supabase"
import { getGamificationSummary, getLeaderboard } from "../gamification-repository"

jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: jest.fn(), auth: { getSession: jest.fn() }, from: jest.fn() },
}))
jest.mock("@/services/report-identity.service", () => ({
  getOrCreateGuestIdentity: jest.fn(async () => ({
    installationId: "11111111-1111-4111-8111-111111111111",
    claimToken: "a".repeat(64),
    isClaimed: false,
  })),
  getStoredGuestIdentity: jest.fn(async () => null),
  markGuestIdentityClaimed: jest.fn(),
}))

const rpc = jest.mocked(supabase.rpc)

describe("gamification repository", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("loads an authenticated summary without accepting a user id from the client", async () => {
    rpc.mockResolvedValue({
      data: {
        ownerType: "authenticated",
        displayName: "Reporter",
        avatarUrl: null,
        xp: 50,
        level: 2,
        levelProgress: {
          level: 2,
          currentXp: 50,
          currentLevelXp: 50,
          nextLevelXp: 150,
          progressPercentage: 0,
        },
        reputationScore: 50,
        reportsCount: 1,
        verifiedReportsCount: 1,
        helpfulReportsCount: 0,
        currentStreak: 1,
        longestStreak: 1,
        lastContributionDate: "2026-07-20",
        showOnLeaderboard: false,
      },
      error: null,
    } as never)
    await expect(getGamificationSummary(true)).resolves.toMatchObject({ xp: 50, level: 2 })
    expect(rpc).toHaveBeenCalledWith("get_user_gamification_summary")
  })

  it("requests privacy-safe paginated leaderboard data", async () => {
    rpc.mockResolvedValue({
      data: { period: "weekly", entries: [], hasMore: false },
      error: null,
    } as never)
    await expect(getLeaderboard("weekly", 25)).resolves.toEqual({
      period: "weekly",
      entries: [],
      hasMore: false,
    })
    expect(rpc).toHaveBeenCalledWith("get_leaderboard", {
      p_period: "weekly",
      p_limit: 25,
      p_offset: 25,
    })
  })
})

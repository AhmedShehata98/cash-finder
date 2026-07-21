import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/providers/auth-provider"
import type { LeaderboardPeriod } from "@/types"
import {
  claimGuestProgress,
  getAchievements,
  getBadges,
  getGamificationSummary,
  getContributionHistory,
  getLeaderboard,
  updateLeaderboardVisibility,
} from "../services/gamification-repository"

export const gamificationKeys = {
  all: ["gamification"] as const,
  summary: (owner: string) => ["gamification", "summary", owner] as const,
  badges: (owner: string) => ["gamification", "badges", owner] as const,
  achievements: (owner: string) => ["gamification", "achievements", owner] as const,
  leaderboard: (period: LeaderboardPeriod) => ["gamification", "leaderboard", period] as const,
  history: ["gamification", "history"] as const,
}

export function useContributionHistory(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: gamificationKeys.history,
    queryFn: ({ pageParam }) => getContributionHistory(pageParam),
    initialPageParam: 0,
    enabled,
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.reduce((total, page) => total + page.entries.length, 0) : undefined,
  })
}

export function useGamificationSummary() {
  const { user, isLoading } = useAuth()
  return useQuery({
    queryKey: gamificationKeys.summary(user?.id ?? "guest"),
    queryFn: () => getGamificationSummary(!!user),
    enabled: !isLoading,
  })
}

export function useBadges() {
  const { user, isLoading } = useAuth()
  return useQuery({
    queryKey: gamificationKeys.badges(user?.id ?? "guest"),
    queryFn: () => getBadges(!!user),
    enabled: !isLoading,
  })
}

export function useAchievements() {
  const { user, isLoading } = useAuth()
  return useQuery({
    queryKey: gamificationKeys.achievements(user?.id ?? "guest"),
    queryFn: () => getAchievements(!!user),
    enabled: !isLoading,
  })
}

export function useLeaderboard(period: LeaderboardPeriod) {
  return useInfiniteQuery({
    queryKey: gamificationKeys.leaderboard(period),
    queryFn: ({ pageParam }) => getLeaderboard(period, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.reduce((total, page) => total + page.entries.length, 0) : undefined,
  })
}

export function useClaimGuestProgress() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: claimGuestProgress,
    retry: 2,
    onSuccess: () => client.invalidateQueries({ queryKey: gamificationKeys.all }),
  })
}

export function useLeaderboardVisibility() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: updateLeaderboardVisibility,
    onSuccess: () => client.invalidateQueries({ queryKey: gamificationKeys.all }),
  })
}

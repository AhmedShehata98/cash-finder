import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Link } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "@/providers/auth-provider"
import { useI18n } from "@/i18n"
import { colors, spacing, typography } from "@/theme"
import type { LeaderboardPeriod } from "@/types"
import {
  useAchievements,
  useBadges,
  useContributionHistory,
  useGamificationSummary,
  useLeaderboard,
  useLeaderboardVisibility,
} from "../hooks/use-gamification"
import { BadgeIcon } from "./badge-icon"

type Section = "progress" | "badges" | "achievements" | "leaderboard"
const sections: Section[] = ["progress", "badges", "achievements", "leaderboard"]

export function RewardsScreen() {
  const { user } = useAuth()
  const { isRTL, t } = useI18n()
  const [section, setSection] = useState<Section>("progress")
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly")
  const summary = useGamificationSummary()
  const badges = useBadges()
  const achievements = useAchievements()
  const leaderboard = useLeaderboard(period)
  const history = useContributionHistory(!!user)
  const visibility = useLeaderboardVisibility()
  const refreshing =
    summary.isRefetching ||
    badges.isRefetching ||
    achievements.isRefetching ||
    leaderboard.isRefetching
  const refresh = () => {
    summary.refetch()
    badges.refetch()
    achievements.refetch()
    leaderboard.refetch()
  }

  const entries = useMemo(
    () => leaderboard.data?.pages.flatMap((page) => page.entries) ?? [],
    [leaderboard.data]
  )
  const loading =
    (summary.isLoading && section === "progress") ||
    (badges.isLoading && section === "badges") ||
    (achievements.isLoading && section === "achievements") ||
    (leaderboard.isLoading && section === "leaderboard")
  const hasError = summary.isError || badges.isError || achievements.isError || leaderboard.isError

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={[styles.segmented, isRTL && styles.rowReverse]} accessibilityRole="tablist">
        {sections.map((item) => (
          <Pressable
            key={item}
            onPress={() => setSection(item)}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === item }}
            style={[styles.segment, section === item && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, section === item && styles.segmentTextActive]}>
              {t(`rewards.section.${item}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && (
        <ActivityIndicator
          size="large"
          color={colors.primary[600]}
          accessibilityLabel={t("rewards.loading")}
        />
      )}
      {hasError && !loading && (
        <StateCard
          icon="error-outline"
          title={t("rewards.error")}
          action={t("common.retry")}
          onPress={refresh}
        />
      )}

      {!loading && !hasError && section === "progress" && (
        <>
          {summary.data ? (
            <Progress summary={summary.data} isRTL={isRTL} t={t} />
          ) : (
            <StateCard icon="stars" title={t("rewards.emptyProgress")} />
          )}
          {user && history.data && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("rewards.contributionHistory")}</Text>
              {history.data.pages
                .flatMap((page) => page.entries)
                .map((entry) => (
                  <View key={entry.id} style={[styles.historyRow, isRTL && styles.rowReverse]}>
                    <MaterialIcons
                      name={entry.isConfirmed ? "verified" : "history"}
                      size={22}
                      color={entry.isConfirmed ? colors.success[700] : colors.neutral[500]}
                    />
                    <View style={styles.flex}>
                      <Text style={[styles.cardTitle, isRTL && styles.textRtl]}>
                        {entry.locationName}
                      </Text>
                      <Text style={[styles.muted, isRTL && styles.textRtl]}>
                        {entry.status.replaceAll("_", " ")} ·{" "}
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              {history.hasNextPage && (
                <Pressable style={styles.secondaryButton} onPress={() => history.fetchNextPage()}>
                  <Text style={styles.secondaryButtonText}>{t("rewards.loadMore")}</Text>
                </Pressable>
              )}
            </View>
          )}
          {!user && <GuestCallout t={t} />}
          {user && summary.data && (
            <Pressable
              onPress={() => visibility.mutate(!summary.data!.showOnLeaderboard)}
              disabled={visibility.isPending}
              style={styles.visibilityRow}
              accessibilityRole="switch"
              accessibilityState={{
                checked: summary.data.showOnLeaderboard,
                disabled: visibility.isPending,
              }}
            >
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{t("rewards.leaderboardVisibility")}</Text>
                <Text style={styles.muted}>{t("rewards.leaderboardVisibilityDescription")}</Text>
              </View>
              <MaterialIcons
                name={summary.data.showOnLeaderboard ? "toggle-on" : "toggle-off"}
                size={42}
                color={summary.data.showOnLeaderboard ? colors.primary[600] : colors.neutral[400]}
              />
            </Pressable>
          )}
        </>
      )}

      {!loading &&
        !hasError &&
        section === "badges" &&
        (badges.data?.length ? (
          badges.data.map((badge) => (
            <View
              key={badge.code}
              style={styles.card}
              accessible
              accessibilityLabel={`${badge.name}, ${badge.state}`}
            >
              <View style={[styles.row, isRTL && styles.rowReverse]}>
                <BadgeIcon iconKey={badge.iconKey} unlocked={badge.state === "unlocked"} />
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, isRTL && styles.textRtl]}>{badge.name}</Text>
                  <Text style={[styles.muted, isRTL && styles.textRtl]}>{badge.description}</Text>
                </View>
                <Text style={styles.state}>{t(`rewards.badgeState.${badge.state}`)}</Text>
              </View>
              <ProgressBar
                value={badge.progress}
                target={badge.requirement}
                label={`${badge.progress} / ${badge.requirement}`}
              />
            </View>
          ))
        ) : (
          <StateCard icon="emoji-events" title={t("rewards.emptyBadges")} />
        ))}

      {!loading &&
        !hasError &&
        section === "achievements" &&
        (achievements.data?.length ? (
          achievements.data.map((item) => (
            <View
              key={item.code}
              style={styles.card}
              accessible
              accessibilityLabel={`${item.title}, ${item.currentProgress} of ${item.target}`}
            >
              <View style={[styles.row, isRTL && styles.rowReverse]}>
                <MaterialIcons
                  name={item.isCompleted ? "task-alt" : "flag"}
                  size={30}
                  color={item.isCompleted ? colors.success[700] : colors.primary[600]}
                />
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, isRTL && styles.textRtl]}>{item.title}</Text>
                  <Text style={[styles.muted, isRTL && styles.textRtl]}>{item.description}</Text>
                  <Text style={styles.rewardLabel}>+{item.xpReward} XP</Text>
                </View>
              </View>
              <ProgressBar
                value={item.currentProgress}
                target={item.target}
                label={`${item.percentage}%`}
              />
            </View>
          ))
        ) : (
          <StateCard icon="flag" title={t("rewards.emptyAchievements")} />
        ))}

      {!loading && !hasError && section === "leaderboard" && (
        <>
          <View style={[styles.segmented, isRTL && styles.rowReverse]}>
            {(["weekly", "monthly", "all_time"] as const).map((item) => (
              <Pressable
                key={item}
                style={[styles.segment, period === item && styles.segmentActive]}
                onPress={() => setPeriod(item)}
              >
                <Text style={[styles.segmentText, period === item && styles.segmentTextActive]}>
                  {t(`rewards.period.${item}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          {!user && <GuestCallout t={t} compact />}
          {entries.length ? (
            entries.map((entry) => (
              <View
                key={`${period}-${entry.rank}`}
                style={[styles.card, styles.leaderRow, isRTL && styles.rowReverse]}
                accessible
                accessibilityLabel={`${entry.rank}, ${entry.displayName}, ${entry.periodXp} XP`}
              >
                <Text style={styles.rank}>{entry.rank}</Text>
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, isRTL && styles.textRtl]}>
                    {entry.displayName}
                  </Text>
                  <Text style={[styles.muted, isRTL && styles.textRtl]}>
                    {t("rewards.leaderboardStats", {
                      level: entry.level,
                      xp: entry.periodXp,
                      reputation: entry.reputationScore,
                    })}
                  </Text>
                </View>
                <MaterialIcons
                  name={entry.rank <= 3 ? "military-tech" : "person"}
                  size={28}
                  color={entry.rank <= 3 ? colors.warning[700] : colors.neutral[500]}
                />
              </View>
            ))
          ) : (
            <StateCard icon="leaderboard" title={t("rewards.emptyLeaderboard")} />
          )}
          {leaderboard.hasNextPage && (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => leaderboard.fetchNextPage()}
              disabled={leaderboard.isFetchingNextPage}
            >
              <Text style={styles.secondaryButtonText}>{t("rewards.loadMore")}</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  )
}

function Progress({
  summary,
  isRTL,
  t,
}: {
  summary: NonNullable<ReturnType<typeof useGamificationSummary>["data"]>
  isRTL: boolean
  t: ReturnType<typeof useI18n>["t"]
}) {
  const stats = [
    ["rewards.validReports", summary.reportsCount],
    ["rewards.verifiedReports", summary.verifiedReportsCount],
    ["rewards.reputation", summary.reputationScore],
    ["rewards.currentStreak", summary.currentStreak],
    ["rewards.longestStreak", summary.longestStreak],
  ] as const
  return (
    <>
      <View style={styles.hero}>
        <MaterialIcons
          name={summary.ownerType === "guest" ? "person-outline" : "account-circle"}
          size={54}
          color={colors.primary[600]}
        />
        <Text style={styles.heroName}>{summary.displayName}</Text>
        <Text style={styles.level}>{t("rewards.level", { value: summary.level })}</Text>
        <Text style={styles.xp}>{summary.xp} XP</Text>
        <ProgressBar
          value={summary.levelProgress.currentXp - summary.levelProgress.currentLevelXp}
          target={
            (summary.levelProgress.nextLevelXp ?? summary.levelProgress.currentXp) -
              summary.levelProgress.currentLevelXp || 1
          }
          label={`${summary.levelProgress.progressPercentage}%`}
        />
      </View>
      <View style={styles.stats}>
        {stats.map(([key, value]) => (
          <View key={key} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={[styles.muted, isRTL && styles.textRtl]}>{t(key)}</Text>
          </View>
        ))}
      </View>
    </>
  )
}

function ProgressBar({ value, target, label }: { value: number; target: number; label: string }) {
  const width =
    `${Math.min(100, Math.max(0, (value / Math.max(1, target)) * 100))}%` as `${number}%`
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: target, now: value, text: label }}
      style={styles.progress}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width }]} />
      </View>
      <Text style={styles.progressLabel}>{label}</Text>
    </View>
  )
}
function GuestCallout({
  t,
  compact = false,
}: {
  t: ReturnType<typeof useI18n>["t"]
  compact?: boolean
}) {
  return (
    <View style={styles.callout}>
      <MaterialIcons name="cloud-done" size={28} color={colors.primary[700]} />
      <Text style={styles.cardTitle}>
        {t(compact ? "rewards.joinLeaderboard" : "rewards.saveProgress")}
      </Text>
      <Text style={styles.muted}>
        {t(compact ? "rewards.joinLeaderboardDescription" : "rewards.saveProgressDescription")}
      </Text>
      <View style={styles.row}>
        <Link href={{ pathname: "/auth/sign-in", params: { returnTo: "/rewards" } }} asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t("rewards.createAccount")}</Text>
          </Pressable>
        </Link>
        <Link href={{ pathname: "/auth/sign-in", params: { returnTo: "/rewards" } }} asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t("rewards.signIn")}</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  )
}
function StateCard({
  icon,
  title,
  action,
  onPress,
}: {
  icon: "error-outline" | "stars" | "emoji-events" | "flag" | "leaderboard"
  title: string
  action?: string
  onPress?: () => void
}) {
  return (
    <View style={styles.empty}>
      <MaterialIcons name={icon} size={36} color={colors.neutral[500]} />
      <Text style={styles.muted}>{title}</Text>
      {action && onPress && (
        <Pressable onPress={onPress} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{action}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral[50] },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  progress: { width: "100%", gap: 4 },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingHorizontal: 4,
  },
  segmentActive: { backgroundColor: colors.white },
  segmentText: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[600],
    fontWeight: typography.fontWeight.medium,
  },
  segmentTextActive: { color: colors.primary[700], fontWeight: typography.fontWeight.bold },
  hero: {
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  heroName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  level: { color: colors.primary[700], fontWeight: typography.fontWeight.semibold },
  xp: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
  },
  muted: { fontSize: typography.fontSize.sm, color: colors.neutral[600], lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowReverse: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  state: { fontSize: typography.fontSize.xs, color: colors.neutral[600] },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.neutral[200], overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary[600] },
  progressLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[600],
    textAlign: "right",
  },
  rewardLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
  },
  callout: {
    backgroundColor: colors.primary[50],
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  primaryButtonText: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  secondaryButtonText: { color: colors.primary[700], fontWeight: typography.fontWeight.semibold },
  visibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  leaderRow: { flexDirection: "row", alignItems: "center" },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  rank: {
    width: 30,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
  },
  empty: { alignItems: "center", gap: spacing.md, padding: spacing.xl },
})

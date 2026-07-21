import { useFinancialServiceReliability } from "@/hooks/useFinancialServiceReliability"
import { useI18n } from "@/i18n"
import { colors, spacing, typography } from "@/theme"
import type { FinancialServiceReportStatus } from "@/types"
import { MaterialIcons } from "@expo/vector-icons"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import {
  AccessibilityInfo,
  ActivityIndicator,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"

type Props = { serviceId: string }

const STATUS_KEYS: Record<FinancialServiceReportStatus | "unknown", string> = {
  cash_available: "reliability.status.cashAvailable",
  recently_confirmed: "reliability.status.recentlyConfirmed",
  no_cash: "reliability.status.noCash",
  out_of_service: "reliability.status.outOfService",
  partially_available: "reliability.status.partiallyAvailable",
  crowded: "reliability.status.crowded",
  service_available: "reliability.status.serviceAvailable",
  location_closed: "reliability.status.locationClosed",
  unknown: "reliability.status.unknown",
}

const POSITIVE = new Set<FinancialServiceReportStatus>([
  "cash_available",
  "recently_confirmed",
  "service_available",
])
const NEGATIVE = new Set<FinancialServiceReportStatus>([
  "no_cash",
  "out_of_service",
  "location_closed",
])

function ReliabilityDetailsComponent({ serviceId }: Props) {
  const { data: summary, isLoading, isError, refetch } = useFinancialServiceReliability(serviceId)
  const { formatLastConfirmed, formatPercent, formatRelativeTime, isRTL, t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled)
    })
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion)
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  const toggleExpanded = useCallback(() => {
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((value) => !value)
  }, [reduceMotion])

  const displayStatus = useMemo(() => {
    if (!summary || summary.activeReportsCount < 2 || (summary.confidenceScore ?? 0) < 50)
      return "unknown"
    return summary.currentStatus
  }, [summary])

  if (isLoading) {
    return (
      <View style={styles.card} accessibilityLabel={t("reliability.loading")}>
        <ActivityIndicator color={colors.primary[600]} />
        <Text style={styles.muted}>{t("reliability.loading")}</Text>
      </View>
    )
  }

  if (isError || !summary) {
    return (
      <View style={styles.card}>
        <Text style={styles.error}>{t("reliability.error")}</Text>
        <Pressable accessibilityRole="button" onPress={() => void refetch()}>
          <Text style={styles.retry}>{t("common.retry")}</Text>
        </Pressable>
      </View>
    )
  }

  const statusColor =
    displayStatus !== "unknown" && POSITIVE.has(displayStatus)
      ? colors.success[700]
      : displayStatus !== "unknown" && NEGATIVE.has(displayStatus)
        ? colors.error[700]
        : colors.warning[700]

  return (
    <View style={styles.card}>
      <View style={[styles.statusRow, isRTL && styles.rowRtl]}>
        <MaterialIcons name="verified-user" size={24} color={statusColor} />
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{t("reliability.currentStatus")}</Text>
          <Text
            style={[styles.status, { color: statusColor }, isRTL && styles.textRtl]}
            accessibilityLiveRegion="polite"
          >
            {t(STATUS_KEYS[displayStatus] as Parameters<typeof t>[0])}
          </Text>
        </View>
      </View>

      {summary.activeReportsCount === 0 ? (
        <Text style={[styles.muted, isRTL && styles.textRtl]}>{t("reliability.empty")}</Text>
      ) : (
        <View style={styles.metrics}>
          <Text style={styles.metric}>
            {t("reliability.confidence", {
              value:
                summary.confidenceScore === null
                  ? t("misc.unavailable")
                  : formatPercent(summary.confidenceScore),
            })}
          </Text>
          <Text style={styles.metric}>
            {t("reliability.probability", {
              value:
                summary.estimatedSuccessProbability === null
                  ? t("misc.unavailable")
                  : formatPercent(summary.estimatedSuccessProbability),
            })}
          </Text>
          <Text style={styles.metric}>{formatLastConfirmed(summary.lastConfirmedAt)}</Text>
          <Text style={styles.metric}>
            {t("reliability.activeReports", { count: summary.activeReportsCount })}
          </Text>
        </View>
      )}

      <Pressable
        style={[styles.toggle, isRTL && styles.rowRtl]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? t("reliability.hideReports") : t("reliability.viewReports")}
        onPress={toggleExpanded}
      >
        <Text style={styles.toggleText}>
          {expanded ? t("reliability.hideReports") : t("reliability.viewReports")}
        </Text>
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          size={22}
          color={colors.primary[700]}
        />
      </Pressable>

      {expanded && (
        <View style={styles.details} testID="community-report-details">
          <Text style={styles.sectionTitle}>{t("reliability.communityDetails")}</Text>
          <Text style={styles.metric}>
            {t("reliability.verifiedReports", { count: summary.verifiedReportsCount })}
          </Text>
          <Text style={styles.metric}>
            {t("reliability.freshness", {
              value: t(`reliability.freshness.${summary.freshness}` as Parameters<typeof t>[0]),
            })}
          </Text>
          <Text style={styles.metric}>
            {t("reliability.lastReport", {
              value: summary.lastReportAt
                ? formatRelativeTime(summary.lastReportAt)
                : t("misc.unavailable"),
            })}
          </Text>
          <Text style={styles.metric}>
            {t("reliability.mostCommon", {
              value: summary.mostCommonRecentStatus
                ? t(STATUS_KEYS[summary.mostCommonRecentStatus] as Parameters<typeof t>[0])
                : t("reliability.status.unknown"),
            })}
          </Text>

          {summary.voteDistribution.map((vote) => (
            <View key={vote.status} style={styles.voteRow}>
              <View style={[styles.voteHeader, isRTL && styles.rowRtl]}>
                <Text style={styles.voteLabel}>
                  {t(STATUS_KEYS[vote.status] as Parameters<typeof t>[0])}
                </Text>
                <Text style={styles.voteCount}>
                  {t("reliability.voteValue", {
                    count: vote.count,
                    percentage: formatPercent(vote.percentage),
                  })}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${vote.percentage}%` }]} />
              </View>
            </View>
          ))}

          {summary.recentActivity.length > 0 && (
            <View style={styles.recent}>
              <Text style={styles.sectionTitle}>{t("reliability.recentActivity")}</Text>
              {summary.recentActivity.map((activity, index) => (
                <Text
                  key={`${activity.status}-${activity.createdAt}-${index}`}
                  style={styles.metric}
                >
                  {t(
                    activity.isVerified
                      ? "reliability.activityConfirmed"
                      : "reliability.activityReported",
                    {
                      status: t(STATUS_KEYS[activity.status] as Parameters<typeof t>[0]),
                      time: formatRelativeTime(activity.createdAt),
                    }
                  )}
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.explanation}>{t("reliability.explanation")}</Text>
        </View>
      )}
    </View>
  )
}

export const ReliabilityDetails = memo(ReliabilityDetailsComponent)

const styles = StyleSheet.create({
  card: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowRtl: { flexDirection: "row-reverse" },
  flex: { flex: 1 },
  eyebrow: { color: colors.neutral[600], fontSize: typography.fontSize.sm },
  status: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  muted: { color: colors.neutral[600], textAlign: "center" },
  error: { color: colors.error[700], textAlign: "center" },
  retry: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
    padding: spacing.sm,
  },
  metrics: { gap: spacing.xs },
  metric: { color: colors.neutral[700], fontSize: typography.fontSize.sm },
  toggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: spacing.sm,
  },
  toggleText: { color: colors.primary[700], fontWeight: typography.fontWeight.semibold },
  details: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral[900],
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.md,
  },
  voteRow: { gap: spacing.xs },
  voteHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  voteLabel: { flex: 1, color: colors.neutral[800] },
  voteCount: { color: colors.neutral[600], fontSize: typography.fontSize.sm },
  track: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.neutral[200] },
  fill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary[600] },
  recent: { gap: spacing.xs, marginTop: spacing.xs },
  explanation: { color: colors.neutral[600], fontSize: typography.fontSize.sm, lineHeight: 20 },
})

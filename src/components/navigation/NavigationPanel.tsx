import { memo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type NavigationPanelProps = {
  isActive: boolean
  isRecalculating: boolean
  remainingDistance: string
  eta: string
  onStart: () => void
  onStop: () => void
  onRefresh: () => void
}

function NavigationPanelImpl({
  isActive,
  isRecalculating,
  remainingDistance,
  eta,
  onStart,
  onStop,
  onRefresh,
}: NavigationPanelProps) {
  const { isRTL, t } = useI18n()

  return (
    <View style={styles.container} accessibilityLabel={t("navigation.panelAccessibility")}>
      {isActive && (
        <View style={[styles.statsRow, isRTL && styles.statsRowRtl]}>
          <View
            style={styles.statItem}
            accessibilityLabel={t("navigation.remainingDistance", { value: remainingDistance })}
          >
            <MaterialIcons name="straighten" size={18} color={colors.primary[600]} />
            <Text style={styles.statValue}>{remainingDistance}</Text>
            <Text style={styles.statLabel}>{t("navigation.remaining")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View
            style={styles.statItem}
            accessibilityLabel={t("navigation.estimatedArrival", { value: eta })}
          >
            <MaterialIcons name="schedule" size={18} color={colors.primary[600]} />
            <Text style={styles.statValue}>{eta}</Text>
            <Text style={styles.statLabel}>{t("navigation.eta")}</Text>
          </View>
        </View>
      )}

      {isRecalculating && (
        <View
          style={[styles.recalculatingBanner, isRTL && styles.recalculatingBannerRtl]}
          accessibilityLabel={t("navigation.recalculatingRoute")}
        >
          <MaterialIcons name="sync" size={16} color={colors.warning[700]} />
          <Text style={[styles.recalculatingText, isRTL && styles.textRtl]}>
            {t("navigation.recalculatingRoute")}
          </Text>
        </View>
      )}

      <View style={[styles.buttonRow, isRTL && styles.buttonRowRtl]}>
        {!isActive ? (
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              isRTL && styles.buttonContentRtl,
              pressed && styles.buttonPressed,
            ]}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel={t("navigation.start")}
          >
            <MaterialIcons name="navigation" size={20} color={colors.white} />
            <Text style={styles.buttonText}>{t("navigation.start")}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.stopButton,
              isRTL && styles.buttonContentRtl,
              pressed && styles.buttonPressed,
            ]}
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel={t("navigation.stop")}
          >
            <MaterialIcons name="stop" size={20} color={colors.white} />
            <Text style={styles.buttonText}>{t("navigation.stop")}</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.refreshButton,
            isRTL && styles.buttonContentRtl,
            pressed && styles.buttonPressed,
          ]}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel={t("navigation.refreshLocation")}
        >
          <MaterialIcons name="refresh" size={20} color={colors.primary[600]} />
          <Text style={styles.refreshButtonText}>{t("common.refresh")}</Text>
        </Pressable>
      </View>
    </View>
  )
}

export const NavigationPanel = memo(NavigationPanelImpl)

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statsRowRtl: {
    flexDirection: "row-reverse",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.primary[200],
    marginHorizontal: spacing.lg,
  },
  recalculatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.warning[50],
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  recalculatingBannerRtl: {
    flexDirection: "row-reverse",
  },
  recalculatingText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning[700],
    fontWeight: typography.fontWeight.medium,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  buttonRowRtl: {
    flexDirection: "row-reverse",
  },
  startButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.success[600],
    paddingVertical: spacing.sm + 4,
    borderRadius: 12,
  },
  stopButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.error[600],
    paddingVertical: spacing.sm + 4,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  buttonContentRtl: {
    flexDirection: "row-reverse",
  },
  refreshButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
})

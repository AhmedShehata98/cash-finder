import { View, Text, Pressable, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type EmptyStateProps = {
  onRefresh?: () => void
}

export function EmptyState({ onRefresh }: EmptyStateProps) {
  const { t } = useI18n()

  return (
    <View style={styles.container} accessibilityLabel={t("discover.noResultsAccessibility")}>
      <View style={styles.content}>
        <MaterialIcons name="search-off" size={64} color={colors.neutral[300]} />
        <Text style={styles.title}>{t("discover.noResultsTitle")}</Text>
        <Text style={styles.subtitle}>{t("discover.noResultsDescription")}</Text>
        {onRefresh && (
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel={t("discover.refreshSearchAccessibility")}
          >
            <Text style={styles.actionButtonText}>{t("common.refresh")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  content: {
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[800],
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.neutral[600],
    textAlign: "center",
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.md,
    maxWidth: 280,
  },
  actionButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
})

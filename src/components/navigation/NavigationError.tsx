import { memo } from "react"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type NavigationErrorProps = {
  message: string
  onRetry: () => void
}

function NavigationErrorImpl({ message, onRetry }: NavigationErrorProps) {
  const { t } = useI18n()

  return (
    <View style={styles.container} accessibilityLabel={t("navigation.errorAccessibility")}>
      <View style={styles.content}>
        <MaterialIcons name="error-outline" size={20} color={colors.error[600]} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t("navigation.retryNavigation")}
        >
          <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
        </Pressable>
      </View>
    </View>
  )
}

export const NavigationError = memo(NavigationErrorImpl)

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.error[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error[100],
    padding: spacing.md,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.error[700],
    fontWeight: typography.fontWeight.medium,
  },
  retryButton: {
    backgroundColor: colors.error[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
})

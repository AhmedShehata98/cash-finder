import { View, Text, Pressable, StyleSheet } from "react-native"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type ErrorStateProps = {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityLabel="An error occurred">
      <View style={styles.content}>
        <Text style={styles.illustration}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>{message}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
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
  illustration: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[800],
    textAlign: "center",
  },
  message: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    textAlign: "center",
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
})

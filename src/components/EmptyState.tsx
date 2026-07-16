import { View, Text, Pressable, StyleSheet } from "react-native"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type EmptyStateProps = {
  onRefresh?: () => void
}

export function EmptyState({ onRefresh }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityLabel="No nearby financial locations found">
      <View style={styles.content}>
        <Text style={styles.illustration}>🔍</Text>
        <Text style={styles.title}>No nearby financial locations found</Text>
        <Text style={styles.subtitle}>
          We couldn't find any banks, ATMs, or financial service providers near your current
          location.
        </Text>
        {onRefresh && (
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh search"
          >
            <Text style={styles.actionButtonText}>Refresh</Text>
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
  illustration: {
    fontSize: 64,
    marginBottom: spacing.sm,
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

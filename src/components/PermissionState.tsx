import { View, Text, Pressable, StyleSheet } from "react-native"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type PermissionStateProps = {
  onRequestPermission: () => void
}

export function PermissionState({ onRequestPermission }: PermissionStateProps) {
  return (
    <View style={styles.container} accessibilityLabel="Location permission required">
      <View style={styles.content}>
        <Text style={styles.illustration}>📍</Text>
        <Text style={styles.title}>Location Permission Required</Text>
        <Text style={styles.description}>
          Cash Finder needs access to your location to show nearby financial services. Your location
          data is only used to find places near you and is not stored or shared.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.permissionButton,
            pressed && styles.permissionButtonPressed,
          ]}
          onPress={onRequestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant location permission"
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
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
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[800],
    textAlign: "center",
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.neutral[600],
    textAlign: "center",
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.md,
    maxWidth: 300,
  },
  permissionButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  permissionButtonPressed: {
    opacity: 0.85,
  },
  permissionButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
})

import { View, Text, Pressable, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type PermissionStateProps = {
  onRequestPermission: () => void
}

export function PermissionState({ onRequestPermission }: PermissionStateProps) {
  const { t } = useI18n()

  return (
    <View style={styles.container} accessibilityLabel={t("discover.permissionAccessibility")}>
      <View style={styles.content}>
        <MaterialIcons name="location-on" size={64} color={colors.primary[500]} />
        <Text style={styles.title}>{t("discover.permissionTitle")}</Text>
        <Text style={styles.description}>{t("discover.permissionDescription")}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.permissionButton,
            pressed && styles.permissionButtonPressed,
          ]}
          onPress={onRequestPermission}
          accessibilityRole="button"
          accessibilityLabel={t("discover.grantPermissionAccessibility")}
        >
          <Text style={styles.permissionButtonText}>{t("discover.grantPermission")}</Text>
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

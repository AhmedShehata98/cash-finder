import { Pressable, StyleSheet, Text } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type FilterButtonProps = {
  label: string
  onPress: () => void
  isActive?: boolean
}

export function FilterButton({ label, onPress, isActive = false }: FilterButtonProps) {
  const { isRTL, t } = useI18n()

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isRTL && styles.buttonRtl,
        isActive && styles.buttonActive,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("discover.filterBy", { label })}
    >
      <MaterialIcons
        name="filter-list"
        size={18}
        color={isActive ? colors.primary[600] : colors.neutral[500]}
      />
      <Text style={[styles.label, isRTL && styles.labelRtl, isActive && styles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  buttonRtl: {
    flexDirection: "row-reverse",
  },
  buttonActive: {
    backgroundColor: colors.primary[50],
  },
  buttonPressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[700],
  },
  labelRtl: {
    writingDirection: "rtl",
  },
  labelActive: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
  },
})

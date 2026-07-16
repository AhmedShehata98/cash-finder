import { Pressable, Text, StyleSheet } from "react-native"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type CategoryChipProps = {
  label: string
  isSelected: boolean
  onPress: () => void
}

export function CategoryChip({ label, isSelected, onPress }: CategoryChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipDefault,
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${label} filter${isSelected ? ", selected" : ""}`}
    >
      <Text style={[styles.label, isSelected ? styles.labelSelected : styles.labelDefault]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipDefault: {
    backgroundColor: colors.white,
    borderColor: colors.neutral[200],
  },
  chipSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  chipPressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  labelDefault: {
    color: colors.neutral[700],
  },
  labelSelected: {
    color: colors.white,
  },
})

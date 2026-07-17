import { Pressable, StyleSheet, Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { BottomSheet } from "@/components/BottomSheet"
import { serviceCategories, type CategoryDefinition } from "@/constants/service-categories"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type CategoryFilterSheetProps = {
  isOpen: boolean
  onClose: () => void
  selectedCategory: string
  onSelectCategory: (key: string) => void
}

function getCategoryIcon(category: CategoryDefinition): keyof typeof MaterialIcons.glyphMap {
  switch (category.key) {
    case "atm":
      return "atm"
    case "banks":
      return "account-balance"
    case "money-transfer":
      return "currency-exchange"
    case "all":
    default:
      return "category"
  }
}

export function CategoryFilterSheet({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterSheetProps) {
  const { isRTL, t, getCategoryLabel } = useI18n()

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <View style={styles.container}>
        <Text style={[styles.title, isRTL && styles.textRtl]}>{t("discover.selectCategory")}</Text>

        {serviceCategories.map((category) => {
          const isSelected = selectedCategory === category.key
          const label = getCategoryLabel(category.key)

          return (
            <Pressable
              key={category.key}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
              onPress={() => {
                onSelectCategory(category.key)
                onClose()
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={isSelected ? `${label}, ${t("common.selected")}` : label}
            >
              <View style={[styles.optionContent, isRTL && styles.optionContentRtl]}>
                <MaterialIcons
                  name={getCategoryIcon(category)}
                  size={24}
                  color={isSelected ? colors.primary[600] : colors.neutral[600]}
                />
                <Text style={[styles.label, isRTL && styles.textRtl, isSelected && styles.labelSelected]}>
                  {label}
                </Text>
                {isSelected && (
                  <MaterialIcons
                    name="check"
                    size={24}
                    color={colors.primary[600]}
                    style={styles.checkIcon}
                  />
                )}
              </View>
            </Pressable>
          )
        })}

        <Pressable
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("discover.closeCategoryFilter")}
        >
          <Text style={styles.closeButtonText}>{t("common.close")}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  option: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  optionContentRtl: {
    flexDirection: "row-reverse",
  },
  label: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[800],
  },
  labelSelected: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
  },
  checkIcon: {
    marginLeft: "auto",
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  closeButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  closeButtonPressed: {
    opacity: 0.85,
  },
  closeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
})

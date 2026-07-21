import { Pressable, StyleSheet, Text, View } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { BottomSheet } from "@/components/BottomSheet"
import {
  filterableServiceTypes,
  serviceCategories,
  type CategoryDefinition,
} from "@/constants/service-categories"
import type { NearbyFilterState } from "@/features/discovery/utils/location-ranking"
import { useI18n } from "@/i18n"
import type { FinancialServiceType } from "@/types"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type CategoryFilterSheetProps = {
  isOpen: boolean
  onClose: () => void
  selectedCategory: string
  onSelectCategory: (key: string) => void
  filters: NearbyFilterState
  onChangeFilters: (filters: NearbyFilterState) => void
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
  filters,
  onChangeFilters,
}: CategoryFilterSheetProps) {
  const { isRTL, t, getCategoryLabel, getFinancialServiceTypeLabel } = useI18n()

  const toggleServiceType = (serviceType: FinancialServiceType) => {
    const serviceTypes = filters.serviceTypes.includes(serviceType)
      ? filters.serviceTypes.filter((item) => item !== serviceType)
      : [...filters.serviceTypes, serviceType]

    onChangeFilters({ ...filters, serviceTypes })
  }

  const toggleBooleanFilter = (
    key: "requireHighConfidence" | "requireNearbyDistance" | "requireRecentlyUpdated"
  ) => {
    onChangeFilters({ ...filters, [key]: !filters[key] })
  }

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

        <Text style={[styles.sectionTitle, isRTL && styles.textRtl]}>
          {t("discover.serviceType")}
        </Text>
        <View style={[styles.chipGrid, isRTL && styles.chipGridRtl]}>
          {filterableServiceTypes.map((serviceType) => {
            const isSelected = filters.serviceTypes.includes(serviceType)
            const label = getFinancialServiceTypeLabel(serviceType)

            return (
              <Pressable
                key={serviceType}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && styles.chipSelected,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => toggleServiceType(serviceType)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={isSelected ? `${label}, ${t("common.selected")}` : label}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={[styles.sectionTitle, isRTL && styles.textRtl]}>
          {t("discover.reliabilityFilters")}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.option,
            filters.requireHighConfidence && styles.optionSelected,
            pressed && styles.optionPressed,
          ]}
          onPress={() => toggleBooleanFilter("requireHighConfidence")}
          accessibilityRole="switch"
          accessibilityState={{ checked: filters.requireHighConfidence }}
        >
          <View style={[styles.optionContent, isRTL && styles.optionContentRtl]}>
            <MaterialIcons name="verified" size={24} color={colors.primary[600]} />
            <Text style={[styles.label, isRTL && styles.textRtl]}>
              {t("discover.highestConfidence")}
            </Text>
            {filters.requireHighConfidence && (
              <MaterialIcons name="check" size={24} color={colors.primary[600]} />
            )}
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.option,
            filters.requireNearbyDistance && styles.optionSelected,
            pressed && styles.optionPressed,
          ]}
          onPress={() => toggleBooleanFilter("requireNearbyDistance")}
          accessibilityRole="switch"
          accessibilityState={{ checked: filters.requireNearbyDistance }}
        >
          <View style={[styles.optionContent, isRTL && styles.optionContentRtl]}>
            <MaterialIcons name="near-me" size={24} color={colors.primary[600]} />
            <Text style={[styles.label, isRTL && styles.textRtl]}>
              {t("discover.nearbyDistance")}
            </Text>
            {filters.requireNearbyDistance && (
              <MaterialIcons name="check" size={24} color={colors.primary[600]} />
            )}
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.option,
            filters.requireRecentlyUpdated && styles.optionSelected,
            pressed && styles.optionPressed,
          ]}
          onPress={() => toggleBooleanFilter("requireRecentlyUpdated")}
          accessibilityRole="switch"
          accessibilityState={{ checked: filters.requireRecentlyUpdated }}
        >
          <View style={[styles.optionContent, isRTL && styles.optionContentRtl]}>
            <MaterialIcons name="update" size={24} color={colors.primary[600]} />
            <Text style={[styles.label, isRTL && styles.textRtl]}>
              {t("discover.recentlyUpdated")}
            </Text>
            {filters.requireRecentlyUpdated && (
              <MaterialIcons name="check" size={24} color={colors.primary[600]} />
            )}
          </View>
        </Pressable>

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
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
    marginTop: spacing.sm,
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
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chipGridRtl: {
    flexDirection: "row-reverse",
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[700],
  },
  chipTextSelected: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
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

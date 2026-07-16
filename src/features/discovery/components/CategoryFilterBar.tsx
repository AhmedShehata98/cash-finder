import { ScrollView, StyleSheet } from "react-native"
import { CategoryChip } from "@/components/CategoryChip"
import { serviceCategories } from "@/constants/service-categories"
import { spacing } from "@/theme"

type CategoryFilterBarProps = {
  selectedCategory: string
  onSelectCategory: (_key: string) => void
}

export function CategoryFilterBar({ selectedCategory, onSelectCategory }: CategoryFilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      accessibilityLabel="Category filters"
      accessibilityRole="tablist"
    >
      {serviceCategories.map((category) => (
        <CategoryChip
          key={category.key}
          label={category.label}
          isSelected={selectedCategory === category.key}
          onPress={() => onSelectCategory(category.key)}
        />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
})

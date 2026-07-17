import { ReactNode } from "react"
import { View, TextInput, Pressable, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type SearchBarProps = {
  value: string
  onChangeText: (_text: string) => void
  onClear: () => void
  filterButton?: ReactNode
}

export function SearchBar({ value, onChangeText, onClear, filterButton }: SearchBarProps) {
  const { isRTL, t } = useI18n()

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, isRTL && styles.inputWrapperRtl]}>
        <MaterialIcons
          name="search"
          size={22}
          color={colors.neutral[400]}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.input, isRTL && styles.inputRtl]}
          placeholder={t("discover.searchPlaceholder")}
          placeholderTextColor={colors.neutral[400]}
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={t("discover.searchAccessibility")}
          accessibilityRole="search"
          returnKeyType="search"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable
            onPress={onClear}
            style={styles.clearButton}
            accessibilityLabel={t("discover.clearSearchAccessibility")}
            accessibilityRole="button"
          >
            <MaterialIcons name="close" size={20} color={colors.neutral[500]} />
          </Pressable>
        )}
        {filterButton}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  inputWrapperRtl: {
    flexDirection: "row-reverse",
  },
  searchIcon: {
    marginRight: -spacing.xs,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: typography.fontSize.md,
    color: colors.neutral[900],
  },
  inputRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  clearButton: {
    padding: 4,
  },
})

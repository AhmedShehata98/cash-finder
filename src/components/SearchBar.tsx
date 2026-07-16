import { View, TextInput, Pressable, StyleSheet } from "react-native"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type SearchBarProps = {
  value: string
  onChangeText: (_text: string) => void
  onClear: () => void
}

export function SearchBar({ value, onChangeText, onClear }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Search locations..."
          placeholderTextColor={colors.neutral[400]}
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel="Search financial locations"
          accessibilityRole="search"
          returnKeyType="search"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable
            onPress={onClear}
            style={styles.clearButton}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <View style={styles.clearIcon}>
              <View style={styles.clearIconLine} />
            </View>
          </Pressable>
        )}
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
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: typography.fontSize.md,
    color: colors.neutral[900],
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
  },
  clearIconLine: {
    width: 10,
    height: 2,
    backgroundColor: colors.white,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
})

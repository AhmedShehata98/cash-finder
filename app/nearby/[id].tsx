import { View, Text, StyleSheet } from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

export default function LocationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <View style={styles.container} accessibilityLabel={`Location details for ${id}`}>
      <Stack.Screen
        options={{
          title: "Location Details",
          headerBackTitle: "Back",
        }}
      />
      <View style={styles.content}>
        <Text style={styles.illustration}>📍</Text>
        <Text style={styles.title}>Location Details</Text>
        <Text style={styles.subtitle}>ID: {id}</Text>
        <Text style={styles.placeholder}>
          Detailed location information will be displayed here.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
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
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    fontFamily: "SpaceMono",
  },
  placeholder: {
    fontSize: typography.fontSize.md,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.md,
    maxWidth: 280,
  },
})

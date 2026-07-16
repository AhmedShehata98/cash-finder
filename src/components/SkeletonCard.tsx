import { View, StyleSheet } from "react-native"
import { colors } from "@/theme"
import { spacing } from "@/theme"

type SkeletonCardProps = {
  count?: number
}

export function SkeletonCard({ count = 3 }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.card} accessibilityLabel="Loading">
          <View style={styles.cardContent}>
            <View style={styles.logoPlaceholder} />

            <View style={styles.infoContainer}>
              <View style={styles.namePlaceholder} />
              <View style={styles.addressPlaceholder} />
              <View style={styles.metaPlaceholder} />
            </View>

            <View style={styles.chevronPlaceholder} />
          </View>
        </View>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.neutral[200],
  },
  infoContainer: {
    flex: 1,
    gap: 8,
  },
  namePlaceholder: {
    height: 18,
    width: "70%",
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  addressPlaceholder: {
    height: 14,
    width: "90%",
    borderRadius: 4,
    backgroundColor: colors.neutral[100],
  },
  metaPlaceholder: {
    height: 20,
    width: "40%",
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
  },
  chevronPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.neutral[100],
  },
})

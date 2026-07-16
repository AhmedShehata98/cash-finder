import { View, Text, Pressable, StyleSheet } from "react-native"
import { Link } from "expo-router"
import { FinancialLocation, LocationType, ServiceProvider } from "@/types"
import { formatDistance } from "@/services/location.service"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type LocationCardProps = {
  item: FinancialLocation
}

function getTypeBadgeColor(type: LocationType): string {
  switch (type) {
    case LocationType.Bank:
      return colors.primary[600]
    case LocationType.ATM:
      return colors.success[600]
    case LocationType.FinancialServiceProvider:
      return colors.secondary[600]
  }
}

function getProviderLogo(type: LocationType, provider: ServiceProvider | null): string | null {
  if (type === LocationType.ATM) return "🏧"
  if (type === LocationType.Bank) return "🏦"
  if (provider === ServiceProvider.Fawry) return "💳"
  if (provider === ServiceProvider.Bee) return "🐝"
  if (provider === ServiceProvider.Aman) return "🛡"
  if (provider === ServiceProvider.Dafaa) return "💵"
  return "📍"
}

function getOpenStatusLabel(isOpen: boolean | null): string | null {
  if (isOpen === null) return null
  return isOpen ? "Open" : "Closed"
}

export function LocationCard({ item }: LocationCardProps) {
  const badgeColor = getTypeBadgeColor(item.type)
  const logo = item.logo || getProviderLogo(item.type, item.provider)
  const openLabel = getOpenStatusLabel(item.isOpen)

  return (
    <Link
      href={`/nearby/${item.id}`}
      asChild
      accessibilityLabel={`${item.name}, ${item.type}, ${item.distanceFromUser ? formatDistance(item.distanceFromUser) : ""}, ${item.address}`}
      accessibilityRole="button"
    >
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.cardContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText} accessibilityElementsHidden>
              {logo}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {openLabel && (
                <View
                  style={[
                    styles.openBadge,
                    {
                      backgroundColor: item.isOpen
                        ? colors.success[50]
                        : colors.error[50],
                    },
                  ]}
                  accessibilityLabel={openLabel}
                >
                  <Text
                    style={[
                      styles.openBadgeText,
                      {
                        color: item.isOpen ? colors.success[700] : colors.error[700],
                      },
                    ]}
                  >
                    {openLabel}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.address} numberOfLines={1}>
              {item.address}
            </Text>

            <View style={styles.metaRow}>
              {item.distanceFromUser !== null && (
                <View style={styles.distanceContainer}>
                  <Text style={styles.distanceIcon}>📏</Text>
                  <Text style={styles.distanceText}>
                    {formatDistance(item.distanceFromUser)}
                  </Text>
                </View>
              )}

              <View
                style={[styles.typeBadge, { backgroundColor: badgeColor }]}
                accessibilityLabel={item.type}
              >
                <Text style={styles.typeBadgeText}>{item.type}</Text>
              </View>
            </View>

            {item.type === LocationType.FinancialServiceProvider && item.provider && (
              <View style={styles.providerRow}>
                <Text style={styles.providerText}>{item.provider}</Text>
              </View>
            )}
          </View>

          <Text style={styles.chevron} accessibilityElementsHidden>
            ›
          </Text>
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.neutral[50],
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 28,
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    flex: 1,
  },
  openBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  openBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  address: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  distanceIcon: {
    fontSize: 12,
  },
  distanceText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  providerText: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    fontWeight: typography.fontWeight.medium,
  },
  chevron: {
    fontSize: 24,
    color: colors.neutral[300],
    fontWeight: typography.fontWeight.regular,
  },
})

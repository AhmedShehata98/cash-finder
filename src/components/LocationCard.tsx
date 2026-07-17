import { View, Text, Pressable, StyleSheet } from "react-native"
import { Link } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { FinancialLocation, LocationType, ServiceProvider } from "@/types"
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

function getLocationIcon(type: LocationType): keyof typeof MaterialIcons.glyphMap {
  switch (type) {
    case LocationType.ATM:
      return "atm"
    case LocationType.Bank:
      return "account-balance"
    case LocationType.FinancialServiceProvider:
    default:
      return "currency-exchange"
  }
}

function getProviderIcon(provider: ServiceProvider | null): keyof typeof MaterialIcons.glyphMap {
  switch (provider) {
    case ServiceProvider.Fawry:
      return "credit-card"
    case ServiceProvider.Bee:
      return "sync"
    case ServiceProvider.Aman:
      return "shield"
    case ServiceProvider.Dafaa:
      return "payments"
    default:
      return "currency-exchange"
  }
}

function getOpenStatusLabel(isOpen: boolean | null): string | null {
  if (isOpen === null) return null
  return isOpen ? "open" : "closed"
}

export function LocationCard({ item }: LocationCardProps) {
  const { formatDistance, getLocationTypeLabel, getProviderLabel, isRTL, t } = useI18n()
  const badgeColor = getTypeBadgeColor(item.type)
  const openLabel = getOpenStatusLabel(item.isOpen)
  const badgeText = item.category?.name ?? getLocationTypeLabel(item.type)
  const providerLabel = item.provider ? getProviderLabel(item.provider) : null

  return (
    <Link
      href={`/nearby/${item.id}`}
      asChild
      accessibilityLabel={`${item.name}, ${badgeText}, ${item.distanceFromUser ? formatDistance(item.distanceFromUser) : ""}, ${item.address}`}
      accessibilityRole="button"
    >
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={[styles.cardContent, isRTL && styles.cardContentRtl]}>
          <View style={styles.logoContainer}>
            {item.logo ? (
              <Text style={styles.logoText}>{item.logo}</Text>
            ) : (
              <MaterialIcons
                name={getLocationIcon(item.type)}
                size={28}
                color={colors.primary[600]}
                accessibilityElementsHidden
              />
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={[styles.nameRow, isRTL && styles.nameRowRtl]}>
              <Text style={[styles.name, isRTL && styles.textRtl]} numberOfLines={1}>
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
                  accessibilityLabel={t(`location.${openLabel}` as const)}
                >
                  <Text
                    style={[
                      styles.openBadgeText,
                      isRTL && styles.textRtl,
                      {
                        color: item.isOpen ? colors.success[700] : colors.error[700],
                      },
                    ]}
                  >
                    {t(`location.${openLabel}` as const)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.address, isRTL && styles.textRtl]} numberOfLines={1}>
              {item.address}
            </Text>

            <View style={[styles.metaRow, isRTL && styles.metaRowRtl]}>
              {item.distanceFromUser !== null && (
                <View style={[styles.distanceContainer, isRTL && styles.distanceContainerRtl]}>
                  <MaterialIcons name="straighten" size={14} color={colors.primary[600]} />
                  <Text style={styles.distanceText}>
                    {formatDistance(item.distanceFromUser)}
                  </Text>
                </View>
              )}

              <View
                style={[styles.typeBadge, { backgroundColor: badgeColor }]}
                accessibilityLabel={badgeText}
              >
                <Text style={[styles.typeBadgeText, isRTL && styles.textRtl]}>{badgeText}</Text>
              </View>
            </View>

            {item.type === LocationType.FinancialServiceProvider && providerLabel && (
              <View style={[styles.providerRow, isRTL && styles.providerRowRtl]}>
                <MaterialIcons
                  name={getProviderIcon(item.provider)}
                  size={12}
                  color={colors.neutral[500]}
                />
                <Text style={[styles.providerText, isRTL && styles.textRtl]}>{providerLabel}</Text>
              </View>
            )}
          </View>

          <MaterialIcons
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={24}
            color={colors.neutral[300]}
            accessibilityElementsHidden
          />
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
  cardContentRtl: {
    flexDirection: "row-reverse",
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
  nameRowRtl: {
    flexDirection: "row-reverse",
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
  metaRowRtl: {
    flexDirection: "row-reverse",
    justifyContent: "flex-end",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  distanceContainerRtl: {
    flexDirection: "row-reverse",
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
  providerRowRtl: {
    flexDirection: "row-reverse",
  },
  providerText: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    fontWeight: typography.fontWeight.medium,
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
})

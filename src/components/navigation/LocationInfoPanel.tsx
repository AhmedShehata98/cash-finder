import { memo, useMemo } from "react"
import { View, Text, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import type { LocationType } from "@/types"
import { LocationType as LocationTypeEnum, ServiceProvider as ServiceProviderEnum } from "@/types"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"

type LocationInfoPanelProps = {
  name: string
  type: LocationType
  categoryName: string | null
  address: string
  distanceFromUser: number | null
  walkingTime: string | null
  drivingTime: string | null
  isOpen: boolean | null
  openingHoursText: string[] | null
  phone: string | null
  website: string | null
  email: string | null
  latitude: number
  longitude: number
  provider: ServiceProviderEnum | null
}

function getTypeBadgeColor(type: LocationType): string {
  switch (type) {
    case LocationTypeEnum.Bank:
      return colors.primary[600]
    case LocationTypeEnum.ATM:
      return colors.success[600]
    default:
      return colors.secondary[600]
  }
}

function getLocationIcon(type: LocationType): keyof typeof MaterialIcons.glyphMap {
  switch (type) {
    case LocationTypeEnum.ATM:
      return "atm"
    case LocationTypeEnum.Bank:
      return "account-balance"
    default:
      return "currency-exchange"
  }
}

function LocationInfoPanelImpl({
  name,
  type,
  categoryName,
  address,
  distanceFromUser,
  walkingTime,
  drivingTime,
  isOpen,
  openingHoursText,
  phone,
  website,
  email,
  latitude,
  longitude,
  provider,
}: LocationInfoPanelProps) {
  const { formatDistance, getLocationTypeLabel, getProviderLabel, isRTL, t } = useI18n()
  const badgeColor = useMemo(() => getTypeBadgeColor(type), [type])
  const icon = useMemo(() => getLocationIcon(type), [type])
  const badgeText = useMemo(
    () => categoryName ?? getLocationTypeLabel(type),
    [categoryName, getLocationTypeLabel, type]
  )
  const providerLabel = useMemo(
    () => (provider ? getProviderLabel(provider) : null),
    [getProviderLabel, provider]
  )

  return (
    <View style={styles.container} accessibilityLabel={t("location.infoAccessibility")}>
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon} size={28} color={badgeColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, isRTL && styles.textRtl]} numberOfLines={2}>
            {name}
          </Text>
          <View style={[styles.badgesRow, isRTL && styles.badgesRowRtl]}>
            <View style={[styles.typeBadge, { backgroundColor: badgeColor }]}>
              <Text style={[styles.typeBadgeText, isRTL && styles.textRtl]}>{badgeText}</Text>
            </View>
            {isOpen !== null && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isOpen ? colors.success[50] : colors.error[50] },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isRTL && styles.textRtl,
                    { color: isOpen ? colors.success[700] : colors.error[700] },
                  ]}
                >
                  {isOpen ? t("location.open") : t("location.closed")}
                </Text>
              </View>
            )}
          </View>
          {providerLabel && (
            <Text style={[styles.providerText, isRTL && styles.textRtl]}>{providerLabel}</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.infoRow, isRTL && styles.infoRowRtl]} accessibilityLabel={`${t("location.address")}: ${address}`}>
          <MaterialIcons name="location-on" size={18} color={colors.neutral[500]} />
          <Text style={[styles.infoText, isRTL && styles.textRtl]}>{address}</Text>
        </View>

        {distanceFromUser !== null && (
          <View
            style={[styles.infoRow, isRTL && styles.infoRowRtl]}
            accessibilityLabel={`${t("location.distance")}: ${formatDistance(distanceFromUser)}`}
          >
            <MaterialIcons name="straighten" size={18} color={colors.neutral[500]} />
            <Text style={[styles.infoText, isRTL && styles.textRtl]}>{formatDistance(distanceFromUser)}</Text>
          </View>
        )}

        {walkingTime && (
          <View
            style={[styles.infoRow, isRTL && styles.infoRowRtl]}
            accessibilityLabel={`${t("location.walkingTime")}: ${walkingTime}`}
          >
            <MaterialIcons name="directions-walk" size={18} color={colors.neutral[500]} />
            <Text style={[styles.infoText, isRTL && styles.textRtl]}>
              {t("location.walkingTimeValue", { time: walkingTime })}
            </Text>
          </View>
        )}

        {drivingTime && (
          <View
            style={[styles.infoRow, isRTL && styles.infoRowRtl]}
            accessibilityLabel={`${t("location.drivingTime")}: ${drivingTime}`}
          >
            <MaterialIcons name="directions-car" size={18} color={colors.neutral[500]} />
            <Text style={[styles.infoText, isRTL && styles.textRtl]}>
              {t("location.drivingTimeValue", { time: drivingTime })}
            </Text>
          </View>
        )}

        {openingHoursText && openingHoursText.length > 0 && (
          <View
            style={[styles.infoRow, isRTL && styles.infoRowRtl]}
            accessibilityLabel={`${t("location.openingHours")}: ${openingHoursText.join(", ")}`}
          >
            <MaterialIcons name="access-time" size={18} color={colors.neutral[500]} />
            <Text style={[styles.infoText, isRTL && styles.textRtl]}>{openingHoursText.join("\n")}</Text>
          </View>
        )}

        {phone && (
          <View style={[styles.infoRow, isRTL && styles.infoRowRtl]} accessibilityLabel={`${t("location.phone")}: ${phone}`}>
            <MaterialIcons name="phone" size={18} color={colors.neutral[500]} />
            <Text style={[styles.infoText, isRTL && styles.textRtl]}>{phone}</Text>
          </View>
        )}

        {website && (
          <View
            style={[styles.infoRow, isRTL && styles.infoRowRtl]}
            accessibilityLabel={`${t("location.website")}: ${website}`}
          >
            <MaterialIcons name="language" size={18} color={colors.neutral[500]} />
            <Text style={[styles.infoText, isRTL && styles.textRtl]} numberOfLines={1}>
              {website}
            </Text>
          </View>
        )}

        {email && (
          <View style={[styles.infoRow, isRTL && styles.infoRowRtl]} accessibilityLabel={`${t("location.email")}: ${email}`}>
            <MaterialIcons name="email" size={18} color={colors.neutral[500]} />
            <Text style={[styles.infoText, isRTL && styles.textRtl]} numberOfLines={1}>
              {email}
            </Text>
          </View>
        )}

        <View
          style={[styles.infoRow, isRTL && styles.infoRowRtl]}
          accessibilityLabel={`${t("location.coordinates")}: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
        >
          <MaterialIcons name="my-location" size={18} color={colors.neutral[500]} />
          <Text style={[styles.infoText, isRTL && styles.textRtl]}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
        </View>
      </View>
    </View>
  )
}

export const LocationInfoPanel = memo(LocationInfoPanelImpl)

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
  },
  headerRtl: {
    flexDirection: "row-reverse",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.neutral[50],
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  badgesRowRtl: {
    flexDirection: "row-reverse",
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  providerText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    fontWeight: typography.fontWeight.medium,
  },
  section: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  infoRowRtl: {
    flexDirection: "row-reverse",
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.neutral[700],
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
})

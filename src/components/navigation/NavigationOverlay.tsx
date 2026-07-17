import { memo } from "react"
import { View, StyleSheet } from "react-native"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { DirectionIndicator } from "./DirectionIndicator"
import { NavigationPanel } from "./NavigationPanel"
import { LocationInfoPanel } from "./LocationInfoPanel"
import { NavigationError } from "./NavigationError"
import type { CompassDirection } from "@/hooks/useCompassDirection"
import type { LocationType, ServiceProvider } from "@/types"

type NavigationOverlayProps = {
  isActive: boolean
  isRecalculating: boolean
  direction: CompassDirection | null
  heading: number | null
  compassUnavailable: boolean
  remainingDistance: string
  eta: string
  navigationError: string | null
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
  provider: ServiceProvider | null
  onStart: () => void
  onStop: () => void
  onRefresh: () => void
  onRetryRoute: () => void
}

function NavigationOverlayImpl({
  isActive,
  isRecalculating,
  direction,
  heading,
  compassUnavailable,
  remainingDistance,
  eta,
  navigationError,
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
  onStart,
  onStop,
  onRefresh,
  onRetryRoute,
}: NavigationOverlayProps) {
  const { t } = useI18n()

  return (
    <View style={styles.container} accessibilityLabel={t("navigation.overlayAccessibility")}>
      {isActive && (
        <View style={styles.directionRow}>
          <DirectionIndicator
            direction={direction}
            heading={heading}
            compassUnavailable={compassUnavailable}
          />
        </View>
      )}

      {navigationError && (
        <NavigationError message={navigationError} onRetry={onRetryRoute} />
      )}

      <NavigationPanel
        isActive={isActive}
        isRecalculating={isRecalculating}
        remainingDistance={remainingDistance}
        eta={eta}
        onStart={onStart}
        onStop={onStop}
        onRefresh={onRefresh}
      />

      <LocationInfoPanel
        name={name}
        type={type}
        categoryName={categoryName}
        address={address}
        distanceFromUser={distanceFromUser}
        walkingTime={walkingTime}
        drivingTime={drivingTime}
        isOpen={isOpen}
        openingHoursText={openingHoursText}
        phone={phone}
        website={website}
        email={email}
        latitude={latitude}
        longitude={longitude}
        provider={provider}
      />
    </View>
  )
}

export const NavigationOverlay = memo(NavigationOverlayImpl)

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.neutral[50],
  },
  directionRow: {
    alignItems: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
})

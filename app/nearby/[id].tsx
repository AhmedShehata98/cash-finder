import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { View, Text, StyleSheet, ScrollView, Alert, BackHandler, Pressable, ActivityIndicator } from "react-native"
import { Stack, useLocalSearchParams, useNavigation, router } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"
import { useLocationDetail } from "@/hooks/useLocationDetail"
import { useLocation } from "@/hooks"
import { useNavigationTracking } from "@/hooks/useNavigationTracking"
import { useCompassDirection } from "@/hooks/useCompassDirection"
import { useRouteEstimates } from "@/hooks/useRouteEstimates"
import { useNavigationStore } from "@/store/navigation-store"
import { calculateRoute } from "@/services/routing.service"
import { SkeletonCard } from "@/components/SkeletonCard"
import { ErrorState } from "@/components/ErrorState"
import { HereMapView } from "@/components/navigation/HereMapView"
import { NavigationOverlay } from "@/components/navigation/NavigationOverlay"
import { ReportStatusSheet } from "@/features/reports/components/ReportStatusSheet"
import { ReliabilityDetails } from "@/features/reports/components/ReliabilityDetails"

export default function LocationDetailsScreen() {
  const { formatEta, formatRemainingDistance, t } = useI18n()
  const { id } = useLocalSearchParams<{ id: string }>()
  const navigation = useNavigation()
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false)
  const [isReportSubmitting, setIsReportSubmitting] = useState(false)

  const { data, isLoading, isError, error, refetch } = useLocationDetail(id)

  const {
    location: userLocation,
    stopLocationUpdates,
    refreshLocation,
  } = useLocation({ oneTime: true, enableHighAccuracy: true, autoStart: false })

  const isActive = useNavigationStore((s) => s.isActive)
  const destination = useNavigationStore((s) => s.destination)
  const storeRoute = useNavigationStore((s) => s.route)
  const transportMode = useNavigationStore((s) => s.transportMode)
  const remainingDistance = useNavigationStore((s) => s.remainingDistance)
  const remainingDuration = useNavigationStore((s) => s.remainingDuration)
  const isRecalculating = useNavigationStore((s) => s.isRecalculating)
  const navigationError = useNavigationStore((s) => s.navigationError)
  const startNavigation = useNavigationStore((s) => s.startNavigation)
  const stopNavigation = useNavigationStore((s) => s.stopNavigation)
  const setRoute = useNavigationStore((s) => s.setRoute)
  const updateRemaining = useNavigationStore((s) => s.updateRemaining)
  const setNavigationError = useNavigationStore((s) => s.setNavigationError)

  const {
    currentLocation,
    heading,
    compassUnavailable,
    permissionDenied,
    gpsUnavailable,
  } = useNavigationTracking()

  const userLatLng = useMemo(
    () => {
      const raw = currentLocation ?? userLocation
      if (!raw) return null
      return {
        latitude: Math.round(raw.latitude * 1e6) / 1e6,
        longitude: Math.round(raw.longitude * 1e6) / 1e6,
      }
    },
    [currentLocation, userLocation]
  )

  const destLatLng = useMemo(
    () =>
      destination
        ? { latitude: destination.latitude, longitude: destination.longitude }
        : null,
    [destination]
  )

  const { direction } = useCompassDirection(userLatLng, destLatLng, heading)

  const { walkingTime, drivingTime } = useRouteEstimates(
    isActive ? null : userLatLng,
    data ? { latitude: data.latitude, longitude: data.longitude } : null
  )

  const handleStartNavigation = useCallback(async () => {
    if (!data) return
    const origin = userLatLng ?? await refreshLocation()
    if (!origin) {
      Alert.alert(
        t("navigation.locationRequiredTitle"),
        t("navigation.locationRequiredMessage"),
        [{ text: t("common.ok") }]
      )
      return
    }
    startNavigation(data, "pedestrian")
  }, [data, refreshLocation, startNavigation, t, userLatLng])

  const handleStopNavigation = useCallback(() => {
    stopNavigation()
  }, [stopNavigation])

  const handleRefreshLocation = useCallback(() => {
    stopLocationUpdates()
    void refreshLocation()
  }, [refreshLocation, stopLocationUpdates])

  const handleRetryRoute = useCallback(() => {
    if (!userLatLng || !destination) return
    setNavigationError(null)
    calculateRoute(
      userLatLng,
      { latitude: destination.latitude, longitude: destination.longitude },
      transportMode ?? "pedestrian"
    )
      .then((result) => {
        setRoute(result.legs)
        updateRemaining(result.totalDistance, result.totalDuration)
      })
      .catch((err) => {
        setNavigationError(
          err instanceof Error ? err.message : t("navigation.errorRouteFallback")
        )
      })
  }, [destination, setNavigationError, setRoute, t, transportMode, updateRemaining, userLatLng])

  const handleOpenReportSheet = useCallback(() => {
    if (!data) return
    setIsReportSheetOpen(true)
  }, [data])

  useEffect(() => {
    if (!isActive) return

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(
        t("navigation.stopPromptTitle"),
        t("navigation.stopPromptMessage"),
        [
          {
            text: t("navigation.continue"),
            style: "cancel",
            onPress: () => {},
          },
          {
            text: t("navigation.stopAndLeave"),
            style: "destructive",
            onPress: () => {
              stopNavigation()
              router.back()
            },
          },
        ]
      )
      return true
    })

    return () => backHandler.remove()
  }, [isActive, stopNavigation, t])

  useEffect(() => {
    if (!isActive) return

    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (e.data.action.type === "GOBACK" || e.data.action.type === "POP") {
        e.preventDefault()
      } else {
        return
      }

      Alert.alert(
        t("navigation.stopPromptTitle"),
        t("navigation.stopPromptMessage"),
        [
          {
            text: t("navigation.continue"),
            style: "cancel",
            onPress: () => {},
          },
          {
            text: t("navigation.stopAndLeave"),
            style: "destructive",
            onPress: () => {
              stopNavigation()
              navigation.dispatch(e.data.action)
            },
          },
        ]
      )
    })

    return unsubscribe
  }, [isActive, navigation, stopNavigation, t])

  const cleanupRef = useRef({ stopLocationUpdates, stopNavigation, isActive })
  cleanupRef.current = { stopLocationUpdates, stopNavigation, isActive }

  useEffect(() => {
    return () => {
      const { stopLocationUpdates: stopLoc, stopNavigation: stopNav, isActive: active } =
        cleanupRef.current
      stopLoc()
      if (active) stopNav()
    }
  }, [])

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t("headers.locationDetails"), headerBackTitle: t("common.back") }} />
        <SkeletonCard count={3} />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t("headers.locationDetails"), headerBackTitle: t("common.back") }} />
        <ErrorState
          message={
            error?.message ||
            t("discover.errorMessageNearby")
          }
          onRetry={refetch}
        />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t("headers.locationDetails"), headerBackTitle: t("common.back") }} />
        <ErrorState
          message={t("location.notFound")}
          onRetry={refetch}
        />
      </View>
    )
  }

  const openingHoursText = data.openingHours?.flatMap((oh) => oh.text) ?? null

  return (
    <View style={styles.container} accessibilityLabel={t("location.detailsAccessibility", { name: data.name })}>
      <Stack.Screen
        options={{
          title: isActive ? t("headers.navigation") : t("headers.locationDetails"),
          headerBackTitle: isActive ? undefined : t("common.back"),
          headerBackButtonMenuEnabled: false,
        }}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <HereMapView
          destination={permissionDenied && !userLatLng ? data : (destination ?? data)}
          userLocation={userLatLng}
          route={isActive ? storeRoute : null}
          isActive={isActive}
          heading={heading}
        />

        {!isActive && <ReliabilityDetails serviceId={data.id} />}

        {(gpsUnavailable || permissionDenied || compassUnavailable) && isActive && (
          <View style={styles.warningBanner}>
            <MaterialIcons
              name={
                permissionDenied
                  ? "location-off"
                  : gpsUnavailable
                  ? "gps-off"
                  : "explore-off"
              }
              size={18}
              color={colors.warning[700]}
            />
            <Text style={styles.warningText}>
              {permissionDenied
                ? t("navigation.warningPermissionDenied")
                : gpsUnavailable
                ? t("navigation.warningGpsLost")
                : t("navigation.warningCompassUnavailable")}
            </Text>
          </View>
        )}

        <NavigationOverlay
          isActive={isActive}
          isRecalculating={isRecalculating}
          direction={direction}
          heading={heading}
          compassUnavailable={compassUnavailable}
          remainingDistance={formatRemainingDistance(
            isActive ? remainingDistance : data.distanceFromUser
          )}
          eta={isActive ? formatEta(remainingDuration) : (walkingTime ?? t("misc.unavailable"))}
          navigationError={navigationError}
          name={data.name}
          type={data.type}
          categoryName={data.category?.name ?? null}
          address={data.address}
          distanceFromUser={data.distanceFromUser}
          walkingTime={walkingTime}
          drivingTime={drivingTime}
          isOpen={data.isOpen}
          openingHoursText={openingHoursText}
          phone={data.phone}
          website={data.website}
          email={data.email}
          latitude={data.latitude}
          longitude={data.longitude}
          provider={data.provider}
          onStart={handleStartNavigation}
          onStop={handleStopNavigation}
          onRefresh={handleRefreshLocation}
          onRetryRoute={handleRetryRoute}
        />

        {!isActive && (
          <View style={styles.reportContainer}>
            <Pressable
              style={({ pressed }) => [styles.reportButton, pressed && styles.reportButtonPressed]}
              onPress={handleOpenReportSheet}
              disabled={isReportSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t("report.button")}
              accessibilityState={{ disabled: isReportSubmitting, busy: isReportSubmitting }}
            >
              {isReportSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <MaterialIcons name="fact-check" size={20} color={colors.white} />
              )}
              <Text style={styles.reportButtonText}>
                {isReportSubmitting ? t("report.submitting") : t("report.button")}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ReportStatusSheet
        isOpen={isReportSheetOpen}
        location={data}
        onClose={() => setIsReportSheetOpen(false)}
        onSubmissionStateChange={setIsReportSubmitting}
        onSubmitted={() => void refetch()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warning[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning[100],
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warning[700],
    fontWeight: typography.fontWeight.medium,
  },
  reportContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.neutral[50],
  },
  reportButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  reportButtonPressed: {
    opacity: 0.9,
  },
  reportButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
})

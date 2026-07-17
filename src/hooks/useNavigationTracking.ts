import { useEffect, useRef, useState, useCallback } from "react"
import * as Location from "expo-location"
import { useNavigationStore } from "@/store/navigation-store"
import { calculateHereRoute, type RouteLeg } from "@/services/places/here-maps/routing"

type LatLng = { latitude: number; longitude: number }

export type NavigationTrackingResult = {
  currentLocation: LatLng | null
  heading: number | null
  permissionDenied: boolean
  gpsUnavailable: boolean
  compassUnavailable: boolean
}

const ROUTE_REFRESH_INTERVAL_MS = 5000
const DEVIATION_THRESHOLD_M = 50
const POSITION_EPSILON_M = 1.5
const HEADING_STEP_DEG = 2

function pointDistanceFromRoute(point: LatLng, route: RouteLeg[] | null): number {
  if (!route) return Infinity

  let minDist = Infinity

  for (const leg of route) {
    for (let i = 0; i < leg.coordinates.length - 1; i++) {
      const a = leg.coordinates[i]
      if (!a) continue
      const b = leg.coordinates[i + 1]
      if (!b) continue
      const d = distanceToSegment(point, a, b)
      if (d < minDist) minDist = d
    }
    if (leg.coordinates.length === 1) {
      const single = leg.coordinates[0]
      if (single) {
        const d = Math.sqrt(
          Math.pow(point.latitude - single.latitude, 2) +
            Math.pow(point.longitude - single.longitude, 2)
        ) * 111000
        if (d < minDist) minDist = d
      }
    }
  }

  return minDist
}

function distanceToSegment(p: LatLng, a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const perpRad = (deg: number) => (deg * Math.PI) / 180

  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const latP = toRad(p.latitude)

  const dx = (perpRad(b.longitude) - perpRad(a.longitude)) * Math.cos(lat1)
  const dy = lat2 - lat1
  const segLen = Math.sqrt(dx * dx + dy * dy)

  const t =
    segLen === 0
      ? 0
      : ((perpRad(p.longitude) - perpRad(a.longitude)) * Math.cos(lat1) * dx +
          (latP - lat1) * dy) /
        (segLen * segLen)

  const clamped = Math.max(0, Math.min(1, t))
  const segLat = lat1 + clamped * (lat2 - lat1)
  const segLng = perpRad(a.longitude) + clamped * (perpRad(b.longitude) - perpRad(a.longitude))

  const dLat = latP - segLat
  const dLng = perpRad(p.longitude) - segLng
  const distRad = Math.sqrt(dLat * dLat + dLng * dLng * Math.cos(latP) * Math.cos(latP))

  return distRad * 6371000
}

export function useNavigationTracking(): NavigationTrackingResult {
  const isActive = useNavigationStore((s) => s.isActive)
  const destination = useNavigationStore((s) => s.destination)
  const route = useNavigationStore((s) => s.route)
  const transportMode = useNavigationStore((s) => s.transportMode)
  const setRoute = useNavigationStore((s) => s.setRoute)
  const updateRemaining = useNavigationStore((s) => s.updateRemaining)
  const setRecalculating = useNavigationStore((s) => s.setRecalculating)
  const setNavigationError = useNavigationStore((s) => s.setNavigationError)

  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [gpsUnavailable, setGpsUnavailable] = useState(false)
  const [compassUnavailable, setCompassUnavailable] = useState(false)

  const positionSubRef = useRef<Location.LocationSubscription | null>(null)
  const headingSubRef = useRef<Location.LocationSubscription | null>(null)
  const lastRecalcRef = useRef<number>(0)
  const lastPosRef = useRef<LatLng | null>(null)
  const lastHeadingRef = useRef<number | null>(null)
  const headingFromGpsRef = useRef(false)
  const destinationRef = useRef(destination)
  const transportModeRef = useRef(transportMode)
  const routeRef = useRef<RouteLeg[] | null>(null)

  destinationRef.current = destination
  transportModeRef.current = transportMode

  useEffect(() => {
    routeRef.current = route
  }, [route])

  const fetchRoute = useCallback(
    async (origin: LatLng, dest: LatLng, mode: "pedestrian" | "car") => {
      try {
        setRecalculating(true)
        setNavigationError(null)
        const result = await calculateHereRoute(origin, dest, mode)
        setRoute(result.legs)
        updateRemaining(result.totalDistance, result.totalDuration)
      } catch (err) {
        setNavigationError(
          err instanceof Error ? err.message : "Unable to calculate route"
        )
      } finally {
        setRecalculating(false)
      }
    },
    [setRoute, updateRemaining, setNavigationError, setRecalculating]
  )

  const checkDeviation = useCallback(
    (pos: LatLng) => {
      if (!destinationRef.current || !transportModeRef.current) return

      const now = Date.now()
      const distFromRoute = pointDistanceFromRoute(pos, routeRef.current)

      const shouldRecalculate =
        distFromRoute > DEVIATION_THRESHOLD_M &&
        now - lastRecalcRef.current > ROUTE_REFRESH_INTERVAL_MS

      if (shouldRecalculate) {
        lastRecalcRef.current = now
        void fetchRoute(pos, destinationRef.current, transportModeRef.current)
      }
    },
    [fetchRoute]
  )

  const updateRemainingFromRoute = useCallback(
    (pos: LatLng) => {
      const route = routeRef.current
      if (!route) return
      let remainingDistance = 0
      let remainingDuration = 0
      let foundClosest = false

      for (const leg of route) {
        let legMinDist = Infinity
        let legMinIndex = 0

        for (let i = 0; i < leg.coordinates.length; i++) {
          const coord = leg.coordinates[i]
          if (!coord) continue
          const d = Math.sqrt(
            Math.pow(pos.latitude - coord.latitude, 2) +
              Math.pow(pos.longitude - coord.longitude, 2)
          ) * 111000
          if (d < legMinDist) {
            legMinDist = d
            legMinIndex = i
          }
        }

        if (!foundClosest) {
          remainingDistance = 0
          remainingDuration = 0
          foundClosest = true
        }

        for (let i = legMinIndex; i < leg.coordinates.length - 1; i++) {
          const a = leg.coordinates[i]
          const b = leg.coordinates[i + 1]
          if (!a || !b) continue
          const segLen = Math.sqrt(
            Math.pow(b.latitude - a.latitude, 2) +
              Math.pow(b.longitude - a.longitude, 2)
          ) * 111000
          remainingDistance += segLen
        }
        remainingDuration += leg.duration
      }

      updateRemaining(remainingDistance, remainingDuration)
    },
    [updateRemaining]
  )

  const applyPosition = useCallback((pos: LatLng) => {
    const last = lastPosRef.current
    if (last) {
      const movedM =
        Math.sqrt(
          Math.pow(pos.latitude - last.latitude, 2) +
            Math.pow(pos.longitude - last.longitude, 2)
        ) * 111000
      if (movedM < POSITION_EPSILON_M) return
    }
    lastPosRef.current = pos
    setCurrentLocation(pos)
  }, [])

  const applyHeading = useCallback((raw: number) => {
    const rounded = Math.round(raw / HEADING_STEP_DEG) * HEADING_STEP_DEG
    if (lastHeadingRef.current === rounded) return
    lastHeadingRef.current = rounded
    setHeading(rounded)
  }, [])

  useEffect(() => {
    if (!isActive || !destination) {
      return
    }

    let isMounted = true

    const startTracking = async () => {
      try {
        setPermissionDenied(false)
        setGpsUnavailable(false)

        const servicesEnabled = await Location.hasServicesEnabledAsync()
        if (!servicesEnabled) {
          setGpsUnavailable(true)
          return
        }

        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== Location.PermissionStatus.GRANTED) {
          setPermissionDenied(true)
          return
        }

        const initialPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        })

        if (!isMounted) return
        const origin: LatLng = {
          latitude: initialPosition.coords.latitude,
          longitude: initialPosition.coords.longitude,
        }
        applyPosition(origin)

        if (destinationRef.current && transportModeRef.current) {
          await fetchRoute(origin, destinationRef.current, transportModeRef.current)
        }

        positionSubRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (loc) => {
            if (!isMounted) return
            const pos: LatLng = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            }
            applyPosition(pos)
            if (loc.coords.heading !== null && loc.coords.heading !== undefined && loc.coords.heading >= 0) {
              headingFromGpsRef.current = true
              applyHeading(loc.coords.heading)
              setCompassUnavailable(false)
            }
            updateRemainingFromRoute(pos)
            checkDeviation(pos)
          }
        )

        try {
          headingSubRef.current = await Location.watchHeadingAsync((headingObj) => {
            if (!isMounted) return
            if (headingObj.trueHeading >= 0) {
              applyHeading(headingObj.trueHeading)
              setCompassUnavailable(false)
            } else if (headingObj.magHeading >= 0) {
              applyHeading(headingObj.magHeading)
              setCompassUnavailable(false)
            } else {
              setCompassUnavailable(true)
            }
          })
        } catch {
          if (isMounted && !headingFromGpsRef.current) {
            setCompassUnavailable(true)
          }
        }
      } catch {
        if (isMounted) setGpsUnavailable(true)
      }
    }

    void startTracking()

    return () => {
      isMounted = false
      lastPosRef.current = null
      lastHeadingRef.current = null
      positionSubRef.current?.remove()
      positionSubRef.current = null
      headingSubRef.current?.remove()
      headingSubRef.current = null
    }
  }, [isActive, destination, fetchRoute, checkDeviation, updateRemainingFromRoute, applyPosition, applyHeading])

  return {
    currentLocation,
    heading,
    permissionDenied,
    gpsUnavailable,
    compassUnavailable,
  }
}
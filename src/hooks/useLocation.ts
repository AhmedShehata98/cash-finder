/**
 * useLocation Hook
 *
 * A global hook for retrieving geolocation data with flexible options.
 *
 * @example
 * // One-time location fetch
 * const { location, loading, error } = useLocation({ oneTime: true })
 *
 * @example
 * // Continuous updates every 5 seconds
 * const { location, stopLocationUpdates } = useLocation({ interval: 5000 })
 *
 * @example
 * // Low accuracy for battery saving
 * const { location } = useLocation({ enableHighAccuracy: false, interval: 10000 })
 */

import { useState, useEffect, useCallback, useRef } from "react"
import * as Location from "expo-location"

type LocationData = {
  latitude: number
  longitude: number
  accuracy: number | null
  altitude: number | null
  altitudeAccuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

type UseLocationOptions = {
  enableHighAccuracy?: boolean
  interval?: number
  distanceInterval?: number
  oneTime?: boolean
  autoStart?: boolean
}

type UseLocationReturn = {
  location: LocationData | null
  loading: boolean
  error: string | null
  stopLocationUpdates: () => void
  refreshLocation: () => Promise<LocationData | null>
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    enableHighAccuracy = true,
    interval,
    distanceInterval = 0,
    oneTime = false,
    autoStart = true,
  } = options

  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null)
  const isMountedRef = useRef(true)

  const mapLocationData = useCallback((currentLocation: Location.LocationObject): LocationData => {
    return {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      accuracy: currentLocation.coords.accuracy,
      altitude: currentLocation.coords.altitude,
      altitudeAccuracy: currentLocation.coords.altitudeAccuracy,
      heading: currentLocation.coords.heading,
      speed: currentLocation.coords.speed,
      timestamp: currentLocation.timestamp,
    }
  }, [])

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error("Location permission denied")
    }
  }, [])

  const readCurrentLocation = useCallback(async () => {
    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: enableHighAccuracy
        ? Location.Accuracy.High
        : Location.Accuracy.Balanced,
    })

    return mapLocationData(currentLocation)
  }, [enableHighAccuracy, mapLocationData])

  const getLocation = useCallback(
    async ({ showLoader = false }: { showLoader?: boolean } = {}): Promise<LocationData | null> => {
      try {
        if (showLoader && isMountedRef.current) {
          setLoading(true)
        }

        setError(null)
        await requestPermission()

        const nextLocation = await readCurrentLocation()

        if (isMountedRef.current) {
          setLocation(nextLocation)
          setLoading(false)
        }

        return nextLocation
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to get location")
          setLoading(false)
        }

        return null
      }
    },
    [readCurrentLocation, requestPermission]
  )

  const stopLocationUpdates = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove()
      subscriptionRef.current = null
    }

    if (isMountedRef.current) {
      setLoading(false)
    }
  }, [])

  const refreshLocation = useCallback(async () => {
    return getLocation()
  }, [getLocation])

  useEffect(() => {
    isMountedRef.current = true

    if (!autoStart) {
      setLoading(false)
      return () => {
        isMountedRef.current = false
        stopLocationUpdates()
      }
    }

    const startLocationUpdates = async () => {
      try {
        setError(null)
        setLoading(true)
        await requestPermission()

        if (oneTime || !interval) {
          const nextLocation = await readCurrentLocation()

          if (isMountedRef.current) {
            setLocation(nextLocation)
            setLoading(false)
          }

          return
        }

        const nextLocation = await readCurrentLocation()

        if (isMountedRef.current) {
          setLocation(nextLocation)
          setLoading(false)
        }

        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: enableHighAccuracy
              ? Location.Accuracy.High
              : Location.Accuracy.Balanced,
            distanceInterval,
            timeInterval: interval,
          },
          (currentLocation) => {
            if (isMountedRef.current) {
              setLocation(mapLocationData(currentLocation))
              setLoading(false)
            }
          }
        )
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to get location")
          setLoading(false)
        }
      }
    }

    startLocationUpdates()

    return () => {
      isMountedRef.current = false
      stopLocationUpdates()
    }
  }, [autoStart, distanceInterval, enableHighAccuracy, interval, oneTime, mapLocationData, readCurrentLocation, requestPermission, stopLocationUpdates])

  return {
    location,
    loading,
    error,
    stopLocationUpdates,
    refreshLocation,
  }
}

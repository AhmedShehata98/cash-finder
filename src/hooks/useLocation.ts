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
  oneTime?: boolean
}

type UseLocationReturn = {
  location: LocationData | null
  loading: boolean
  error: string | null
  stopLocationUpdates: () => void
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const { enableHighAccuracy = true, interval, oneTime = false } = options

  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null)
  const isMountedRef = useRef(true)

  const stopLocationUpdates = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove()
      subscriptionRef.current = null
    }

    if (isMountedRef.current) {
      setLoading(false)
    }
  }, [])

  const getLocation = useCallback(async () => {
    try {
      setError(null)

      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== Location.PermissionStatus.GRANTED) {
        throw new Error("Location permission denied")
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: enableHighAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
      })

      if (isMountedRef.current) {
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          altitude: currentLocation.coords.altitude,
          altitudeAccuracy: currentLocation.coords.altitudeAccuracy,
          heading: currentLocation.coords.heading,
          speed: currentLocation.coords.speed,
          timestamp: currentLocation.timestamp,
        })
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to get location")
        setLoading(false)
      }
    }
  }, [enableHighAccuracy])

  useEffect(() => {
    isMountedRef.current = true

    const startLocationUpdates = async () => {
      try {
        setError(null)
        setLoading(true)

        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status !== Location.PermissionStatus.GRANTED) {
          throw new Error("Location permission denied")
        }

        if (oneTime || !interval) {
          await getLocation()
          return
        }

        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: enableHighAccuracy
              ? Location.Accuracy.High
              : Location.Accuracy.Balanced,
            distanceInterval: 0,
            timeInterval: interval,
          },
          (currentLocation) => {
            if (isMountedRef.current) {
              setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy,
                altitude: currentLocation.coords.altitude,
                altitudeAccuracy: currentLocation.coords.altitudeAccuracy,
                heading: currentLocation.coords.heading,
                speed: currentLocation.coords.speed,
                timestamp: currentLocation.timestamp,
              })
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
  }, [enableHighAccuracy, interval, oneTime, getLocation, stopLocationUpdates])

  return {
    location,
    loading,
    error,
    stopLocationUpdates,
  }
}

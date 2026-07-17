import { useState, useEffect } from "react"
import { calculateHereRoute, type TransportMode } from "@/services/places/here-maps/routing"

type LatLng = { latitude: number; longitude: number }

type RouteEstimates = {
  walkingTime: string | null
  drivingTime: string | null
  loading: boolean
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return "<1 min"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function useRouteEstimates(
  origin: LatLng | null,
  destination: LatLng | null
): RouteEstimates {
  const [walkingTime, setWalkingTime] = useState<string | null>(null)
  const [drivingTime, setDrivingTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!origin || !destination) {
      setWalkingTime(null)
      setDrivingTime(null)
      return
    }

    let isMounted = true
    setLoading(true)

    const fetchEstimates = async () => {
      try {
        const [walk, drive] = await Promise.allSettled([
          calculateHereRoute(origin, destination, "pedestrian" as TransportMode),
          calculateHereRoute(origin, destination, "car" as TransportMode),
        ])

        if (!isMounted) return

        if (walk.status === "fulfilled") {
          setWalkingTime(formatDuration(walk.value.totalDuration))
        }
        if (drive.status === "fulfilled") {
          setDrivingTime(formatDuration(drive.value.totalDuration))
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void fetchEstimates()

    return () => {
      isMounted = false
    }
  }, [origin, destination])

  return { walkingTime, drivingTime, loading }
}
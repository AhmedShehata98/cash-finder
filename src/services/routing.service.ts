import { decodeHerePolyline } from "@/services/places/here-maps/polyline"
import { calculateSupabaseRoute } from "@/services/supabase/financial-services.repository"

type LatLng = { latitude: number; longitude: number }

export type RouteLeg = {
  coordinates: LatLng[]
  distance: number
  duration: number
  transportMode: string
}

export type RoutingResult = {
  legs: RouteLeg[]
  totalDistance: number
  totalDuration: number
}

export type TransportMode = "pedestrian" | "car"

export async function calculateRoute(
  origin: LatLng,
  destination: LatLng,
  transportMode: TransportMode
): Promise<RoutingResult> {
  const route = await calculateSupabaseRoute(origin, destination, transportMode)
  const legs = route.legs.map((leg) => ({
    coordinates: decodeHerePolyline(leg.polyline),
    distance: leg.distance,
    duration: leg.duration,
    transportMode: leg.transportMode,
  }))

  return {
    legs,
    totalDistance: legs.reduce((sum, leg) => sum + leg.distance, 0),
    totalDuration: legs.reduce((sum, leg) => sum + leg.duration, 0),
  }
}

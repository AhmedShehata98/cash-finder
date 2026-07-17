import { hereMapsConfig } from "./config"
import { decodeHerePolyline } from "./polyline"
import type { HereMapsRoutingResponse } from "./types"

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

const ROUTING_BASE_URL = "https://router.hereapi.com/v8"

export async function calculateHereRoute(
  origin: LatLng,
  destination: LatLng,
  transportMode: TransportMode
): Promise<RoutingResult> {
  const url = new URL(`${ROUTING_BASE_URL}/routes`)

  url.searchParams.set("transportMode", transportMode)
  url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`)
  url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`)
  url.searchParams.set("return", "polyline,summary")
  url.searchParams.set("apiKey", hereMapsConfig.apiKey)

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`HERE Routing API error: ${response.status} ${response.statusText}`)
  }

  const data: HereMapsRoutingResponse = await response.json()

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No route found")
  }

  const route = data.routes[0]
  if (!route) {
    throw new Error("No route found")
  }

  const legs: RouteLeg[] = route.sections.map((section) => ({
    coordinates: decodeHerePolyline(section.polyline),
    distance: section.summary.length,
    duration: section.summary.duration,
    transportMode: section.transportMode,
  }))

  const totalDistance = legs.reduce((sum, leg) => sum + leg.distance, 0)
  const totalDuration = legs.reduce((sum, leg) => sum + leg.duration, 0)

  return { legs, totalDistance, totalDuration }
}
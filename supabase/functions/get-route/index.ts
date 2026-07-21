/* global Deno */
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"

const ROUTING_BASE_URL = "https://router.hereapi.com/v8/routes"
const transportModes = new Set(["pedestrian", "car"])

function readPoint(value: unknown, name: string) {
  if (!value || typeof value !== "object") throw new Error(`${name.toUpperCase()}_INVALID`)
  const point = value as { latitude?: unknown; longitude?: unknown }
  if (typeof point.latitude !== "number" || typeof point.longitude !== "number") {
    throw new Error(`${name.toUpperCase()}_INVALID`)
  }
  return point as { latitude: number; longitude: number }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405)

  try {
    const apiKey = Deno.env.get("HERE_API_KEY")
    if (!apiKey) throw new Error("HERE_API_KEY_MISSING")

    const body = await request.json()
    const origin = readPoint(body.origin, "origin")
    const destination = readPoint(body.destination, "destination")
    const transportMode = typeof body.transportMode === "string" && transportModes.has(body.transportMode)
      ? body.transportMode
      : "pedestrian"

    const url = new URL(ROUTING_BASE_URL)
    url.searchParams.set("transportMode", transportMode)
    url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`)
    url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`)
    url.searchParams.set("return", "polyline,summary")
    url.searchParams.set("apiKey", apiKey)

    const response = await fetch(url)
    if (!response.ok) throw new Error(`HERE_ROUTING_FAILED_${response.status}`)

    const bodyJson = await response.json()
    const route = bodyJson.routes?.[0]
    if (!route) throw new Error("ROUTE_NOT_FOUND")

    const sections = route.sections ?? []
    return jsonResponse({
      legs: sections.map((section: any) => ({
        polyline: section.polyline,
        distance: section.summary?.length ?? 0,
        duration: section.summary?.duration ?? 0,
        transportMode: section.transportMode ?? transportMode,
      })),
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "UNKNOWN_ERROR" }, 400)
  }
})

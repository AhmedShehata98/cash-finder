import { useMemo } from "react"
import type { MaterialIcons } from "@expo/vector-icons"
import { calculateDistance } from "@/services/location.service"

type LatLng = { latitude: number; longitude: number }

export type DirectionId =
  | "straight"
  | "front-right"
  | "right"
  | "back-right"
  | "behind"
  | "back-left"
  | "left"
  | "front-left"

export type CompassDirection = {
  directionId: DirectionId
  directionText: string
  directionIcon: keyof typeof MaterialIcons.glyphMap
  bearing: number
  relativeAngle: number
}

const DIRECTIONS: { id: DirectionId; text: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: "straight", text: "Straight Ahead", icon: "navigation" },
  { id: "front-right", text: "Front Right", icon: "navigation" },
  { id: "right", text: "Right", icon: "navigation" },
  { id: "back-right", text: "Back Right", icon: "navigation" },
  { id: "behind", text: "Behind", icon: "navigation" },
  { id: "back-left", text: "Back Left", icon: "navigation" },
  { id: "left", text: "Left", icon: "navigation" },
  { id: "front-left", text: "Front Left", icon: "navigation" },
]

function computeBearing(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI

  const φ1 = toRad(from.latitude)
  const φ2 = toRad(to.latitude)
  const Δλ = toRad(to.longitude - from.longitude)

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)

  const bearing = toDeg(Math.atan2(y, x))
  return (bearing + 360) % 360
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function getDirectionIndex(relativeAngle: number): number {
  const sector = Math.round(normalizeAngle(relativeAngle) / 45) % 8
  return sector
}

export function useCompassDirection(
  userLocation: LatLng | null,
  destination: LatLng | null,
  heading: number | null
): { direction: CompassDirection | null; distance: number } {
  return useMemo(() => {
    if (!userLocation || !destination) {
      return { direction: null, distance: 0 }
    }

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      destination.latitude,
      destination.longitude
    )

    const effectiveHeading = heading ?? 0
    const bearing = computeBearing(userLocation, destination)
    const relativeAngle = normalizeAngle(bearing - effectiveHeading)
    const index = getDirectionIndex(relativeAngle)
    const dir = DIRECTIONS[index]

    if (!dir) {
      return { direction: null, distance }
    }

    return {
      direction: {
        directionId: dir.id,
        directionText: dir.text,
        directionIcon: dir.icon,
        bearing,
        relativeAngle: Math.round(relativeAngle / 5) * 5,
      },
      distance,
    }
  }, [userLocation, destination, heading])
}
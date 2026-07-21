import type { ComponentProps } from "react"
import { MaterialIcons } from "@expo/vector-icons"

type MaterialName = ComponentProps<typeof MaterialIcons>["name"]
export type BadgeIconKey =
  | "sparkles"
  | "map-pin"
  | "shield-check"
  | "award"
  | "refresh"
  | "flame"
  | "compass"
  | "wallet"
  | "badge-check"
  | "crown"
type BadgeIconConfig = { name: MaterialName; accessibilityLabel: string }

const fallback: BadgeIconConfig = { name: "emoji-events", accessibilityLabel: "Achievement badge" }
const badgeIcons: Record<BadgeIconKey, BadgeIconConfig> = {
  sparkles: { name: "auto-awesome", accessibilityLabel: "First contribution badge" },
  "map-pin": { name: "place", accessibilityLabel: "Local helper badge" },
  "shield-check": { name: "verified-user", accessibilityLabel: "Trusted reporter badge" },
  award: fallback,
  refresh: { name: "refresh", accessibilityLabel: "Fresh data badge" },
  flame: { name: "local-fire-department", accessibilityLabel: "Contribution streak badge" },
  compass: { name: "explore", accessibilityLabel: "ATM explorer badge" },
  wallet: {
    name: "account-balance-wallet",
    accessibilityLabel: "Financial services explorer badge",
  },
  "badge-check": { name: "verified", accessibilityLabel: "Verified contributor badge" },
  crown: { name: "military-tech", accessibilityLabel: "Top contributor badge" },
}

export function resolveBadgeIcon(iconKey: string): BadgeIconConfig {
  if (iconKey in badgeIcons) return badgeIcons[iconKey as BadgeIconKey]
  if (process.env.NODE_ENV !== "production") console.warn(`Unknown badge icon key: ${iconKey}`)
  return fallback
}

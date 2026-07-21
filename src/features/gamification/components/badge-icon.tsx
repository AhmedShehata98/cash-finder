import { MaterialIcons } from "@expo/vector-icons"
import { colors } from "@/theme"
import { resolveBadgeIcon } from "../constants/badge-icons"

export function BadgeIcon({
  iconKey,
  unlocked,
  size = 34,
}: {
  iconKey: string
  unlocked: boolean
  size?: number
}) {
  const config = resolveBadgeIcon(iconKey)
  return (
    <MaterialIcons
      name={config.name}
      size={size}
      color={unlocked ? colors.warning[700] : colors.neutral[500]}
      accessibilityLabel={config.accessibilityLabel}
    />
  )
}

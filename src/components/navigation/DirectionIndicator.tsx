import { memo, useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { spacing } from "@/theme"
import { typography } from "@/theme"
import type { CompassDirection } from "@/hooks/useCompassDirection"

type DirectionIndicatorProps = {
  direction: CompassDirection | null
  heading: number | null
  compassUnavailable: boolean
}

function DirectionIndicatorImpl({
  direction,
  heading,
  compassUnavailable,
}: DirectionIndicatorProps) {
  const { getDirectionLabel, isRTL, t } = useI18n()
  const rotateAnim = useRef(new Animated.Value(0)).current
  const compassRotateAnim = useRef(new Animated.Value(0)).current
  const lastRelativeAngleRef = useRef<number | null>(null)
  const lastHeadingRef = useRef<number | null>(null)

  useEffect(() => {
    if (!direction) return
    if (lastRelativeAngleRef.current === direction.relativeAngle) return
    lastRelativeAngleRef.current = direction.relativeAngle

    Animated.timing(rotateAnim, {
      toValue: direction.relativeAngle,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [direction, rotateAnim])

  useEffect(() => {
    if (heading === null) return
    if (lastHeadingRef.current === heading) return
    lastHeadingRef.current = heading

    Animated.timing(compassRotateAnim, {
      toValue: -heading,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [heading, compassRotateAnim])

  const compassRotate = compassRotateAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ["-360deg", "0deg", "360deg"],
  })

  const arrowRotate = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  })

  if (compassUnavailable) {
    return (
      <View style={styles.container} accessibilityLabel={t("navigation.compassUnavailable")}>
        <View style={styles.compassUnavailable}>
          <MaterialIcons name="explore-off" size={24} color={colors.neutral[500]} />
          <Text style={[styles.compassUnavailableText, isRTL && styles.textRtl]}>
            {t("navigation.compassUnavailable")}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container} accessibilityLabel={t("navigation.overlayAccessibility")}>
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.compassRing,
            {
              transform: [{ rotate: compassRotate }],
            },
          ]}
        >
          <Text style={styles.compassNorth}>N</Text>
          <Text style={styles.compassSouth}>S</Text>
          <Text style={styles.compassEast}>E</Text>
          <Text style={styles.compassWest}>W</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.arrowContainer,
            {
              transform: [{ rotate: arrowRotate }],
            },
          ]}
        >
          <MaterialIcons name="navigation" size={36} color={colors.primary[600]} />
        </Animated.View>
      </View>

      {direction && (
        <Text
          style={[styles.directionText, isRTL && styles.textRtl]}
          accessibilityLabel={t("navigation.directionAccessibility", {
            direction: getDirectionLabel(direction.directionId),
          })}
        >
          {getDirectionLabel(direction.directionId)}
        </Text>
      )}
    </View>
  )
}

export const DirectionIndicator = memo(DirectionIndicatorImpl)

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  compassRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  compassNorth: {
    position: "absolute",
    top: 2,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.error[600],
  },
  compassSouth: {
    position: "absolute",
    bottom: 2,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[600],
  },
  compassEast: {
    position: "absolute",
    right: 2,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[600],
  },
  compassWest: {
    position: "absolute",
    left: 2,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[600],
  },
  arrowContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary[200],
  },
  directionText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
  },
  compassUnavailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  compassUnavailableText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
})

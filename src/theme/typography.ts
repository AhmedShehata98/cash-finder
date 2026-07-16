import { Platform } from "react-native"

const fontFamily = Platform.select({
  ios: "System",
  android: "Roboto",
  default: "System",
})

export const typography = {
  fontFamily: {
    regular: fontFamily,
    medium: fontFamily,
    bold: fontFamily,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const

export type Typography = typeof typography

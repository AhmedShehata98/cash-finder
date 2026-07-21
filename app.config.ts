import { ExpoConfig, ConfigContext } from "expo/config"
import authConfig from "./auth.config.json"

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Cash Finder",
  slug: "cash-finder",
  version: "1.5.0",
  owner: "ahmedshehata",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: authConfig.appScheme,
  userInterfaceStyle: "automatic",
  extra: {
    appEnv: process.env.APP_ENV || "development",
    eas: {
      projectId: "47a287aa-f6b4-49bc-8396-2df75fa99853",
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.cashfinder.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Cash Finder needs access to your location to show nearby places and help you navigate.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Cash Finder needs access to your location to provide location-based features even when the app is in the background.",
      NSLocationAlwaysUsageDescription:
        "Cash Finder needs access to your location to provide location-based features even when the app is in the background.",
      NSLocationUsageDescription:
        "Cash Finder needs access to your location to show nearby places and help you navigate.",
      NSMotionUsageDescription:
        "Cash Finder uses motion sensors to improve location accuracy and provide compass features.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    package: "com.cashfinder.app",
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
    ],
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-localization",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow Cash Finder to use your location to show nearby places and provide navigation.",
        locationAlwaysPermission:
          "Allow Cash Finder to use your location in the background for location-based features.",
        locationWhenInUsePermission:
          "Allow Cash Finder to use your location to show nearby places and provide navigation.",
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    "expo-secure-store",
  ],
  experiments: {
    typedRoutes: true,
  },
})

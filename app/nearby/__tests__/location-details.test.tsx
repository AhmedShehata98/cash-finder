import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { Alert } from "react-native"
import { act, fireEvent, render } from "@testing-library/react-native"
import LocationDetailsScreen from "../[id]"
import { FinancialServiceType, LocationType } from "@/types"
import type { FinancialLocation } from "@/types"

const mockStartNavigation = jest.fn()
const mockRefreshLocation = jest.fn<() => Promise<{ latitude: number; longitude: number } | null>>()
const mockRouterPush = jest.fn()

const mockLocation: FinancialLocation = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Test ATM",
  logo: null,
  type: LocationType.ATM,
  category: null,
  provider: null,
  serviceTypes: [FinancialServiceType.ATM],
  primaryServiceType: FinancialServiceType.ATM,
  latitude: 30.0444,
  longitude: 31.2357,
  address: "Test address",
  distanceFromUser: null,
  isOpen: true,
  cashAvailabilityStatus: "unknown",
  confidenceScore: null,
  estimatedSuccessProbability: null,
  lastConfirmedAt: null,
  phone: null,
  website: null,
  email: null,
  openingHours: null,
}

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  router: { push: mockRouterPush, back: jest.fn() },
  useLocalSearchParams: () => ({ id: mockLocation.id }),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), dispatch: jest.fn() }),
}))
jest.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    formatEta: () => "eta",
    formatRemainingDistance: () => "distance",
  }),
}))
jest.mock("@/hooks/useLocationDetail", () => ({
  useLocationDetail: () => ({
    data: mockLocation,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}))
jest.mock("@/hooks", () => ({
  useLocation: () => ({
    location: null,
    stopLocationUpdates: jest.fn(),
    refreshLocation: mockRefreshLocation,
  }),
}))
jest.mock("@/hooks/useNavigationTracking", () => ({
  useNavigationTracking: () => ({
    currentLocation: null,
    heading: null,
    compassUnavailable: false,
    permissionDenied: false,
    gpsUnavailable: false,
  }),
}))
jest.mock("@/hooks/useCompassDirection", () => ({
  useCompassDirection: () => ({ direction: null }),
}))
jest.mock("@/hooks/useRouteEstimates", () => ({
  useRouteEstimates: () => ({ walkingTime: null, drivingTime: null }),
}))
jest.mock("@/services/routing.service", () => ({ calculateRoute: jest.fn() }))
jest.mock("@/store/navigation-store", () => {
  return {
    useNavigationStore: (selector: (value: Record<string, unknown>) => unknown) => selector({
      isActive: false,
      destination: null,
      route: null,
      transportMode: null,
      remainingDistance: null,
      remainingDuration: null,
      isRecalculating: false,
      navigationError: null,
      startNavigation: mockStartNavigation,
      stopNavigation: jest.fn(),
      setRoute: jest.fn(),
      updateRemaining: jest.fn(),
      setNavigationError: jest.fn(),
    }),
  }
})
jest.mock("@/components/navigation/HereMapView", () => ({
  HereMapView: () => {
    const { View } = require("react-native") as typeof import("react-native")
    return <View testID="map" />
  },
}))
jest.mock("@/components/navigation/NavigationOverlay", () => ({
  NavigationOverlay: ({ onStart }: { onStart: () => void }) => {
    const { Pressable, Text } = require("react-native") as typeof import("react-native")
    return <Pressable onPress={onStart}><Text>navigation.start</Text></Pressable>
  },
}))
jest.mock("@/features/reports/components/ReportStatusSheet", () => ({
  ReportStatusSheet: ({ isOpen }: { isOpen: boolean }) => {
    const { Text } = require("react-native") as typeof import("react-native")
    return isOpen ? <Text>report.sheet.open</Text> : null
  },
}))
jest.mock("@/features/reports/components/ReliabilityDetails", () => ({
  ReliabilityDetails: () => {
    const { Text } = require("react-native") as typeof import("react-native")
    return <Text>reliability.summary</Text>
  },
}))

describe("public location details", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRefreshLocation.mockResolvedValue({ latitude: 30.0444, longitude: 31.2357 })
  })

  it("opens the report flow for a guest without redirecting to sign in", async () => {
    const screen = await render(<LocationDetailsScreen />)
    await act(async () => fireEvent.press(screen.getByText("report.button")))
    expect(screen.getByText("report.sheet.open")).toBeTruthy()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it("starts navigation after acquiring foreground location", async () => {
    const screen = await render(<LocationDetailsScreen />)
    await act(async () => fireEvent.press(screen.getByText("navigation.start")))
    expect(mockRefreshLocation).toHaveBeenCalledTimes(1)
    expect(mockStartNavigation).toHaveBeenCalledWith(mockLocation, "pedestrian")
  })

  it("shows a navigation-specific location error when permission is denied", async () => {
    mockRefreshLocation.mockResolvedValue(null)
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {})
    const screen = await render(<LocationDetailsScreen />)
    await act(async () => fireEvent.press(screen.getByText("navigation.start")))
    expect(mockStartNavigation).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalledWith(
      "navigation.locationRequiredTitle",
      "navigation.locationRequiredMessage",
      expect.any(Array)
    )
  })
})

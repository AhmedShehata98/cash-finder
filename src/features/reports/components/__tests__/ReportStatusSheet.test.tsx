import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import type { ReactNode } from "react"
import { act, fireEvent, render, waitFor } from "@testing-library/react-native"
import * as Location from "expo-location"
import { ReportStatusSheet } from "@/features/reports/components/ReportStatusSheet"
import { FinancialServiceType, LocationType } from "@/types"
import type { FinancialLocation } from "@/types"

const mockMutateAsync = jest.fn<() => Promise<FinancialLocation>>()
let mockCurrentUser: { id: string } | null = null

jest.mock("@/components/BottomSheet", () => ({
  BottomSheet: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? children : null,
}))
jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}))
jest.mock("@/i18n", () => ({
  useI18n: () => ({ isRTL: false, t: (key: string) => key }),
}))
jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ user: mockCurrentUser }),
}))
jest.mock("@/hooks/useSubmitFinancialServiceReport", () => ({
  useSubmitFinancialServiceReport: () => ({ isPending: false, mutateAsync: mockMutateAsync }),
}))

const requestForegroundPermissionsAsync = jest.mocked(Location.requestForegroundPermissionsAsync)
const getCurrentPositionAsync = jest.mocked(Location.getCurrentPositionAsync)

const location: FinancialLocation = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  externalId: "test",
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
  distanceFromUser: 5,
  isOpen: true,
  cashAvailabilityStatus: "unknown",
  confidenceScore: null,
  estimatedSuccessProbability: null,
  lastConfirmedAt: null,
  currentStatus: "unknown",
  phone: null,
  website: null,
  email: null,
  openingHours: null,
}

describe("ReportStatusSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCurrentUser = null
    mockMutateAsync.mockResolvedValue(location)
    requestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
    } as Location.LocationPermissionResponse)
    getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 30.0444, longitude: 31.2357 },
    } as Location.LocationObject)
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID: () => "11111111-1111-4111-8111-111111111111" },
    })
  })

  it("lets a guest submit through the shared flow and shows the optional CTA", async () => {
    const onSubmissionStateChange = jest.fn()
    const onSubmitted = jest.fn()
    const screen = await render(
      <ReportStatusSheet
        isOpen
        location={location}
        onClose={jest.fn()}
        onSubmissionStateChange={onSubmissionStateChange}
        onSubmitted={onSubmitted}
      />
    )

    await act(async () => fireEvent.press(screen.getByText("report.yes")))

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1))
    expect(screen.getByText("report.success")).toBeTruthy()
    expect(screen.getByText("report.guestSuccess")).toBeTruthy()
    expect(onSubmissionStateChange.mock.calls).toEqual([[true], [false]])
    expect(onSubmitted).toHaveBeenCalledTimes(1)
  })

  it("shows a report-specific permission error without submitting", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.DENIED,
    } as Location.LocationPermissionResponse)
    const screen = await render(
      <ReportStatusSheet isOpen location={location} onClose={jest.fn()} />
    )

    await act(async () => fireEvent.press(screen.getByText("report.yes")))

    await waitFor(() => expect(screen.getByText("report.errorPermission")).toBeTruthy())
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it("shows an expected backend rejection without logging an application error", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
    mockMutateAsync.mockRejectedValueOnce(
      Object.assign(new Error("Report was rejected"), { code: "REPORT_DUPLICATE" })
    )
    const screen = await render(
      <ReportStatusSheet isOpen location={location} onClose={jest.fn()} />
    )

    await act(async () => fireEvent.press(screen.getByText("report.yes")))

    await waitFor(() => expect(screen.getByText("report.errorDuplicate")).toBeTruthy())
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("replaces the submitted button label with a spinner until the response", async () => {
    let resolveSubmission!: (reportedLocation: FinancialLocation) => void
    mockMutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve
        })
    )
    const screen = await render(
      <ReportStatusSheet isOpen location={location} onClose={jest.fn()} />
    )

    await act(async () => {
      fireEvent.press(screen.getByText("report.yes"))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText("report.submitting")).toBeTruthy()
    expect(screen.getByTestId("report-submitting-spinner")).toBeTruthy()
    expect(screen.queryByText("report.yes")).toBeNull()

    await act(async () => resolveSubmission(location))
    await waitFor(() => expect(screen.getByText("report.success")).toBeTruthy())
  })

  it("does not show the guest CTA after an authenticated report", async () => {
    mockCurrentUser = { id: "user-id" }
    const screen = await render(
      <ReportStatusSheet isOpen location={location} onClose={jest.fn()} />
    )

    await act(async () => fireEvent.press(screen.getByText("report.yes")))

    await waitFor(() => expect(screen.getByText("report.success")).toBeTruthy())
    expect(screen.queryByText("report.guestSuccess")).toBeNull()
  })
})

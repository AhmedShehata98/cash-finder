import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { act, fireEvent, render } from "@testing-library/react-native"
import { ReliabilityDetails } from "../ReliabilityDetails"

const mockRefetch = jest.fn()
let mockQuery: Record<string, unknown>

jest.mock("@/hooks/useFinancialServiceReliability", () => ({
  useFinancialServiceReliability: () => mockQuery,
}))
jest.mock("@/i18n", () => ({
  useI18n: () => ({
    isRTL: false,
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${Object.values(values).join("|")}` : key,
    formatPercent: (value: number) => `${value}%`,
    formatLastConfirmed: () => "last-confirmed",
    formatRelativeTime: () => "8 minutes ago",
  }),
}))

const summary = {
  currentStatus: "cash_available",
  confidenceScore: 82,
  estimatedSuccessProbability: 86,
  lastConfirmedAt: "2026-07-20T10:00:00Z",
  activeReportsCount: 3,
  verifiedReportsCount: 2,
  mostCommonRecentStatus: "cash_available",
  lastReportAt: "2026-07-20T10:00:00Z",
  freshness: "fresh",
  voteDistribution: [{ status: "cash_available", count: 2, percentage: 67 }],
  recentActivity: [
    { status: "cash_available", createdAt: "2026-07-20T10:00:00Z", isVerified: true },
  ],
}

describe("ReliabilityDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQuery = { data: summary, isLoading: false, isError: false, refetch: mockRefetch }
  })

  it("renders the summary and keeps community details collapsed", async () => {
    const screen = await render(<ReliabilityDetails serviceId="service-id" />)
    expect(screen.getByText("reliability.status.cashAvailable")).toBeTruthy()
    expect(screen.queryByTestId("community-report-details")).toBeNull()
    expect(screen.getByRole("button").props.accessibilityState).toEqual({ expanded: false })
  })

  it("expands vote and recent activity details accessibly", async () => {
    const screen = await render(<ReliabilityDetails serviceId="service-id" />)
    await act(async () => fireEvent.press(screen.getByRole("button")))
    expect(screen.getByTestId("community-report-details")).toBeTruthy()
    expect(screen.getByText("reliability.voteValue:2|67%")).toBeTruthy()
    expect(screen.getByRole("button").props.accessibilityState).toEqual({ expanded: true })
  })

  it("does not present low-confidence data as reliable", async () => {
    mockQuery = { ...mockQuery, data: { ...summary, confidenceScore: 30 } }
    const screen = await render(<ReliabilityDetails serviceId="service-id" />)
    expect(screen.getByText("reliability.status.unknown")).toBeTruthy()
  })

  it("renders empty and retryable error states", async () => {
    mockQuery = {
      data: { ...summary, activeReportsCount: 0 },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    }
    const empty = await render(<ReliabilityDetails serviceId="service-id" />)
    expect(empty.getByText("reliability.empty")).toBeTruthy()
    empty.unmount()

    mockQuery = { data: undefined, isLoading: false, isError: true, refetch: mockRefetch }
    const error = await render(<ReliabilityDetails serviceId="service-id" />)
    fireEvent.press(error.getByText("common.retry"))
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })
})

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { supabase } from "@/lib/supabase"
import {
  calculateSupabaseRoute,
  getFinancialServiceReliability,
} from "@/services/supabase/financial-services.repository"

jest.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    rpc: jest.fn(),
  },
}))
jest.mock("@/services/report-identity.service", () => ({
  resolveReportIdentity: jest.fn(),
}))

const invoke = jest.mocked(supabase.functions.invoke)
const rpc = jest.mocked(supabase.rpc)

describe("calculateSupabaseRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("routes HERE requests through the public Supabase Edge Function", async () => {
    const edgeResponse = {
      legs: [{ polyline: "BF", distance: 120, duration: 80, transportMode: "pedestrian" }],
    }
    invoke.mockResolvedValue({ data: edgeResponse, error: null } as never)

    await expect(
      calculateSupabaseRoute(
        { latitude: 30.0444, longitude: 31.2357 },
        { latitude: 30.05, longitude: 31.24 },
        "pedestrian"
      )
    ).resolves.toEqual(edgeResponse)

    expect(invoke).toHaveBeenCalledWith("get-route", {
      body: {
        origin: { latitude: 30.0444, longitude: 31.2357 },
        destination: { latitude: 30.05, longitude: 31.24 },
        transportMode: "pedestrian",
      },
    })
  })
})

describe("getFinancialServiceReliability", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("maps the privacy-safe reliability RPC response", async () => {
    rpc.mockResolvedValue({
      data: {
        current_status: "cash_available",
        confidence_score: 82,
        estimated_success_probability: 86,
        last_confirmed_at: "2026-07-20T10:00:00Z",
        active_reports_count: 3,
        verified_reports_count: 2,
        most_common_recent_status: "cash_available",
        last_report_at: "2026-07-20T10:00:00Z",
        report_freshness: "fresh",
        report_vote_distribution: [{ status: "cash_available", count: 2, percentage: 67 }],
        recent_report_activity: [
          { status: "cash_available", created_at: "2026-07-20T10:00:00Z", is_verified: true },
        ],
      },
      error: null,
    } as never)

    await expect(getFinancialServiceReliability("service-id")).resolves.toMatchObject({
      currentStatus: "cash_available",
      activeReportsCount: 3,
      verifiedReportsCount: 2,
      voteDistribution: [{ status: "cash_available", count: 2, percentage: 67 }],
    })
    expect(rpc).toHaveBeenCalledWith("get_financial_service_reliability", {
      p_financial_service_id: "service-id",
    })
  })

  it("rejects a malformed RPC response", async () => {
    rpc.mockResolvedValue({ data: null, error: null } as never)
    await expect(getFinancialServiceReliability("service-id")).rejects.toThrow(
      "Invalid reliability response"
    )
  })
})

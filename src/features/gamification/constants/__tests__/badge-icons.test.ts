import { describe, expect, it, jest } from "@jest/globals"
import { resolveBadgeIcon } from "../badge-icons"

describe("badge icon mapping", () => {
  it.each([
    ["sparkles", "auto-awesome"],
    ["map-pin", "place"],
    ["shield-check", "verified-user"],
    ["award", "emoji-events"],
    ["refresh", "refresh"],
    ["flame", "local-fire-department"],
    ["compass", "explore"],
    ["wallet", "account-balance-wallet"],
    ["badge-check", "verified"],
    ["crown", "military-tech"],
  ])("maps %s to its dedicated icon", (key, expected) => {
    expect(resolveBadgeIcon(key).name).toBe(expected)
  })

  it("uses the safe fallback for unknown icon keys", () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    expect(resolveBadgeIcon("future-badge").name).toBe("emoji-events")
    expect(warning).toHaveBeenCalled()
    warning.mockRestore()
  })
})

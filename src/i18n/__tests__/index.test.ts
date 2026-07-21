import { afterEach, describe, expect, it, jest } from "@jest/globals"
import { renderHook } from "@testing-library/react-native"
import { useI18n } from "@/i18n"
import { useLocaleStore } from "@/store/locale-store"

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}))

const relativeTimeFormatDescriptor = Object.getOwnPropertyDescriptor(Intl, "RelativeTimeFormat")

describe("useI18n", () => {
  afterEach(() => {
    if (relativeTimeFormatDescriptor) {
      Object.defineProperty(Intl, "RelativeTimeFormat", relativeTimeFormatDescriptor)
    }
  })

  it("formats a report timestamp when RelativeTimeFormat is unavailable", async () => {
    useLocaleStore.setState({ locale: "en" })
    Object.defineProperty(Intl, "RelativeTimeFormat", {
      configurable: true,
      value: undefined,
    })
    const { result } = await renderHook(() => useI18n())

    expect(() => result.current.formatRelativeTime("2026-07-20T10:00:00Z")).not.toThrow()
    expect(result.current.formatRelativeTime("2026-07-20T10:00:00Z")).not.toBe("")
  })
})

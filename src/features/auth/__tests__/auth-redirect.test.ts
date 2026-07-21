import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import Constants from "expo-constants"
import * as Linking from "expo-linking"
import { Platform } from "react-native"
import { AuthRedirectUnavailableError, getAuthRedirectUrl } from "../auth-redirect"

jest.mock("expo-linking", () => ({ createURL: jest.fn() }))

const createURL = jest.mocked(Linking.createURL)
const originalPlatform = Platform.OS
const originalOwnership = Constants.appOwnership

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os })
}

function setAppOwnership(value: typeof Constants.appOwnership) {
  Object.defineProperty(Constants, "appOwnership", { configurable: true, value })
}

describe("auth redirect configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setPlatform("ios")
    setAppOwnership(null)
    createURL.mockReturnValue("cashfinder://auth/callback?returnTo=%2Frewards")
  })

  afterEach(() => {
    setPlatform(originalPlatform)
    setAppOwnership(originalOwnership)
  })

  it("generates the callback with the configured native scheme", () => {
    const result = getAuthRedirectUrl("/rewards")

    expect(result).toBe("cashfinder://auth/callback?returnTo=%2Frewards")
    expect(createURL).toHaveBeenCalledWith("auth/callback", {
      scheme: "cashfinder",
      queryParams: { returnTo: "/rewards" },
    })
    expect(result).not.toMatch(/localhost|127\.0\.0\.1/)
  })

  it("replaces untrusted destinations with discover", () => {
    getAuthRedirectUrl("https://example.com")

    expect(createURL).toHaveBeenCalledWith(
      "auth/callback",
      expect.objectContaining({ queryParams: { returnTo: "/discover" } })
    )
  })

  it.each(["web", "expo-go"])("rejects unsupported %s authentication", (environment) => {
    if (environment === "web") setPlatform("web")
    else setAppOwnership("expo" as never)

    expect(() => getAuthRedirectUrl()).toThrow(AuthRedirectUnavailableError)
    expect(createURL).not.toHaveBeenCalled()
  })
})

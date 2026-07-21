import { describe, expect, it, jest } from "@jest/globals"
import { fireEvent, render } from "@testing-library/react-native"
import { PanResponder, Text } from "react-native"
import { BottomSheet } from "@/components/BottomSheet"

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native")
  const animation = { duration: () => animation }

  return {
    __esModule: true,
    default: { View },
    FadeIn: animation,
    FadeOut: animation,
    SlideInDown: animation,
    SlideOutDown: animation,
  }
})

jest.spyOn(PanResponder, "create").mockImplementation(
  (config) =>
    ({
      panHandlers: {
        onResponderRelease: config.onPanResponderRelease,
      },
      getInteractionHandle: () => null,
    }) as ReturnType<typeof PanResponder.create>
)

describe("BottomSheet", () => {
  it("closes when the overlay is pressed", async () => {
    const onClose = jest.fn()
    const screen = await render(
      <BottomSheet isOpen onClose={onClose}>
        <Text>Sheet content</Text>
      </BottomSheet>
    )

    await fireEvent.press(
      screen.getByTestId("bottom-sheet-overlay", { includeHiddenElements: true })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("closes after a downward swipe", async () => {
    const onClose = jest.fn()
    const screen = await render(
      <BottomSheet isOpen onClose={onClose}>
        <Text>Sheet content</Text>
      </BottomSheet>
    )
    const sheet = screen.getByTestId("bottom-sheet-content")

    await fireEvent(sheet, "responderRelease", {}, { dx: 0, dy: 90, vy: 0.2 })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not close while dismissal is disabled", async () => {
    const onClose = jest.fn()
    const screen = await render(
      <BottomSheet isOpen onClose={onClose} closeDisabled>
        <Text>Sheet content</Text>
      </BottomSheet>
    )

    await fireEvent.press(
      screen.getByTestId("bottom-sheet-overlay", { includeHiddenElements: true })
    )
    await fireEvent(
      screen.getByTestId("bottom-sheet-content"),
      "responderRelease",
      {},
      { dx: 0, dy: 90, vy: 0.2 }
    )

    expect(onClose).not.toHaveBeenCalled()
  })
})

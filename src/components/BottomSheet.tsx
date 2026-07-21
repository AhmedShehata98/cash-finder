import { ReactNode, useCallback, useMemo } from "react"
import { Modal, PanResponder, Pressable, StyleSheet, View, useColorScheme } from "react-native"
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated"
import { colors } from "@/theme"
import { spacing } from "@/theme"

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  closeDisabled?: boolean
  contentPaddingBottom?: number
}

const SWIPE_DISMISS_DISTANCE = 80
const SWIPE_DISMISS_VELOCITY = 0.5

export function BottomSheet({
  isOpen,
  onClose,
  children,
  closeDisabled = false,
  contentPaddingBottom = spacing.xl,
}: BottomSheetProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const requestClose = useCallback(() => {
    if (!closeDisabled) onClose()
  }, [closeDisabled, onClose])
  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !closeDisabled && gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (
            gesture.dy >= SWIPE_DISMISS_DISTANCE ||
            gesture.vy >= SWIPE_DISMISS_VELOCITY
          ) {
            requestClose()
          }
        },
      }),
    [closeDisabled, requestClose]
  )

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.backdrop}
      >
        <Pressable
          testID="bottom-sheet-overlay"
          style={StyleSheet.absoluteFill}
          onPress={requestClose}
          accessible={false}
        />
        <Animated.View
          testID="bottom-sheet-content"
          entering={SlideInDown.duration(250)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.neutral[900] : colors.white,
              paddingBottom: contentPaddingBottom,
            },
          ]}
          {...swipeResponder.panHandlers}
          accessibilityViewIsModal
          onAccessibilityEscape={requestClose}
        >
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    maxHeight: "80%",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
  },
})

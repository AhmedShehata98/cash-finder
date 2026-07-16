---
name: react-native
description: Use for developing cross-platform mobile applications with React Native. Covers project setup, component architecture, navigation, state management, native modules, platform-specific code, styling, testing, and build/deployment. Trigger when the user creates or modifies React Native projects, components, screens, navigation, or native integrations.
---

# React Native Cross-Platform Development

## Project Setup

- Prefer **Expo** (managed or bare workflow) for new projects unless bare React Native CLI is explicitly required.
- Use `npx create-expo-app` or `npx @react-native-community/cli init` depending on workflow choice.
- Always use TypeScript (`.tsx` for components, `.ts` for logic).
- Keep `tsconfig.json` strict: `"strict": true`, `"noUncheckedIndexedAccess": true`.

## Project Structure

```
src/
  components/       # Reusable UI components
  screens/          # Screen-level components
  navigation/       # Navigation configuration
  hooks/            # Custom hooks
  services/         # API clients, storage, native module wrappers
  store/            # State management (Zustand, Redux, Jotai, etc.)
  utils/            # Pure utility functions
  types/            # Shared TypeScript types
  assets/           # Images, fonts, etc.
  constants/        # App-wide constants, theme, config
```

## Component Conventions

- Functional components only with `React.FC` or explicit prop types.
- File per component, named identically: `Button.tsx` exports `Button`.
- Co-locate styles, tests, and types when practical.
- Use `React.memo` for expensive list items; avoid premature optimization.
- Extract reusable logic into custom hooks (`useXxx` pattern).

```tsx
import { View, Text, StyleSheet } from "react-native"

type Props = {
  title: string
  onPress?: () => void
}

export function Button({ title, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  text: { fontSize: 16 },
})
```

## Navigation

- Use **React Navigation** (`@react-navigation/native`) as the default.
- Use native stack: `@react-navigation/native-stack`.
- Define all routes in a central `navigation/` directory with typed params.
- Use `RootStackParamList` type for type-safe navigation.

```ts
type RootStackParamList = {
  Home: undefined
  Details: { id: string }
}
```

## State Management

- **Zustand** for simple global state (preferred for most apps).
- **React Query / TanStack Query** for server state and caching.
- **AsyncStorage** (`@react-native-async-storage/async-storage`) for local persistence.
- Avoid Redux unless the app has complex client-side state requirements.

## Styling

- Use `StyleSheet.create()` for all styles.
- Use `Platform.select()` or `Platform.OS` for platform-specific styles.
- Use `SafeAreaView` from `react-native-safe-area-context`.
- Support dark mode via `useColorScheme` or a theme provider.
- Prefer `flex: 1` layouts; avoid hardcoded dimensions.
- Use `Dimensions.get("window")` sparingly; prefer flex.

```ts
import { Platform, StyleSheet } from "react-native"

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === "ios" ? 20 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
})
```

## Platform-Specific Code

- Use `.ios.tsx` / `.android.tsx` file extensions for divergent implementations.
- Use `Platform.select()` for small platform differences.
- Use `Platform.OS` checks for conditional logic.
- Test on both platforms regularly.

## Native Modules & Libraries

- Prefer Expo modules (`expo-*`) when available.
- For bare workflow, use `npx pod-install` after adding iOS dependencies.
- Common libraries:
  - `expo-camera`, `expo-location`, `expo-notifications`
  - `react-native-gesture-handler`, `react-native-reanimated`
  - `react-native-screens`, `react-native-safe-area-context`
  - `@react-native-async-storage/async-storage`
  - `react-native-mmkv` (fast key-value storage)
  - `react-native-webview`
- Always check for Expo compatibility before adding native libraries.
- Run `npx expo install` to install compatible versions when using Expo.

## API & Networking

- Use a single API client instance (Axios or fetch wrapper).
- Centralize error handling and auth token injection.
- Use TanStack Query for caching, pagination, and optimistic updates.
- Store base URL in environment config, never hardcode.

## Testing

- **Unit tests**: Jest + `@testing-library/react-native`.
- **E2E tests**: Maestro or Detox.
- Test components by querying accessible elements, not testIDs alone.
- Mock native modules in Jest setup (`jest-expo` preset).

```tsx
import { render, screen } from "@testing-library/react-native"
import { Button } from "./Button"

test("renders title", () => {
  render(<Button title="Press me" />)
  expect(screen.getByText("Press me")).toBeOnTheScreen()
})
```

## Performance

- Use `FlatList` / `SectionList` for long lists; never `ScrollView` with many items.
- Set `keyExtractor` and `getItemLayout` on `FlatList` when possible.
- Use `React.memo` and `useMemo` / `useCallback` for expensive renders.
- Avoid inline object/function creation in render.
- Use `react-native-reanimated` for 60fps animations (runs on UI thread).
- Profile with React DevTools Profiler and Flipper.

## Build & Deployment

- **Expo**: `eas build` for cloud builds, `eas submit` for store submission.
- **Bare CLI**: Xcode for iOS, Gradle for Android.
- Use **EAS Build** profiles: `development`, `preview`, `production`.
- Configure `app.json` / `app.config.ts` with proper icons, splash, and permissions.
- Manage environment variables via `expo-constants` or `react-native-config`.
- Use code push (EAS Update) for OTA JS updates.

## Accessibility

- Always set `accessibilityLabel` on interactive elements.
- Use `accessibilityRole` (`button`, `link`, `header`, etc.).
- Support Dynamic Type (iOS) and font scaling (Android).
- Test with VoiceOver (iOS) and TalkBack (Android).

## Common Pitfalls

- Never mutate state directly; always use setters.
- Avoid `console.log` in production; use a logging service.
- Handle keyboard avoidance with `KeyboardAvoidingView` or `react-native-keyboard-controller`.
- Always handle permissions gracefully (camera, location, notifications).
- Handle deep links and universal links in navigation.
- Clean up subscriptions and intervals in `useEffect` return.

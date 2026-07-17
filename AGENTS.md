# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Known dev-only warning (no fix required)

A React warning may appear in development builds:

> "Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously tries to update the component. Move this work to useEffect instead."

Origin: expo-router `57.0.6` (vendored React Navigation fork). During `NavigationContainer`'s initial render, `useThenable`'s `React.useState(getInitialState)` initializer runs the linking pipeline; when `Linking.getInitialURL()` resolves to a non-null string (typical under the Expo dev client / Go launcher, reachable because `app.config.ts` sets `scheme: "cashfinder"`), the `.then` callback at `node_modules/expo-router/build/fork/useLinking.native.js:127` calls `setLastUnhandledLink(...)` (a `NavigationContainer` `useState` setter) before the fiber is mounted.

This is upstream, not a bug in app code. It is:
- Dev-only (React strips these warnings in production bundles).
- Benign: `useThenable`'s own guarded `useEffect` completes initial-state resolution; navigation initializes correctly.
- Reachable only when an initial deep-link URL is present.

No app-code fix is correct here. Do NOT suppress the warning, remove the scheme, or add defensive guards in our components. Revisit only when upgrading past expo-router 57.0.6 (requires a future SDK bump beyond the v57 pin above).

import { Stack } from "expo-router"

export default function NearbyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Discover",
      }}
    />
  )
}

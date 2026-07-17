import { Stack } from "expo-router"
import { useI18n } from "@/i18n"

export default function NearbyLayout() {
  const { t } = useI18n()

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: t("tabs.discover"),
      }}
    />
  )
}

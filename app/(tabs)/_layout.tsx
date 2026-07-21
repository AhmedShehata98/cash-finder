import { Tabs } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { StyleSheet } from "react-native"

import Colors from "@/constants/Colors"
import { useColorScheme } from "@/components/useColorScheme"
import { useClientOnlyValue } from "@/components/useClientOnlyValue"
import { useI18n } from "@/i18n"

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const { t } = useI18n()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t("tabs.discover"),
          headerTitle: t("headers.nearbyFinancialServices"),
          tabBarIcon: ({ color }) => <MaterialIcons name="explore" size={28} color={color} />,
          headerRight: () => (
            <MaterialIcons
              name="info-outline"
              size={25}
              color={Colors[colorScheme].text}
              style={styles.headerIcon}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t("tabs.rewards"),
          headerTitle: t("headers.rewards"),
          tabBarIcon: ({ color }) => <MaterialIcons name="emoji-events" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          headerTitle: t("headers.settings"),
          tabBarIcon: ({ color }) => <MaterialIcons name="language" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  headerIcon: {
    marginRight: 15,
  },
})

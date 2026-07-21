import { useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import * as Linking from "expo-linking"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "@/providers/auth-provider"
import {
  isAuthCallbackError,
  type AuthCallbackErrorCode,
} from "@/features/auth/auth-callback"
import { normalizeAuthDestination } from "@/features/auth/auth-config"
import { useI18n } from "@/i18n"
import { colors, spacing, typography } from "@/theme"

type CallbackStatus = "processing" | "success" | AuthCallbackErrorCode

const ERROR_MESSAGE_KEYS: Record<AuthCallbackErrorCode, string> = {
  expired: "auth.callback.expired",
  invalid: "auth.callback.invalid",
  network: "auth.callback.network",
  "exchange-failure": "auth.callback.exchangeFailure",
  unsupported: "auth.callback.unsupported",
}

export default function AuthCallbackScreen() {
  const url = Linking.useLinkingURL()
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()
  const { completeAuthCallback } = useAuth()
  const { isRTL, t } = useI18n()
  const [status, setStatus] = useState<CallbackStatus>("processing")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    const finishCallback = async () => {
      setStatus("processing")
      if (!url) {
        setStatus("unsupported")
        return
      }

      try {
        const callbackResult = await completeAuthCallback(url)
        if (cancelled) return
        setStatus("success")
        router.replace(callbackResult.destination)
      } catch (error) {
        if (cancelled) return
        setStatus(isAuthCallbackError(error) ? error.code : "exchange-failure")
      }
    }

    void finishCallback()
    return () => {
      cancelled = true
    }
  }, [attempt, completeAuthCallback, url])

  const isProcessing = status === "processing" || status === "success"
  const message = isProcessing
    ? t(status === "success" ? "auth.callback.success" : "auth.callback.processing")
    : t(ERROR_MESSAGE_KEYS[status])
  const destination = normalizeAuthDestination(returnTo)

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.card} accessibilityRole="alert">
        {isProcessing ? (
          <ActivityIndicator size="large" color={colors.primary[600]} />
        ) : (
          <MaterialIcons name="error-outline" size={42} color={colors.error[700]} />
        )}
        <Text style={[styles.title, isRTL && styles.textRtl]}>{t("auth.callback.title")}</Text>
        <Text style={[styles.message, isRTL && styles.textRtl]}>{message}</Text>
        {!isProcessing && (
          <View style={styles.actions}>
            {status === "network" && (
              <Pressable
                style={styles.primaryButton}
                onPress={() => setAttempt((currentAttempt) => currentAttempt + 1)}
              >
                <Text style={styles.primaryButtonText}>{t("common.retry")}</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                router.replace({ pathname: "/auth/sign-in", params: { returnTo: destination } })
              }
            >
              <Text style={styles.secondaryButtonText}>{t("auth.callback.requestNew")}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral[50],
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
    gap: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  title: {
    color: colors.neutral[900],
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  message: {
    color: colors.neutral[700],
    fontSize: typography.fontSize.md,
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
    textAlign: "center",
  },
  actions: { width: "100%", gap: spacing.sm },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.primary[600],
  },
  primaryButtonText: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  secondaryButtonText: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
  },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
})

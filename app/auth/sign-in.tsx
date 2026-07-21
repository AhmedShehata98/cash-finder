import { useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Stack, router, useLocalSearchParams } from "expo-router"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "@/providers/auth-provider"
import { AuthRedirectUnavailableError } from "@/features/auth/auth-redirect"
import { useI18n } from "@/i18n"
import { colors, spacing, typography } from "@/theme"

export default function SignInScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()
  const { signInWithEmail } = useAuth()
  const { isRTL, t } = useI18n()
  const [email, setEmail] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setIsPending(true)
    try {
      await signInWithEmail(email.trim(), returnTo)
      setSent(true)
    } catch (caughtError) {
      setError(
        caughtError instanceof AuthRedirectUnavailableError
          ? t("auth.unsupportedBuild")
          : t("auth.error")
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t("auth.title") }} />
      <View style={styles.content}>
        <MaterialIcons name="lock" size={34} color={colors.primary[600]} />
        <Text style={[styles.title, isRTL && styles.textRtl]}>{t("auth.title")}</Text>
        <Text style={[styles.subtitle, isRTL && styles.textRtl]}>{t("auth.subtitle")}</Text>

        {sent ? (
          <View style={styles.messageBox}>
            <Text style={[styles.messageText, isRTL && styles.textRtl]}>{t("auth.checkEmail")}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>{t("common.back")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!isPending}
              style={[styles.input, isRTL && styles.textRtl]}
            />
            <Pressable
              style={[styles.primaryButton, (!email || isPending) && styles.disabledButton]}
              disabled={!email || isPending}
              onPress={submit}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{t("auth.sendLink")}</Text>
              )}
            </Pressable>
            {error && <Text style={[styles.errorText, isRTL && styles.textRtl]}>{error}</Text>}
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    padding: spacing.lg,
  },
  content: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.neutral[600],
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.md,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary[600],
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.neutral[800],
    fontWeight: typography.fontWeight.semibold,
  },
  messageBox: {
    gap: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.success[50],
    padding: spacing.md,
  },
  messageText: {
    color: colors.success[800],
  },
  errorText: {
    color: colors.error[700],
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
})

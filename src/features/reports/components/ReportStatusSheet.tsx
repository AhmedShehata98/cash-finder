import { BottomSheet } from "@/components/BottomSheet"
import { useSubmitFinancialServiceReport } from "@/hooks/useSubmitFinancialServiceReport"
import { useI18n } from "@/i18n"
import { useAuth } from "@/providers/auth-provider"
import { colors, spacing, typography } from "@/theme"
import {
  FinancialServiceFailureReason,
  FinancialServiceReportStatus,
  FinancialServiceType,
  type FinancialLocation,
  type ReportSubmissionResult,
} from "@/types"
import { MaterialIcons } from "@expo/vector-icons"
import * as Location from "expo-location"
import { useMemo, useRef, useState } from "react"
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native"

type ReportStatusSheetProps = {
  isOpen: boolean
  location: FinancialLocation
  onClose: () => void
  onSubmissionStateChange?: (isSubmitting: boolean) => void
  onSubmitted?: () => void
}

type ReportChoice = {
  labelKey:
    | "report.cashAvailable"
    | "report.serviceAvailable"
    | "report.noCash"
    | "report.outOfService"
    | "report.crowded"
    | "report.closed"
    | "report.partiallyAvailable"
  status: FinancialServiceReportStatus
  reason?: FinancialServiceFailureReason
}

const expectedReportRejectionCodes = new Set([
  "REPORT_OUTSIDE_RADIUS",
  "REPORT_DUPLICATE",
  "REPORT_AUTH_REQUIRED",
  "REPORT_IDENTITY_REQUIRED",
  "REPORT_IDENTITY_INVALID",
  "REPORT_IDENTITY_UNAVAILABLE",
  "REPORT_INVALID_REASON",
  "REPORT_INVALID_STATUS",
  "REPORT_IMPLAUSIBLE_TRAVEL",
  "REPORT_LOCATION_NOT_FOUND",
])

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  const random = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1)
  return `${random()}${random()}-${random()}-${random()}-${random()}-${random()}${random()}${random()}`
}

function isBankService(location: FinancialLocation) {
  return location.serviceTypes.includes(FinancialServiceType.BankBranch)
}

function positiveChoice(location: FinancialLocation): ReportChoice {
  if (isBankService(location) && !location.serviceTypes.includes(FinancialServiceType.ATM)) {
    return {
      labelKey: "report.serviceAvailable",
      status: FinancialServiceReportStatus.ServiceAvailable,
    }
  }
  return { labelKey: "report.cashAvailable", status: FinancialServiceReportStatus.CashAvailable }
}

function negativeChoices(location: FinancialLocation): ReportChoice[] {
  if (isBankService(location) && !location.serviceTypes.includes(FinancialServiceType.ATM)) {
    return [
      {
        labelKey: "report.closed",
        status: FinancialServiceReportStatus.LocationClosed,
        reason: FinancialServiceFailureReason.LocationClosed,
      },
      {
        labelKey: "report.outOfService",
        status: FinancialServiceReportStatus.OutOfService,
        reason: FinancialServiceFailureReason.OutOfService,
      },
    ]
  }

  return [
    {
      labelKey: "report.noCash",
      status: FinancialServiceReportStatus.NoCash,
      reason: FinancialServiceFailureReason.NoCash,
    },
    {
      labelKey: "report.outOfService",
      status: FinancialServiceReportStatus.OutOfService,
      reason: FinancialServiceFailureReason.OutOfService,
    },
    {
      labelKey: "report.crowded",
      status: FinancialServiceReportStatus.Crowded,
      reason: FinancialServiceFailureReason.QueueTooLong,
    },
    {
      labelKey: "report.partiallyAvailable",
      status: FinancialServiceReportStatus.PartiallyAvailable,
      reason: FinancialServiceFailureReason.DepositOnly,
    },
  ]
}

function errorMessageKey(code?: string) {
  switch (code) {
    case "REPORT_OUTSIDE_RADIUS":
      return "report.errorOutsideRadius"
    case "REPORT_DUPLICATE":
      return "report.errorDuplicate"
    case "REPORT_AUTH_REQUIRED":
    case "REPORT_IDENTITY_REQUIRED":
    case "REPORT_IDENTITY_INVALID":
    case "REPORT_IDENTITY_UNAVAILABLE":
      return "report.errorIdentity"
    case "REPORT_INVALID_REASON":
    case "REPORT_INVALID_STATUS":
      return "report.errorInvalid"
    default:
      return "report.errorGeneric"
  }
}

export function ReportStatusSheet({
  isOpen,
  location,
  onClose,
  onSubmissionStateChange,
  onSubmitted,
}: ReportStatusSheetProps) {
  const { isRTL, t } = useI18n()
  const { user } = useAuth()
  const [step, setStep] = useState<"initial" | "negative">("initial")
  const [errorKey, setErrorKey] = useState<
    ReturnType<typeof errorMessageKey> | "report.errorPermission" | null
  >(null)
  const [success, setSuccess] = useState(false)
  const [rewardResult, setRewardResult] = useState<ReportSubmissionResult | null>(null)
  const [submittingStatus, setSubmittingStatus] = useState<FinancialServiceReportStatus | null>(
    null
  )
  const mutation = useSubmitFinancialServiceReport()
  const submissionRef = useRef<{ choice: ReportChoice; requestId: string } | null>(null)

  const negativeOptions = useMemo(() => negativeChoices(location), [location])
  const positiveOption = useMemo(() => positiveChoice(location), [location])
  const isSubmitting = submittingStatus !== null || mutation.isPending

  const resetAndClose = () => {
    if (isSubmitting) return
    setStep("initial")
    setErrorKey(null)
    setSuccess(false)
    setRewardResult(null)
    submissionRef.current = null
    onClose()
  }

  const submitChoice = async (choice: ReportChoice) => {
    setErrorKey(null)
    setSubmittingStatus(choice.status)
    onSubmissionStateChange?.(true)
    const previous = submissionRef.current
    const isSameChoice =
      previous?.choice.status === choice.status && previous.choice.reason === choice.reason
    const requestId = isSameChoice ? previous.requestId : createRequestId()
    submissionRef.current = { choice, requestId }

    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setErrorKey("report.errorPermission")
        return
      }

      const freshLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const result = await mutation.mutateAsync({
        financialServiceId: location.id,
        reportedStatus: choice.status,
        failureReason: choice.reason ?? null,
        latitude: freshLocation.coords.latitude,
        longitude: freshLocation.coords.longitude,
        requestId,
      })
      setRewardResult(result)
      setSuccess(true)
      onSubmitted?.()
    } catch (err) {
      const code = err instanceof Error ? (err as Error & { code?: string }).code : undefined
      if (!code || !expectedReportRejectionCodes.has(code)) {
        console.error("Report submission error", err)
      }
      setErrorKey(errorMessageKey(code))
    } finally {
      setSubmittingStatus(null)
      onSubmissionStateChange?.(false)
    }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={resetAndClose}
      closeDisabled={isSubmitting}
      contentPaddingBottom={0}
    >
      <View style={styles.container}>
        <Text style={[styles.title, isRTL && styles.textRtl]}>{t("report.title")}</Text>
        <Text style={[styles.subtitle, isRTL && styles.textRtl]}>{location.name}</Text>

        {success ? (
          <View style={styles.successBox}>
            <MaterialIcons name="verified" size={28} color={colors.success[700]} />
            <Text style={[styles.successText, isRTL && styles.textRtl]}>{t("report.success")}</Text>
            {rewardResult && rewardResult.xpAwarded > 0 && (
              <View
                accessible
                accessibilityRole="summary"
                accessibilityLabel={t("rewards.xpEarned", { value: rewardResult.xpAwarded })}
                style={styles.rewardBox}
              >
                <MaterialIcons name="stars" size={24} color={colors.primary[700]} />
                <Text style={styles.rewardXp}>
                  {t("rewards.xpEarned", { value: rewardResult.xpAwarded })}
                </Text>
                {rewardResult.levelProgress && (
                  <Text style={[styles.rewardDetail, isRTL && styles.textRtl]}>
                    {t("rewards.levelProgressValue", {
                      current: rewardResult.levelProgress.currentXp,
                      next:
                        rewardResult.levelProgress.nextLevelXp ??
                        rewardResult.levelProgress.currentXp,
                    })}
                  </Text>
                )}
                {rewardResult.rewards.badges.map((badge) => (
                  <Text key={badge.code} style={[styles.rewardDetail, isRTL && styles.textRtl]}>
                    {t("rewards.badgeUnlocked", { name: badge.name })}
                  </Text>
                ))}
                {rewardResult.rewards.achievements.map((achievement) => (
                  <Text
                    key={achievement.code}
                    style={[styles.rewardDetail, isRTL && styles.textRtl]}
                  >
                    {t("rewards.achievementCompleted", { name: achievement.title })}
                  </Text>
                ))}
              </View>
            )}
            {!user && (
              <Text style={[styles.guestSuccessText, isRTL && styles.textRtl]}>
                {t("report.guestSuccess")}
              </Text>
            )}
            <Pressable style={styles.secondaryButton} onPress={resetAndClose}>
              <Text style={styles.secondaryButtonText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {step === "initial" ? (
              <View style={styles.actions}>
                <Pressable
                  style={[styles.choiceButton, styles.positiveButton]}
                  disabled={isSubmitting}
                  onPress={() => submitChoice(positiveOption)}
                  accessibilityState={{
                    busy: submittingStatus === positiveOption.status,
                    disabled: isSubmitting,
                  }}
                >
                  {submittingStatus === positiveOption.status ? (
                    <>
                      <ActivityIndicator testID="report-submitting-spinner" color={colors.white} />
                      <Text style={styles.choiceButtonText}>{t("report.submitting")}</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color={colors.white} />
                      <Text style={styles.choiceButtonText}>{t("report.yes")}</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.choiceButton, styles.negativeButton]}
                  disabled={isSubmitting}
                  onPress={() => setStep("negative")}
                  accessibilityState={{ disabled: isSubmitting }}
                >
                  <MaterialIcons name="cancel" size={20} color={colors.white} />
                  <Text style={styles.choiceButtonText}>{t("report.no")}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actions}>
                {negativeOptions.map((choice) => (
                  <Pressable
                    key={choice.status}
                    style={styles.optionButton}
                    disabled={isSubmitting}
                    onPress={() => submitChoice(choice)}
                    accessibilityState={{
                      busy: submittingStatus === choice.status,
                      disabled: isSubmitting,
                    }}
                  >
                    {submittingStatus === choice.status ? (
                      <>
                        <ActivityIndicator
                          testID="report-submitting-spinner"
                          color={colors.primary[600]}
                        />
                        <Text style={[styles.optionText, isRTL && styles.textRtl]}>
                          {t("report.submitting")}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.optionText, isRTL && styles.textRtl]}>
                        {t(choice.labelKey)}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {errorKey && (
              <View style={styles.errorBox}>
                <Text style={[styles.errorText, isRTL && styles.textRtl]}>{t(errorKey)}</Text>
                {errorKey === "report.errorPermission" && (
                  <Pressable onPress={() => Linking.openSettings()}>
                    <Text style={styles.settingsText}>{t("report.openSettings")}</Text>
                  </Pressable>
                )}
                {errorKey === "report.errorGeneric" && submissionRef.current && (
                  <Pressable
                    disabled={mutation.isPending}
                    onPress={() => submitChoice(submissionRef.current!.choice)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.settingsText}>{t("report.retry")}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.neutral[600],
  },
  actions: {
    gap: spacing.sm,
  },
  choiceButton: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  positiveButton: {
    backgroundColor: colors.success[600],
  },
  negativeButton: {
    backgroundColor: colors.error[600],
  },
  choiceButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  optionButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  optionText: {
    color: colors.neutral[900],
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  errorBox: {
    borderRadius: 8,
    backgroundColor: colors.error[50],
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    color: colors.error[700],
  },
  settingsText: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
  },
  successBox: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  successText: {
    color: colors.success[700],
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  guestSuccessText: {
    color: colors.neutral[600],
    fontSize: typography.fontSize.sm,
    textAlign: "center",
  },
  rewardBox: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    padding: spacing.md,
  },
  rewardXp: {
    color: colors.primary[700],
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  rewardDetail: {
    color: colors.neutral[700],
    fontSize: typography.fontSize.sm,
    textAlign: "center",
  },
  secondaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.neutral[800],
    fontWeight: typography.fontWeight.semibold,
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
})

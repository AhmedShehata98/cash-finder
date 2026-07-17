import { MaterialIcons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useI18n } from "@/i18n"
import { supportedLocales, type AppLocale } from "@/store/locale-store"
import { colors, spacing, typography } from "@/theme"

export default function SettingsScreen() {
  const { isRTL, locale, setLocale, t, getLanguageLabel } = useI18n()

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={[styles.title, isRTL && styles.textRtl]}>{t("settings.title")}</Text>
        <Text style={[styles.subtitle, isRTL && styles.textRtl]}>{t("settings.subtitle")}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRtl]}>
          {t("settings.languageSection")}
        </Text>
        <Text style={[styles.sectionDescription, isRTL && styles.textRtl]}>
          {t("settings.languageSectionDescription")}
        </Text>

        <View style={styles.options}>
          {supportedLocales.map((option) => {
            const isSelected = option === locale
            const label = getLanguageLabel(option)
            const accessibilityLabel = isSelected
              ? t("settings.optionAccessibility", {
                  label,
                  state: t("common.selected"),
                })
              : label

            return (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => setLocale(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={accessibilityLabel}
              >
                <View style={[styles.optionContent, isRTL && styles.optionContentRtl]}>
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionLabel, isRTL && styles.textRtl]}>{label}</Text>
                    <Text style={[styles.optionValue, isRTL && styles.textRtl]}>
                      {getLocaleTagLabel(option)}
                    </Text>
                  </View>

                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <MaterialIcons name="check" size={16} color={colors.white} />}
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>

        <View style={[styles.currentLanguagePill, isRTL && styles.currentLanguagePillRtl]}>
          <Text style={[styles.currentLanguageLabel, isRTL && styles.textRtl]}>
            {t("settings.activeLanguage")}
          </Text>
          <Text style={[styles.currentLanguageValue, isRTL && styles.textRtl]}>
            {t("settings.currentLanguageValue", { label: getLanguageLabel(locale) })}
          </Text>
        </View>
      </View>
    </View>
  )
}

function getLocaleTagLabel(locale: AppLocale) {
  return locale === "ar-EG" ? "ar-EG" : "en"
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    gap: spacing.md,
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
    textAlign: "left",
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.neutral[600],
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.md,
    textAlign: "left",
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    textAlign: "left",
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm,
    textAlign: "left",
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
  },
  optionSelected: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  optionContentRtl: {
    flexDirection: "row-reverse",
  },
  optionTextWrap: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    textAlign: "left",
  },
  optionValue: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    textAlign: "left",
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  radioSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  currentLanguagePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.neutral[100],
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currentLanguagePillRtl: {
    flexDirection: "row-reverse",
  },
  currentLanguageLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[600],
  },
  currentLanguageValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[700],
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
})

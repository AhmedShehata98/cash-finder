import { useMemo } from "react"
import type { DirectionId } from "@/hooks/useCompassDirection"
import type { FinancialServiceType, LocationType, ServiceProvider } from "@/types"
import { messages } from "./messages"
import { type AppLocale, useLocaleStore } from "@/store/locale-store"

type MessageValues = Record<string, string | number>
type TranslationKey = keyof (typeof messages)["en"]

function formatTemplate(template: string, values: MessageValues = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""))
}

function translate(locale: AppLocale, key: TranslationKey, values?: MessageValues) {
  const entry = messages[locale][key] ?? messages.en[key]
  if (typeof entry === "function") {
    return entry(values ?? {})
  }
  return formatTemplate(entry ?? "", values)
}

function formatNumber(locale: AppLocale, value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits, minimumFractionDigits: 0 }).format(
    value
  )
}

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

  const isRTL = locale === "ar-EG"

  const value = useMemo(() => {
    const t = (key: TranslationKey, values?: MessageValues) => translate(locale, key, values)

    return {
      locale,
      isRTL,
      setLocale,
      t,
      getCategoryLabel: (key: string) => t(`category.${key}` as TranslationKey),
      getFinancialServiceTypeLabel: (type: FinancialServiceType) =>
        t(`serviceType.${type}` as TranslationKey),
      getLocationTypeLabel: (type: LocationType) => t(`type.${type}` as TranslationKey),
      getProviderLabel: (provider: ServiceProvider) => t(`provider.${provider}` as TranslationKey),
      getDirectionLabel: (directionId: DirectionId) =>
        t(`direction.${directionId}` as TranslationKey),
      getLanguageLabel: (value: AppLocale) => t(`languages.${value}` as TranslationKey),
      formatDistance: (meters: number) => {
        if (meters < 1000) {
          return t("distance.metersAway", { value: formatNumber(locale, Math.round(meters)) })
        }

        const km = meters / 1000
        if (km < 10) {
          return t("distance.kilometersAwayDecimal", {
            value: formatNumber(locale, km, 1),
          })
        }

        return t("distance.kilometersAwayRounded", {
          value: formatNumber(locale, Math.round(km)),
        })
      },
      formatPercent: (value: number) => {
        return new Intl.NumberFormat(locale, {
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
          style: "percent",
        }).format(value / 100)
      },
      formatLastConfirmed: (value: string | null) => {
        if (!value) return t("location.lastConfirmedUnknown")

        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return t("location.lastConfirmedUnknown")

        return t("location.lastConfirmedValue", {
          value: new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(date),
        })
      },
      formatRelativeTime: (value: string) => {
        const timestamp = new Date(value).getTime()
        if (Number.isNaN(timestamp)) return t("misc.unavailable")
        const seconds = Math.round((timestamp - Date.now()) / 1000)
        const RelativeTimeFormat = Intl.RelativeTimeFormat
        if (typeof RelativeTimeFormat !== "function") {
          return new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(timestamp))
        }
        const formatter = new RelativeTimeFormat(locale, { numeric: "auto" })
        if (Math.abs(seconds) < 60) return formatter.format(seconds, "second")
        const minutes = Math.round(seconds / 60)
        if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute")
        const hours = Math.round(minutes / 60)
        if (Math.abs(hours) < 24) return formatter.format(hours, "hour")
        return formatter.format(Math.round(hours / 24), "day")
      },
      formatRemainingDistance: (meters: number | null) => {
        if (meters === null) return t("misc.unavailable")
        if (meters < 1000) {
          return t("distance.metersAway", { value: formatNumber(locale, Math.round(meters)) })
        }

        const km = meters / 1000
        if (km < 10) {
          return t("distance.kilometersAwayDecimal", {
            value: formatNumber(locale, km, 1),
          })
        }

        return t("distance.kilometersAwayRounded", {
          value: formatNumber(locale, Math.round(km)),
        })
      },
      formatEta: (seconds: number | null) => {
        if (seconds === null) return t("misc.unavailable")
        const minutes = Math.round(seconds / 60)
        if (minutes < 60) {
          return t("eta.minutes", { value: formatNumber(locale, minutes) })
        }

        const hours = Math.floor(minutes / 60)
        const remainingMinutes = minutes % 60

        if (remainingMinutes > 0) {
          return t("eta.hoursMinutes", {
            hours: formatNumber(locale, hours),
            minutes: formatNumber(locale, remainingMinutes),
          })
        }

        return t("eta.hoursOnly", { hours: formatNumber(locale, hours) })
      },
    }
  }, [isRTL, locale, setLocale])

  return value
}

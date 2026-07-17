import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const DEFAULT_LOCALE = "ar-EG"

export const supportedLocales = [DEFAULT_LOCALE, "en"] as const

export type AppLocale = (typeof supportedLocales)[number]

type LocaleState = {
  locale: AppLocale
  hasHydrated: boolean
  setLocale: (_locale: AppLocale) => void
  setHasHydrated: (_value: boolean) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      hasHydrated: false,
      setLocale: (locale) => set({ locale }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "cash-finder-locale",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

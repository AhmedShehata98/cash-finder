import { create } from "zustand"
import type { FinancialLocation } from "@/types"
import type { RouteLeg, TransportMode } from "@/services/places"

type NavigationState = {
  isActive: boolean
  destination: FinancialLocation | null
  route: RouteLeg[] | null
  transportMode: TransportMode | null
  remainingDistance: number | null
  remainingDuration: number | null
  deviationCount: number
  isRecalculating: boolean
  navigationError: string | null

  startNavigation: (_destination: FinancialLocation, _transportMode: TransportMode) => void
  setRoute: (_route: RouteLeg[]) => void
  updateRemaining: (_distance: number, _duration: number) => void
  setRecalculating: (_value: boolean) => void
  incrementDeviation: () => void
  setNavigationError: (_error: string | null) => void
  stopNavigation: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  isActive: false,
  destination: null,
  route: null,
  transportMode: null,
  remainingDistance: null,
  remainingDuration: null,
  deviationCount: 0,
  isRecalculating: false,
  navigationError: null,

  startNavigation: (destination, transportMode) =>
    set({
      isActive: true,
      destination,
      transportMode,
      route: null,
      remainingDistance: null,
      remainingDuration: null,
      deviationCount: 0,
      isRecalculating: true,
      navigationError: null,
    }),

  setRoute: (route) =>
    set({
      route,
      isRecalculating: false,
    }),

  updateRemaining: (distance, duration) => {
    const state = get()
    if (state.remainingDistance === distance && state.remainingDuration === duration) {
      return
    }
    set({ remainingDistance: distance, remainingDuration: duration })
  },

  setRecalculating: (value) => set({ isRecalculating: value }),

  incrementDeviation: () => set((state) => ({ deviationCount: state.deviationCount + 1 })),

  setNavigationError: (error) => set({ navigationError: error }),

  stopNavigation: () =>
    set({
      isActive: false,
      destination: null,
      route: null,
      transportMode: null,
      remainingDistance: null,
      remainingDuration: null,
      deviationCount: 0,
      isRecalculating: false,
      navigationError: null,
    }),
}))
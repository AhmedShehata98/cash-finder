 
import { create } from "zustand"

type AppState = {
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}))

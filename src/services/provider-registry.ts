import { createHereMapsProvider, PlacesProvider } from "./places"

let currentProvider: PlacesProvider | null = null

export function getPlacesProvider(): PlacesProvider {
  if (!currentProvider) {
    currentProvider = createHereMapsProvider()
  }
  return currentProvider
}

export function setPlacesProvider(provider: PlacesProvider): void {
  currentProvider = provider
}

export type { PlacesProvider } from "./places"

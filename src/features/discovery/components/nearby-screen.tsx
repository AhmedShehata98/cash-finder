import { CategoryFilterSheet } from "@/components/CategoryFilterSheet"
import { EmptyState } from "@/components/EmptyState"
import { ErrorState } from "@/components/ErrorState"
import { FilterButton } from "@/components/FilterButton"
import { PermissionState } from "@/components/PermissionState"
import { SearchBar } from "@/components/SearchBar"
import { SkeletonCard } from "@/components/SkeletonCard"
import { ALL_CATEGORIES_KEY, getCategoryDefinition } from "@/constants/service-categories"
import { useLocation } from "@/hooks"
import { useI18n } from "@/i18n"
import { colors } from "@/theme"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useNearbyLocations } from "../hooks/useNearbyLocations"
import { LocationList } from "./LocationList"

const SEARCH_RADIUS = 5000
const PAGE_LIMIT = 20
const LIVE_UPDATE_INTERVAL_MS = 15000
const LIVE_UPDATE_DISTANCE_METERS = 75

function flattenAndDeduplicate<T extends { id: string }>(pages: { items: T[] }[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const page of pages) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }
    }
  }

  return result
}

export function NearbyScreen() {
  const { t, getCategoryLabel } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("atm")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isPullRefreshing, setIsPullRefreshing] = useState(false)

  const queryClient = useQueryClient()

  const {
    location: userLocation,
    loading: locationLoading,
    error: locationError,
    refreshLocation,
  } = useLocation({
    enableHighAccuracy: true,
    interval: LIVE_UPDATE_INTERVAL_MS,
    distanceInterval: LIVE_UPDATE_DISTANCE_METERS,
  })

  const selectedCategoryDef = getCategoryDefinition(selectedCategory)
  const categoryFilterCategories = selectedCategoryDef?.categories

  const {
    data,
    isLoading,
    isError,
    error: queryError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useNearbyLocations({
    latitude: userLocation?.latitude ?? null,
    longitude: userLocation?.longitude ?? null,
    radius: SEARCH_RADIUS,
    limit: PAGE_LIMIT,
    query: searchQuery,
    categories: categoryFilterCategories,
  })

  const locations = useMemo(() => {
    return data ? flattenAndDeduplicate(data.pages) : []
  }, [data])

  const reloadNearbyLocations = useCallback(async () => {
    await queryClient.resetQueries({ queryKey: ["nearby-locations"] })
  }, [queryClient])

  const handleRefresh = useCallback(async () => {
    setIsPullRefreshing(true)

    try {
      await refreshLocation()
      await reloadNearbyLocations()
    } finally {
      setIsPullRefreshing(false)
    }
  }, [refreshLocation, reloadNearbyLocations])

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handlePermissionRequest = useCallback(() => {
    void handleRefresh()
  }, [handleRefresh])

  const handleClearSearch = useCallback(() => {
    setSearchQuery("")
  }, [])

  const filterLabel = selectedCategoryDef
    ? getCategoryLabel(selectedCategoryDef.key)
    : t("discover.filter")
  const isFilterActive = selectedCategory !== ALL_CATEGORIES_KEY

  const searchHeader = (
    <SearchBar
      value={searchQuery}
      onChangeText={setSearchQuery}
      onClear={handleClearSearch}
      filterButton={
        <FilterButton
          label={filterLabel}
          onPress={() => setIsFilterSheetOpen(true)}
          isActive={isFilterActive}
        />
      }
    />
  )

  const categoryFilterSheet = (
    <CategoryFilterSheet
      isOpen={isFilterSheetOpen}
      onClose={() => setIsFilterSheetOpen(false)}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
    />
  )

  if (locationLoading) {
    return (
      <View style={styles.container}>
        {searchHeader}
        <SkeletonCard count={5} />
      </View>
    )
  }

  if (locationError) {
    return (
      <View style={styles.container}>
        <PermissionState onRequestPermission={handlePermissionRequest} />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.container}>
        {searchHeader}
        <ErrorState
          message={
            queryError?.message ||
            t("discover.errorMessageNearby")
          }
          onRetry={handleRefresh}
        />
      </View>
    )
  }

  if (!isLoading && locations.length === 0) {
    return (
      <View style={styles.container}>
        {searchHeader}
        <EmptyState onRefresh={handleRefresh} />
        {categoryFilterSheet}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {searchHeader}
      <LocationList
        locations={locations}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        refreshing={isPullRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
      />
      {categoryFilterSheet}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
})

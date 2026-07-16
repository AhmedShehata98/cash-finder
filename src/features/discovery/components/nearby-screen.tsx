import { useState, useCallback, useMemo } from "react"
import { View, StyleSheet } from "react-native"
import { useLocation } from "@/hooks"
import { useNearbyLocations } from "../hooks/useNearbyLocations"
import { SearchBar } from "@/components/SearchBar"
import { EmptyState } from "@/components/EmptyState"
import { ErrorState } from "@/components/ErrorState"
import { PermissionState } from "@/components/PermissionState"
import { CategoryFilterBar } from "./CategoryFilterBar"
import { LocationList } from "./LocationList"
import { serviceCategories } from "@/constants/service-categories"
import { colors } from "@/theme"

const SEARCH_RADIUS = 5000
const SEARCH_LIMIT = 50

export function NearbyScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const {
    location: userLocation,
    loading: locationLoading,
    error: locationError,
  } = useLocation({ oneTime: true, enableHighAccuracy: true })

  const {
    data: locations = [],
    isLoading,
    isError,
    error: queryError,
    isFetching,
    refetch,
  } = useNearbyLocations({
    latitude: userLocation?.latitude ?? null,
    longitude: userLocation?.longitude ?? null,
    radius: SEARCH_RADIUS,
    limit: SEARCH_LIMIT,
  })

  const selectedCategoryDef = useMemo(
    () => serviceCategories.find((c) => c.key === selectedCategory),
    [selectedCategory]
  )

  const filteredLocations = useMemo(() => {
    let filtered = locations

    if (selectedCategory !== "all" && selectedCategoryDef) {
      filtered = filtered.filter((loc) => {
        if (selectedCategoryDef.locationType && loc.type !== selectedCategoryDef.locationType) {
          return false
        }
        if (
          selectedCategoryDef.serviceProvider &&
          loc.provider !== selectedCategoryDef.serviceProvider
        ) {
          return false
        }
        return true
      })
    }

    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          loc.address.toLowerCase().includes(query) ||
          (loc.provider && loc.provider.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [locations, selectedCategory, searchQuery, selectedCategoryDef])

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleEndReached = useCallback(() => {
    // Pagination placeholder — HERE Maps Browse API returns all results in one call
    // Extend radius or use offset-based browsing for true pagination with a provider that supports it
  }, [])

  const handlePermissionRequest = useCallback(() => {
    refetch()
  }, [refetch])

  if (locationLoading) {
    return (
      <View style={styles.container}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery("")} />
        <CategoryFilterBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        <EmptyState onRefresh={handleRefresh} />
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
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery("")} />
        <CategoryFilterBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        <ErrorState
          message={
            queryError?.message ||
            "Unable to load nearby locations. Please check your connection and try again."
          }
          onRetry={handleRefresh}
        />
      </View>
    )
  }

  if (!isLoading && filteredLocations.length === 0) {
    return (
      <View style={styles.container}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery("")} />
        <CategoryFilterBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        <EmptyState onRefresh={handleRefresh} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} onClear={() => setSearchQuery("")} />
      <CategoryFilterBar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <LocationList
        locations={filteredLocations}
        loading={isLoading}
        refreshing={isFetching && !isLoading}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
})

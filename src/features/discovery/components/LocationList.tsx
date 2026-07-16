import { FlatList, RefreshControl, StyleSheet } from "react-native"
import { FinancialLocation } from "@/types"
import { LocationCard } from "@/components/LocationCard"
import { SkeletonCard } from "@/components/SkeletonCard"
import { spacing } from "@/theme"

type LocationListProps = {
  locations: FinancialLocation[]
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
  onEndReached: () => void
}

export function LocationList({
  locations,
  loading,
  refreshing,
  onRefresh,
  onEndReached,
}: LocationListProps) {
  if (loading && locations.length === 0) {
    return <SkeletonCard count={5} />
  }

  return (
    <FlatList
      data={locations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <LocationCard item={item} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <SkeletonCard count={2} /> : null}
      accessibilityLabel="Nearby financial locations list"
    />
  )
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: spacing.sm,
  },
})

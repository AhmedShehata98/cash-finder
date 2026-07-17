import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native"
import { FinancialLocation } from "@/types"
import { LocationCard } from "@/components/LocationCard"
import { SkeletonCard } from "@/components/SkeletonCard"
import { colors, spacing } from "@/theme"

type LocationListProps = {
  locations: FinancialLocation[]
  isLoading: boolean
  isFetchingNextPage: boolean
  refreshing: boolean
  onRefresh: () => void
  onEndReached: () => void
}

export function LocationList({
  locations,
  isLoading,
  isFetchingNextPage,
  refreshing,
  onRefresh,
  onEndReached,
}: LocationListProps) {
  if (isLoading && locations.length === 0) {
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.primary[600]} />
            <SkeletonCard count={2} />
          </View>
        ) : null
      }
      accessibilityLabel="Nearby financial locations list"
    />
  )
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.sm,
  },
})

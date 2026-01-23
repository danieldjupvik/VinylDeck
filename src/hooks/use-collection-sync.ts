// src/hooks/use-collection-sync.ts

/**
 * Detects changes in user's Discogs collection by comparing
 * cached data with live metadata.
 *
 * Runs fast metadata check (1 API call) on window focus to detect
 * new/deleted items without refetching expensive full collection.
 *
 * @returns Change detection state and counts
 */
export function useCollectionSync(): {
  hasChanges: boolean
  newItemsCount: number
  deletedItemsCount: number
} {
  // Stub implementation - full sync detection will be implemented later
  // after completing the storage migration
  return {
    hasChanges: false,
    newItemsCount: 0,
    deletedItemsCount: 0
  }
}

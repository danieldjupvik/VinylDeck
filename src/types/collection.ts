import type { SortOrder } from '@/types/discogs'

/**
 * Represents a count of non-vinyl items by format type.
 * Used in collection views to show breakdown of filtered-out formats.
 */
export interface NonVinylBreakdownItem {
  format: string
  count: number
}

/**
 * Client-side sort keys for collection view.
 * Includes UI-only options (genre, random) not supported by the Discogs API.
 */
export type CollectionSortKey =
  | 'artist'
  | 'title'
  | 'label'
  | 'releaseYear'
  | 'format'
  | 'added'
  | 'genre'
  | 'random'

/**
 * Sort direction for collection view.
 */
export type CollectionSortOrder = SortOrder

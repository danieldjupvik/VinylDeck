/**
 * Discogs types - single entry point for all Discogs-related types.
 * Imports discojs types and augments them with missing fields.
 */

import './augment.js'
import type { Discojs } from 'discojs'

/**
 * ==============================================================================
 * Type Extraction from discojs
 * ==============================================================================
 * discojs uses inline intersection types rather than named exports.
 * We extract types via ReturnType inference from the Discojs class methods.
 */

/**
 * User identity from GET /oauth/identity
 */
export type Identity = Awaited<ReturnType<Discojs['getIdentity']>>

/**
 * User profile from GET /users/{username}
 * Extended to include banner_url which discojs doesn't type.
 */
type DiscogsUserProfileBase = Awaited<ReturnType<Discojs['getProfile']>>
export type User = DiscogsUserProfileBase & {
  /**
   * User's banner image URL
   * @optional Users without custom banners may not have this field
   */
  banner_url?: string
  /**
   * User's avatar image URL
   * NOTE: discojs types this as required string, but API may omit for users without avatars
   */
  avatar_url?: string
}

/**
 * Pagination metadata returned by collection endpoints
 */
type CollectionResponseBase = Awaited<
  ReturnType<Discojs['listItemsByReleaseForUser']>
>
export type Pagination = CollectionResponseBase['pagination']

/**
 * Collection release item (single item in user's collection)
 */
export type CollectionRelease = CollectionResponseBase['releases'][number] & {
  /**
   * Basic information is typed as intersection in discojs
   * We flatten it here for easier consumption
   */
  basic_information: BasicInformation
}

/**
 * Basic information about a release (nested in CollectionRelease)
 */
export type BasicInformation =
  CollectionResponseBase['releases'][number]['basic_information']

/**
 * Collection response from GET /users/{username}/collection/folders/{folder_id}/releases
 */
export interface CollectionResponse {
  pagination: Pagination
  releases: CollectionRelease[]
}

/**
 * ==============================================================================
 * OAuth Types (from @lionralfs/discogs-client)
 * ==============================================================================
 */

// eslint-disable-next-line import-x/no-unused-modules -- Types exported for use after migration in Task 3
export type { RequestTokenResult, AccessTokenResult } from './oauth.js'
export type { OAuthTokens, OAuthRequestTokens } from './oauth.js'

/**
 * ==============================================================================
 * Application-Specific Types (not from discojs)
 * ==============================================================================
 * These types are specific to VinylDeck's client-side sorting and filtering.
 */

/**
 * Client-side sort keys for collection
 */
export type CollectionSortKey =
  | 'artist'
  | 'title'
  | 'label'
  | 'year'
  | 'format'
  | 'added'
  | 'rating'

/**
 * Discogs API sort keys (snake_case)
 */
export type DiscogsCollectionSortKey =
  | 'artist'
  | 'title'
  | 'label'
  | 'year'
  | 'catno'
  | 'format'
  | 'added'
  | 'rating'

/**
 * Sort order
 */
export type CollectionSortOrder = 'asc' | 'desc'

/**
 * Format information structure
 */
export interface DiscogsFormat {
  name: string
  qty: string
  descriptions?: string[]
  text?: string
}

/**
 * Re-export commonly used aliases for backwards compatibility
 */
export type DiscogsCollectionRelease = CollectionRelease
export type DiscogsPagination = Pagination
export type DiscogsCollectionResponse = CollectionResponse
export type DiscogsUserProfile = User
export type DiscogsIdentity = Identity
export type DiscogsBasicInformation = BasicInformation

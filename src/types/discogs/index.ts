/**
 * Discogs types — auto-derived from discojs via mapped types.
 *
 * All return types are extracted at compile time from the Discojs class.
 * When discojs updates, these types update automatically — zero maintenance.
 *
 * Use DiscojsAPI['methodName'] for ad-hoc access to any endpoint type.
 * Use the friendly aliases below for commonly referenced types.
 */

import type {
  CommunityStatusesEnum,
  CurrenciesEnum,
  DataQualityEnum,
  Discojs,
  EditOrderStatusesEnum,
  InventorySortEnum,
  InventoryStatusesEnum,
  ListingStatusesEnum,
  OrderMessageTypesEnum,
  OrderSortEnum,
  OrderStatusesEnum,
  ReleaseConditionsEnum,
  ReleaseSortEnum,
  SearchTypeEnum,
  SleeveConditionsEnum,
  SortOrdersEnum,
  UserSortEnum
} from 'discojs'

/**
 * ==============================================================================
 * Core: Auto-derived API type map
 * ==============================================================================
 * Extracts the resolved return type of every async method on the Discojs class.
 * AsyncGenerator methods (getAll*) are excluded — they yield the same item
 * types as their paginated counterparts.
 */

type PromiseMethod = (...args: never[]) => Promise<unknown>

type PromiseMethodKeys<T> = {
  [K in keyof T]-?: T[K] extends PromiseMethod ? K : never
}[keyof T]

export type DiscojsAPI = {
  [K in PromiseMethodKeys<Discojs>]: Awaited<
    ReturnType<Extract<Discojs[K], PromiseMethod>>
  >
}

/**
 * ==============================================================================
 * Enum value types (string unions derived from discojs enums)
 * ==============================================================================
 * Template literal types extract enum values as string unions.
 * These are type-only — zero runtime cost on the client.
 */

export type UserSort = `${UserSortEnum}`
export type SortOrder = `${SortOrdersEnum}`
export type ReleaseSort = `${ReleaseSortEnum}`
export type SearchType = `${SearchTypeEnum}`
export type Currency = `${CurrenciesEnum}`
export type ReleaseCondition = `${ReleaseConditionsEnum}`
export type SleeveCondition = `${SleeveConditionsEnum}`
export type InventoryStatus = `${InventoryStatusesEnum}`
export type InventorySort = `${InventorySortEnum}`
export type ListingStatus = `${ListingStatusesEnum}`
export type OrderStatus = `${OrderStatusesEnum}`
export type EditOrderStatus = `${EditOrderStatusesEnum}`
export type OrderSort = `${OrderSortEnum}`
export type OrderMessageType = `${OrderMessageTypesEnum}`
export type DataQuality = `${DataQualityEnum}`
export type CommunityStatus = `${CommunityStatusesEnum}`

/**
 * ==============================================================================
 * Database
 * ==============================================================================
 * Release, master, artist, and label lookups.
 * @see https://www.discogs.com/developers#page:database
 */

/** Full release details from GET /releases/{release_id} */
export type Release = DiscojsAPI['getRelease']

/** User's rating for a specific release */
export type ReleaseRating = DiscojsAPI['getReleaseRatingForUser']

/** Community rating aggregate for a release */
export type CommunityReleaseRating = DiscojsAPI['getCommunityReleaseRating']

/** num_have / num_want stats for a release */
export type ReleaseStats = DiscojsAPI['getReleaseStats']

/** Master release from GET /masters/{master_id} */
export type Master = DiscojsAPI['getMaster']

/** Paginated versions of a master release */
export type MasterVersionsPage = DiscojsAPI['getMasterVersions']

/** Artist details from GET /artists/{artist_id} */
export type Artist = DiscojsAPI['getArtist']

/** Paginated releases by an artist */
export type ArtistReleasesPage = DiscojsAPI['getArtistReleases']

/** Label details from GET /labels/{label_id} */
export type Label = DiscojsAPI['getLabel']

/** Paginated releases on a label */
export type LabelReleasesPage = DiscojsAPI['getLabelReleases']

/**
 * ==============================================================================
 * Search
 * ==============================================================================
 * @see https://www.discogs.com/developers#page:database,header:database-search
 */

/** Search results from GET /database/search */
export type SearchResults = DiscojsAPI['searchDatabase']

/**
 * ==============================================================================
 * User Identity
 * ==============================================================================
 * Identity, profile, submissions, and contributions.
 * @see https://www.discogs.com/developers#page:user-identity
 */

/** Authenticated user identity from GET /oauth/identity */
export type Identity = DiscojsAPI['getIdentity']

/**
 * User profile from GET /users/{username}
 * Extended with banner_url which discojs doesn't type.
 */
export type User = DiscojsAPI['getProfile'] & {
  banner_url?: string
}

/** Paginated user submissions */
export type SubmissionsPage = DiscojsAPI['getSubmissionsForUser']

/** Paginated user contributions */
export type ContributionsPage = DiscojsAPI['getContributionsForUser']

/**
 * ==============================================================================
 * User Collection
 * ==============================================================================
 * Folders, releases, custom fields, and collection value.
 * @see https://www.discogs.com/developers#page:user-collection
 */

/** All folders for a user */
export type CollectionFolders = DiscojsAPI['listFoldersForUser']

/** Single collection folder */
export type CollectionFolder = DiscojsAPI['getFolderForUser']

/** Paginated releases in a collection folder (the main collection endpoint) */
export type CollectionReleasesPage = DiscojsAPI['listItemsInFolderForUser']

/** Paginated instances of a specific release in a user's collection */
export type ReleaseInstancesPage = DiscojsAPI['listItemsByReleaseForUser']

/** Result of adding a release to a folder */
export type CollectionAddResult = DiscojsAPI['addReleaseToFolder']

/** Custom fields for a user's collection */
export type CustomFields = DiscojsAPI['listCustomFieldsForUser']

/** Collection value (minimum, median, maximum) */
export type CollectionValue = DiscojsAPI['getCollectionValue']

/**
 * Commonly used nested types extracted from collection responses.
 */

export interface CollectionReleasesQueryOptions {
  page?: number | undefined
  perPage?: number | undefined
  sort?: UserSort | undefined
  sortOrder?: SortOrder | undefined
}

/** Single release item in a user's collection */
export type CollectionRelease = CollectionReleasesPage['releases'][number]

/** Basic information nested within a collection release */
export type BasicInformation = CollectionRelease['basic_information']

/** Format entry (Vinyl, CD, etc.) within basic information */
export type Format = BasicInformation['formats'][number]

/** Pagination metadata returned by paginated endpoints */
export type Pagination = CollectionReleasesPage['pagination']

/**
 * ==============================================================================
 * User Wantlist
 * ==============================================================================
 * @see https://www.discogs.com/developers#page:user-wantlist
 */

/** Paginated wantlist */
export type WantlistPage = DiscojsAPI['getWantlistForUser']

/** Single wantlist entry (result of adding to wantlist) */
export type WantlistItem = DiscojsAPI['addToWantlist']

/**
 * ==============================================================================
 * User Lists
 * ==============================================================================
 * @see https://www.discogs.com/developers#page:user-lists
 */

/** Paginated user lists */
export type ListsPage = DiscojsAPI['getListsForUser']

/** Items in a specific list */
export type ListItems = DiscojsAPI['getListItems']

/**
 * ==============================================================================
 * Marketplace
 * ==============================================================================
 * Orders, listings, pricing, and statistics.
 * @see https://www.discogs.com/developers#page:marketplace
 */

/** Order details */
export type Order = DiscojsAPI['getOrder']

/** Paginated order list */
export type OrdersPage = DiscojsAPI['listOrders']

/** Messages for an order */
export type OrderMessages = DiscojsAPI['listOrderMessages']

/** Result of sending an order message */
export type OrderMessageSent = DiscojsAPI['sendOrderMessage']

/** Price suggestions for a release */
export type PriceSuggestions = DiscojsAPI['getPriceSuggestions']

/** Marketplace statistics for a release */
export type MarketplaceStatistics = DiscojsAPI['getMarketplaceStatistics']

/**
 * ==============================================================================
 * Inventory
 * ==============================================================================
 * Listings and inventory management.
 * @see https://www.discogs.com/developers#page:inventory
 */

/** Paginated inventory listings */
export type InventoryPage = DiscojsAPI['getInventoryForUser']

/** Single marketplace listing */
export type Listing = DiscojsAPI['getListing']

/** Result of creating a listing */
export type ListingCreated = DiscojsAPI['createListing']

/** Paginated inventory exports */
export type ExportsPage = DiscojsAPI['getRecentExports']

/** Single export details */
export type ExportDetails = DiscojsAPI['getExport']

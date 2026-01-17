/**
 * Response from GET /oauth/identity
 * Returns basic information about the authenticated user.
 * Note: Does NOT include email - use getUserProfile() for that.
 */
export interface DiscogsIdentity {
  id: number
  username: string
  resource_url: string
  consumer_name?: string
  avatar_url?: string
}

/**
 * Response from GET /users/{username}
 * Retrieves a user profile by username.
 * Note: email field is ONLY visible if authenticated as the requested user.
 * Note: num_collection/num_wantlist are only visible if authenticated as the user or if collection/wantlist is public.
 */
export interface DiscogsUserProfile {
  id: number
  username: string
  resource_url: string
  uri?: string
  profile?: string
  name?: string
  home_page?: string
  location?: string
  registered?: string
  rank?: number
  num_pending?: number
  num_for_sale?: number
  num_collection?: number
  num_wantlist?: number
  num_lists?: number
  releases_contributed?: number
  releases_rated?: number
  rating_avg?: number
  buyer_rating?: number
  buyer_rating_stars?: number
  buyer_num_ratings?: number
  seller_rating?: number
  seller_rating_stars?: number
  seller_num_ratings?: number
  curr_abbr?: string
  avatar_url?: string
  banner_url?: string
  wantlist_url?: string
  inventory_url?: string
  collection_folders_url?: string
  collection_fields_url?: string
  /** Only visible if authenticated as the requested user */
  email?: string
}

export interface DiscogsArtist {
  id: number
  name: string
  resource_url?: string
  /** Artist name variation */
  anv?: string
  /** String to join multiple artists */
  join?: string
  /** Artist role on the release */
  role?: string
  /** Tracks the artist appears on */
  tracks?: string
}

export interface DiscogsLabel {
  id?: number
  name: string
  /** Catalog number */
  catno: string
  resource_url?: string
  entity_type?: string
  entity_type_name?: string
}

export interface DiscogsFormat {
  name: string
  /** Quantity */
  qty: string
  text?: string
  /** Format descriptions (e.g., "Mini", "EP", "Album") */
  descriptions?: string[]
}

/**
 * Basic information about a release.
 * Suitable for display in a list. For detailed information,
 * make another API call to fetch the corresponding release.
 */
export interface DiscogsBasicInformation {
  id: number
  title: string
  year: number
  resource_url: string
  /** Thumbnail image URL (150x150) */
  thumb: string
  /** Cover image URL (500x500) */
  cover_image: string
  formats: DiscogsFormat[]
  labels: DiscogsLabel[]
  artists: DiscogsArtist[]
  country?: string
  genres: string[]
  styles: string[]
  master_id?: number
  master_url?: string
}

/**
 * A single item in a user's collection.
 * Part of the response from GET /users/{username}/collection/folders/{folder_id}/releases
 */
export interface DiscogsCollectionRelease {
  /** Release ID */
  id: number
  /** Unique instance ID for this item in the collection */
  instance_id: number
  /** ISO 8601 date when added to collection */
  date_added: string
  /** User's rating (0-5) */
  rating: number
  /** Basic release information */
  basic_information: DiscogsBasicInformation
  /** Folder ID this release is in */
  folder_id?: number
  /**
   * Custom notes fields.
   * Note: If not authenticated as collection owner, only public notes are visible.
   */
  notes?: Array<{
    field_id: number
    value: string
  }>
}

export interface DiscogsPagination {
  page: number
  pages: number
  per_page: number
  items: number
  urls: {
    first?: string
    prev?: string
    next?: string
    last?: string
  }
}

/**
 * Response from GET /users/{username}/collection/folders/{folder_id}/releases
 * Returns paginated list of items in a user's collection folder.
 *
 * Authentication requirements:
 * - If folder_id is not 0, or collection is private: auth as owner required
 * - If not authenticated as owner: only public notes fields are visible
 */
export interface DiscogsCollectionResponse {
  pagination: DiscogsPagination
  releases: DiscogsCollectionRelease[]
}

/** Client-side sort keys (may differ from API sort keys) */
export type CollectionSortKey =
  | 'artist'
  | 'title'
  | 'added'
  | 'genre'
  | 'releaseYear'
  | 'label'
  | 'format'
  | 'random'

/**
 * Valid sort keys for GET /users/{username}/collection/folders/{folder_id}/releases
 * API accepts: label, artist, title, catno, format, rating, added, year
 */
export type DiscogsCollectionSortKey =
  | 'artist'
  | 'title'
  | 'added'
  | 'year'
  | 'label'
  | 'format'
  | 'catno'
  | 'rating'

/** Sort order for collection items */
export type CollectionSortOrder = 'asc' | 'desc'

/**
 * Parameters for fetching collection items
 * Used with GET /users/{username}/collection/folders/{folder_id}/releases
 */
export interface CollectionParams {
  page?: number
  perPage?: number
  sort?: DiscogsCollectionSortKey
  sortOrder?: CollectionSortOrder
}

/**
 * A single item in a user's wantlist.
 * Part of the response from GET /users/{username}/wants
 */
export interface DiscogsWantlistItem {
  /** Release ID */
  id: number
  resource_url: string
  /** User's rating (0-5) */
  rating: number
  /** Basic release information */
  basic_information: DiscogsBasicInformation
  /**
   * User notes for this want.
   * Only visible if authenticated as the wantlist owner.
   */
  notes?: string
}

/**
 * Response from GET /users/{username}/wants
 * Returns paginated list of items in a user's wantlist.
 *
 * Authentication requirements:
 * - If wantlist is private: auth as owner required
 * - notes field: Only visible if authenticated as owner
 */
export interface DiscogsWantlistResponse {
  pagination: DiscogsPagination
  wants: DiscogsWantlistItem[]
}

/**
 * Community statistics for a release
 */
export interface DiscogsCommunity {
  contributors: Array<{
    resource_url: string
    username: string
  }>
  data_quality: string
  /** Number of users who have this release */
  have: number
  rating: {
    average: number
    count: number
  }
  status: string
  submitter: {
    resource_url: string
    username: string
  }
  /** Number of users who want this release */
  want: number
}

/**
 * Company/label involved in a release
 */
export interface DiscogsCompany {
  catno: string
  entity_type: string
  entity_type_name: string
  id: number
  name: string
  resource_url: string
}

/**
 * Identifier (barcode, matrix, etc.) for a release
 */
export interface DiscogsIdentifier {
  type: string
  value: string
  description?: string
}

/**
 * Image for a release
 */
export interface DiscogsImage {
  height: number
  width: number
  resource_url: string
  type: 'primary' | 'secondary'
  uri: string
  uri150: string
}

/**
 * Track in a release
 */
export interface DiscogsTrack {
  position: string
  title: string
  type_: string
  duration?: string
  extraartists?: DiscogsArtist[]
}

/**
 * Video for a release
 */
export interface DiscogsVideo {
  uri: string
  title: string
  description: string
  duration: number
  embed: boolean
}

/**
 * Response from GET /releases/{release_id}
 * Detailed information about a specific release.
 */
export interface DiscogsRelease {
  id: number
  title: string
  artists: DiscogsArtist[]
  data_quality: string
  thumb: string
  community: DiscogsCommunity
  companies?: DiscogsCompany[]
  country?: string
  date_added: string
  date_changed: string
  estimated_weight?: number
  extraartists?: DiscogsArtist[]
  format_quantity: number
  formats: DiscogsFormat[]
  genres: string[]
  identifiers?: DiscogsIdentifier[]
  images?: DiscogsImage[]
  labels: DiscogsLabel[]
  /** Lowest price for sale in marketplace (in user's currency) */
  lowest_price?: number
  /** Number currently for sale in marketplace */
  num_for_sale?: number
  master_id?: number
  master_url?: string
  notes?: string
  /** Release year (e.g., "1987") */
  released?: string
  released_formatted?: string
  resource_url: string
  series?: unknown[]
  status: string
  styles?: string[]
  tracklist: DiscogsTrack[]
  uri: string
  videos?: DiscogsVideo[]
  year: number
}

/**
 * Response from GET /masters/{master_id}
 * A master release represents a set of similar releases.
 */
export interface DiscogsMasterRelease {
  id: number
  title: string
  /** Main/primary release ID */
  main_release: number
  main_release_url: string
  uri: string
  resource_url: string
  versions_url: string
  artists: DiscogsArtist[]
  genres: string[]
  styles?: string[]
  year: number
  tracklist: DiscogsTrack[]
  images?: DiscogsImage[]
  videos?: DiscogsVideo[]
  data_quality: string
  /** Lowest price for sale in marketplace */
  lowest_price?: number
  /** Number currently for sale in marketplace */
  num_for_sale?: number
}

/**
 * Response from GET /users/{username}/collection/value
 * Returns the minimum, median, and maximum value of a user's collection.
 * Authentication as the collection owner is required.
 */
export interface DiscogsCollectionValue {
  minimum: string
  median: string
  maximum: string
}

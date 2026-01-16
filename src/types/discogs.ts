export interface DiscogsIdentity {
  id: number
  username: string
  resource_url: string
  consumer_name?: string
  avatar_url?: string
}

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
  email?: string
}

export interface DiscogsArtist {
  id: number
  name: string
  resource_url?: string
  anv?: string
  join?: string
  role?: string
  tracks?: string
}

export interface DiscogsLabel {
  id?: number
  name: string
  catno: string
  resource_url?: string
  entity_type?: string
  entity_type_name?: string
}

export interface DiscogsFormat {
  name: string
  qty: string
  text?: string
  descriptions?: string[]
}

export interface DiscogsBasicInformation {
  id: number
  title: string
  year: number
  resource_url: string
  thumb: string
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

export interface DiscogsCollectionRelease {
  id: number
  instance_id: number
  date_added: string
  rating: number
  basic_information: DiscogsBasicInformation
  folder_id?: number
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

export interface DiscogsCollectionResponse {
  pagination: DiscogsPagination
  releases: DiscogsCollectionRelease[]
}

export type CollectionSortKey =
  | 'artist'
  | 'title'
  | 'added'
  | 'genre'
  | 'releaseYear'
  | 'label'
  | 'format'
  | 'random'

export type DiscogsCollectionSortKey =
  | 'artist'
  | 'title'
  | 'added'
  | 'year'
  | 'label'
  | 'format'
export type CollectionSortOrder = 'asc' | 'desc'

export interface CollectionParams {
  page?: number
  perPage?: number
  sort?: DiscogsCollectionSortKey
  sortOrder?: CollectionSortOrder
}

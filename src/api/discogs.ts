import { apiClient } from './client'
import { COLLECTION } from '@/lib/constants'
import type {
  DiscogsIdentity,
  DiscogsCollectionResponse,
  DiscogsUserProfile,
  CollectionParams,
  DiscogsWantlistResponse,
  DiscogsRelease,
  DiscogsMasterRelease,
  DiscogsCollectionValue
} from '@/types/discogs'

/**
 * GET /oauth/identity
 * Validate token and get authenticated user's basic identity.
 * Use this to check who you're authenticated as and verify OAuth setup.
 * Note: Does NOT include email. For email, use getUserProfile().
 */
export async function getIdentity(): Promise<DiscogsIdentity> {
  const response = await apiClient.get<DiscogsIdentity>('/oauth/identity')
  return response.data
}

/**
 * GET /users/{username}
 * Retrieve a user's profile by username.
 *
 * Special visibility rules:
 * - email: Only visible if authenticated as the requested user
 * - num_collection/num_wantlist: Only visible if authenticated as user OR collection/wantlist is public
 * - num_list: Includes private lists only if authenticated as the requested user
 */
export async function getUserProfile(
  username: string
): Promise<DiscogsUserProfile> {
  const response = await apiClient.get<DiscogsUserProfile>(`/users/${username}`)
  return response.data
}

/**
 * Validate credentials by attempting to get identity.
 * Returns the identity if valid, throws if invalid.
 */
export async function validateCredentials(
  token: string
): Promise<DiscogsIdentity> {
  const response = await apiClient.get<DiscogsIdentity>('/oauth/identity', {
    headers: {
      Authorization: `Discogs token=${token}`
    }
  })
  return response.data
}

/**
 * GET /users/{username}/collection/folders/{folder_id}/releases
 * Get items in a user's collection folder. Defaults to folder 0 (All).
 *
 * Authentication requirements:
 * - If folder_id is not 0, or collection is private: auth as owner required
 * - If not authenticated as owner: only public notes fields are visible
 *
 * Valid sort keys: label, artist, title, catno, format, rating, added, year
 * Valid sort orders: asc, desc
 */
export async function getCollection(
  username: string,
  params: CollectionParams = {}
): Promise<DiscogsCollectionResponse> {
  const { page = 1, perPage = COLLECTION.PER_PAGE, sort, sortOrder } = params

  const response = await apiClient.get<DiscogsCollectionResponse>(
    `/users/${username}/collection/folders/0/releases`,
    {
      params: {
        page,
        per_page: perPage,
        sort: sort ?? undefined,
        sort_order: sortOrder ?? undefined
      }
    }
  )

  return response.data
}

/**
 * Check if a release is a vinyl record
 */
export function isVinylRecord(formats: { name: string }[]): boolean {
  return formats.some((format) => format.name === 'Vinyl')
}

/**
 * GET /users/{username}/wants
 * Get items in a user's wantlist. Accepts Pagination parameters.
 *
 * Authentication requirements:
 * - If wantlist is private: auth as owner required
 * - notes field: Only visible if authenticated as owner
 *
 * Basic information about each release is provided, suitable for display in a list.
 * For detailed information, make another API call to fetch the corresponding release.
 */
export async function getWantlist(
  username: string,
  params: { page?: number; perPage?: number } = {}
): Promise<DiscogsWantlistResponse> {
  const { page = 1, perPage = 50 } = params

  const response = await apiClient.get<DiscogsWantlistResponse>(
    `/users/${username}/wants`,
    {
      params: {
        page,
        per_page: perPage
      }
    }
  )

  return response.data
}

/**
 * GET /releases/{release_id}
 * Get detailed information about a specific release.
 *
 * Optional currency parameter (curr_abbr) for marketplace data.
 * Valid currencies: USD, GBP, EUR, CAD, AUD, JPY, CHF, MXN, BRL, NZD, SEK, ZAR
 * Defaults to authenticated user's currency.
 */
export async function getRelease(
  releaseId: number,
  currencyCode?: string
): Promise<DiscogsRelease> {
  const response = await apiClient.get<DiscogsRelease>(
    `/releases/${releaseId}`,
    {
      params: currencyCode ? { curr_abbr: currencyCode } : undefined
    }
  )

  return response.data
}

/**
 * GET /masters/{master_id}
 * Get a master release.
 *
 * A master release represents a set of similar releases.
 * Masters have a "main release" which is often the chronologically earliest.
 */
export async function getMasterRelease(
  masterId: number
): Promise<DiscogsMasterRelease> {
  const response = await apiClient.get<DiscogsMasterRelease>(
    `/masters/${masterId}`
  )

  return response.data
}

/**
 * GET /users/{username}/collection/value
 * Get the minimum, median, and maximum value of a user's collection.
 *
 * Authentication as the collection owner is required.
 */
export async function getCollectionValue(
  username: string
): Promise<DiscogsCollectionValue> {
  const response = await apiClient.get<DiscogsCollectionValue>(
    `/users/${username}/collection/value`
  )

  return response.data
}

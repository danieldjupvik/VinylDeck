/**
 * Data client wrapper using discojs.
 * Handles all non-OAuth data operations with rate limit retry.
 */

// Bare 'discojs' fails on Vercel — Node's ESM resolver ignores the "module" field
import { Discojs } from 'discojs/dist/index.es.js'

import { DiscogsApiError, DiscogsAuthError } from './errors.js'
import { withRateLimitRetry, RateLimitError } from './retry.js'

import type {
  CollectionReleasesQueryOptions,
  SortOrder,
  UserSort
} from '../../types/discogs/index.js'
import type { OAuthTokens } from '../../types/discogs/oauth.js'

declare const process: {
  env: {
    VITE_DISCOGS_CONSUMER_KEY?: string
    DISCOGS_CONSUMER_SECRET?: string
    npm_package_version?: string
  }
}

interface DiscogsErrorLike {
  name?: string
  statusCode?: number
}

type DiscojsSortOptions = NonNullable<
  Parameters<Discojs['listItemsInFolderForUser']>[2]
>
type DiscojsSortBy = NonNullable<DiscojsSortOptions['by']>
type DiscojsSortOrder = NonNullable<DiscojsSortOptions['order']>

const CONSUMER_KEY = process.env.VITE_DISCOGS_CONSUMER_KEY
const CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET
const APP_VERSION = process.env.npm_package_version ?? '1.0.0'

/**
 * Builds sort options for discojs, omitting undefined values.
 * Accepts string union types from tRPC and casts at the discojs boundary.
 */
function buildSortOptions(
  sort?: UserSort,
  order?: SortOrder
): DiscojsSortOptions | undefined {
  if (!sort) return undefined
  if (order) {
    return {
      by: sort as DiscojsSortBy,
      order: order as DiscojsSortOrder
    }
  }
  return { by: sort as DiscojsSortBy }
}

/**
 * Builds pagination options for discojs, omitting undefined values.
 */
function buildPagination(
  page?: number,
  perPage?: number
): { page?: number; perPage?: number } | undefined {
  if (page === undefined && perPage === undefined) return undefined
  return {
    ...(page !== undefined && { page }),
    ...(perPage !== undefined && { perPage })
  }
}

function getDiscogsStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const statusCode = (error as DiscogsErrorLike).statusCode
  return typeof statusCode === 'number' ? statusCode : undefined
}

function isAuthError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  return (error as DiscogsErrorLike).name === 'AuthError'
}

function createDataClientImpl(tokens?: OAuthTokens) {
  const clientConfig = tokens
    ? (() => {
        if (!CONSUMER_KEY || !CONSUMER_SECRET) {
          throw new DiscogsApiError('Missing OAuth credentials', {
            cause: new Error(
              'VITE_DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET not set'
            )
          })
        }

        return {
          consumerKey: CONSUMER_KEY,
          consumerSecret: CONSUMER_SECRET,
          oAuthToken: tokens.accessToken,
          oAuthTokenSecret: tokens.accessTokenSecret,
          userAgent: `VinylDeck/${APP_VERSION}`
        }
      })()
    : { userAgent: `VinylDeck/${APP_VERSION}` }

  const client = new Discojs(clientConfig)

  /**
   * Wraps discojs call with rate limit retry and error handling.
   */
  async function wrapCall<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await withRateLimitRetry(fn)
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error
      }

      if (isAuthError(error)) {
        const authErrorMessage = tokens
          ? 'Discogs authorization failed (token may be invalid, expired, or lacks access)'
          : 'Resource is private or requires owner authentication'

        throw new DiscogsAuthError(authErrorMessage, {
          cause: error,
          statusCode: 401
        })
      }

      const discogsStatusCode = getDiscogsStatusCode(error)

      if (discogsStatusCode !== undefined) {
        if (discogsStatusCode === 401 || discogsStatusCode === 403) {
          const authErrorMessage = tokens
            ? 'Discogs authorization failed (token may be invalid, expired, or lacks access)'
            : 'Resource is private or requires owner authentication'

          throw new DiscogsAuthError(authErrorMessage, {
            cause: error,
            statusCode: discogsStatusCode
          })
        }

        throw new DiscogsApiError(`${operation} failed`, {
          cause: error,
          statusCode: discogsStatusCode
        })
      }

      throw new DiscogsApiError(`${operation} failed`, { cause: error })
    }
  }

  return {
    /**
     * Get authenticated user's identity.
     * Requires authentication.
     *
     * @returns User identity from Discogs
     * @throws {DiscogsAuthError} When no tokens provided or tokens invalid
     */
    async getIdentity() {
      if (!tokens) {
        throw new DiscogsAuthError('Authentication required for getIdentity', {
          cause: new Error('No tokens provided to createDiscogsClient'),
          statusCode: 401
        })
      }

      return wrapCall('getIdentity', async () => {
        return await client.getIdentity()
      })
    },

    /**
     * Get user's collection releases.
     * Public collections can be fetched without authentication when folderId is 0.
     *
     * @param username - Discogs username
     * @param folderId - Folder ID (default: 0 for all)
     * @param options - Pagination and sorting options
     * @returns Collection releases with pagination
     * @throws {DiscogsAuthError} When folderId is non-zero without tokens or tokens are invalid
     */
    async getCollectionReleases(
      username: string,
      folderId: number = 0,
      options?: CollectionReleasesQueryOptions
    ) {
      if (!tokens && folderId !== 0) {
        throw new DiscogsAuthError(
          'Authentication required for non-zero collection folders',
          {
            cause: new Error('No tokens provided to createDiscogsClient'),
            statusCode: 401
          }
        )
      }

      return wrapCall('getCollectionReleases', async () => {
        const sortOptions = buildSortOptions(options?.sort, options?.sortOrder)
        const pagination = buildPagination(options?.page, options?.perPage)

        return await client.listItemsInFolderForUser(
          username,
          folderId,
          sortOptions,
          pagination
        )
      })
    },

    /**
     * Get user profile.
     * Public user profiles can be fetched without authentication.
     *
     * @param username - Discogs username
     * @returns User profile from Discogs
     * @throws {DiscogsAuthError} When provided tokens are invalid
     */
    async getUserProfile(username: string) {
      return wrapCall('getUserProfile', async () => {
        return await client.getProfileForUser(username)
      })
    },

    /**
     * Get collection metadata (total count only).
     * Fast endpoint using perPage=1 trick.
     * Public collections can be checked without authentication.
     *
     * @param username - Discogs username
     * @returns Object with totalCount property
     * @throws {DiscogsAuthError} When provided tokens are invalid or collection is private
     */
    async getCollectionMetadata(username: string) {
      return wrapCall('getCollectionMetadata', async () => {
        const response = await client.listItemsInFolderForUser(
          username,
          0,
          undefined,
          { page: 1, perPage: 1 }
        )
        return { totalCount: response.pagination.items }
      })
    }
  }
}

export type DataClient = ReturnType<typeof createDataClientImpl>

/**
 * Creates a data client for Discogs API operations.
 * Uses discojs library with rate limit retry wrapper.
 *
 * @param tokens - Optional OAuth tokens for authenticated operations
 * @returns Data client with getIdentity, getCollectionReleases, getUserProfile, and getCollectionMetadata methods
 * @throws {DiscogsApiError} When OAuth credentials are missing
 */
export function createDataClient(tokens?: OAuthTokens): DataClient {
  return createDataClientImpl(tokens)
}

/**
 * Data client wrapper using discojs.
 * Handles all non-OAuth data operations with rate limit retry.
 */

import { Discojs, DiscogsError, UserSortEnum, SortOrdersEnum } from 'discojs'

import { DiscogsApiError, DiscogsAuthError } from './errors.js'
import { withRateLimitRetry, RateLimitError } from './retry.js'

import type { OAuthTokens } from '../../types/discogs/oauth.js'

declare const process: {
  env: {
    VITE_DISCOGS_CONSUMER_KEY?: string
    DISCOGS_CONSUMER_SECRET?: string
    npm_package_version?: string
  }
}

const CONSUMER_KEY = process.env.VITE_DISCOGS_CONSUMER_KEY
const CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET
const APP_VERSION = process.env.npm_package_version ?? '1.0.0'

/**
 * Builds sort options for discojs, omitting undefined values.
 */
function buildSortOptions(
  sort?: UserSortEnum,
  order?: SortOrdersEnum
): { by: UserSortEnum; order?: SortOrdersEnum } | undefined {
  if (!sort) return undefined
  if (order) return { by: sort, order }
  return { by: sort }
}

/**
 * Builds pagination options for discojs, omitting undefined values.
 */
function buildPagination(
  page?: number,
  perPage?: number
): { page?: number; perPage?: number } | undefined {
  if (page === undefined && perPage === undefined) return undefined
  const result: { page?: number; perPage?: number } = {}
  if (page !== undefined) result.page = page
  if (perPage !== undefined) result.perPage = perPage
  return result
}

/**
 * Data client interface returned by createDataClient
 */
export interface DataClient {
  getIdentity(): Promise<Awaited<ReturnType<Discojs['getIdentity']>>>
  getCollectionReleases(
    username: string,
    folderId?: number,
    options?: {
      page?: number | undefined
      perPage?: number | undefined
      sort?: UserSortEnum | undefined
      sortOrder?: SortOrdersEnum | undefined
    }
  ): Promise<Awaited<ReturnType<Discojs['listItemsInFolderForUser']>>>
  getUserProfile(
    username: string
  ): Promise<Awaited<ReturnType<Discojs['getProfileForUser']>>>
}

/**
 * Creates a data client for Discogs API operations.
 * Uses discojs library with rate limit retry wrapper.
 *
 * @param tokens - Optional OAuth tokens for authenticated operations
 * @returns Data client with getIdentity, getCollectionReleases, and getUserProfile methods
 * @throws {DiscogsApiError} When OAuth credentials are missing
 */
export function createDataClient(tokens?: OAuthTokens): DataClient {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new DiscogsApiError('Missing OAuth credentials', {
      cause: new Error(
        'VITE_DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET not set'
      )
    })
  }

  const client = new Discojs(
    tokens
      ? {
          consumerKey: CONSUMER_KEY,
          consumerSecret: CONSUMER_SECRET,
          oAuthToken: tokens.accessToken,
          oAuthTokenSecret: tokens.accessTokenSecret,
          userAgent: `VinylDeck/${APP_VERSION}`
        }
      : { userAgent: `VinylDeck/${APP_VERSION}` }
  )

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

      if (error instanceof DiscogsError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw new DiscogsAuthError('Invalid or expired tokens', {
            cause: error,
            statusCode: error.statusCode
          })
        }

        throw new DiscogsApiError(`${operation} failed`, {
          cause: error,
          statusCode: error.statusCode
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
     * Requires authentication.
     *
     * @param username - Discogs username
     * @param folderId - Folder ID (default: 0 for all)
     * @param options - Pagination and sorting options
     * @returns Collection releases with pagination
     * @throws {DiscogsAuthError} When no tokens provided or tokens invalid
     */
    async getCollectionReleases(
      username: string,
      folderId: number = 0,
      options?: {
        page?: number | undefined
        perPage?: number | undefined
        sort?: UserSortEnum | undefined
        sortOrder?: SortOrdersEnum | undefined
      }
    ) {
      if (!tokens) {
        throw new DiscogsAuthError(
          'Authentication required for getCollectionReleases',
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
     * Requires authentication.
     *
     * @param username - Discogs username
     * @returns User profile from Discogs
     * @throws {DiscogsAuthError} When no tokens provided or tokens invalid
     */
    async getUserProfile(username: string) {
      if (!tokens) {
        throw new DiscogsAuthError(
          'Authentication required for getUserProfile',
          {
            cause: new Error('No tokens provided to createDiscogsClient'),
            statusCode: 401
          }
        )
      }

      return wrapCall('getUserProfile', async () => {
        return await client.getProfileForUser(username)
      })
    }
  }
}

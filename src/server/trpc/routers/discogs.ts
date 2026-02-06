import { UserSortEnum, SortOrdersEnum } from 'discojs'
import { z } from 'zod'

import { createDiscogsClient } from '../../discogs/index.js'
import { mapFacadeErrorToTRPC } from '../error-mapper.js'
import { publicProcedure, router } from '../init.js'

/**
 * Discogs API router for proxying authenticated requests.
 * All Discogs API calls must go through the server because OAuth 1.0a
 * requires the Consumer Secret to sign every request.
 */
export const discogsRouter = router({
  /**
   * Get the identity of the authenticated user.
   * Used to validate OAuth tokens and get the username.
   * Uses query (not mutation) but sent as POST via methodOverride for security.
   */
  getIdentity: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        accessTokenSecret: z.string()
      })
    )
    .query(async ({ input }) => {
      const client = createDiscogsClient({
        accessToken: input.accessToken,
        accessTokenSecret: input.accessTokenSecret
      })

      try {
        return await client.data.getIdentity()
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get identity')
      }
    }),

  /**
   * Get a user's collection releases.
   * Supports pagination and sorting.
   * Uses query (not mutation) but sent as POST via methodOverride for security.
   */
  getCollection: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        accessTokenSecret: z.string(),
        username: z.string(),
        folderId: z.number().optional().default(0),
        page: z.number().optional().default(1),
        perPage: z.number().max(100).optional().default(50), // Discogs API max
        sort: z
          .enum([
            'label',
            'artist',
            'title',
            'catno',
            'format',
            'rating',
            'added',
            'year'
          ])
          .optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
      })
    )
    .query(async ({ input }) => {
      const client = createDiscogsClient({
        accessToken: input.accessToken,
        accessTokenSecret: input.accessTokenSecret
      })

      try {
        return await client.data.getCollectionReleases(
          input.username,
          input.folderId,
          {
            page: input.page,
            perPage: input.perPage,
            sort: input.sort as UserSortEnum | undefined,
            sortOrder: input.sortOrder as SortOrdersEnum | undefined
          }
        )
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get collection')
      }
    }),

  /**
   * Get a user's profile including avatar_url and email.
   * Email is only visible when authenticated as the requested user.
   * Uses query (not mutation) but sent as POST via methodOverride for security.
   */
  getUserProfile: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        accessTokenSecret: z.string(),
        username: z.string()
      })
    )
    .query(async ({ input }) => {
      const client = createDiscogsClient({
        accessToken: input.accessToken,
        accessTokenSecret: input.accessTokenSecret
      })

      try {
        return await client.data.getUserProfile(input.username)
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get user profile')
      }
    }),

  /**
   * Get collection metadata for change detection.
   * Returns only the total count without fetching full collection data.
   * Fast endpoint (1 API call) for detecting new/deleted items.
   */
  getCollectionMetadata: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        accessTokenSecret: z.string(),
        username: z.string()
      })
    )
    .query(async ({ input }) => {
      const client = createDiscogsClient({
        accessToken: input.accessToken,
        accessTokenSecret: input.accessTokenSecret
      })

      try {
        return await client.data.getCollectionMetadata(input.username)
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get collection metadata')
      }
    })
})

import { UserSortEnum, SortOrdersEnum } from 'discojs'
import { z } from 'zod'

import { createDiscogsClient } from '../../discogs/index.js'
import { mapFacadeErrorToTRPC } from '../error-mapper.js'
import { publicProcedure, router } from '../init.js'

import type { OAuthTokens } from '../../../types/discogs/oauth.js'

const authInput = z.object({
  accessToken: z.string(),
  accessTokenSecret: z.string()
})

const optionalAuthInput = z
  .object({
    accessToken: z.string().optional(),
    accessTokenSecret: z.string().optional()
  })
  .refine(
    (input) =>
      (input.accessToken === undefined) ===
      (input.accessTokenSecret === undefined),
    {
      message:
        'accessToken and accessTokenSecret must both be provided or omitted'
    }
  )

type DiscogsOptionalClientInput = z.infer<typeof optionalAuthInput>

/**
 * Sort values derived from discojs enums at runtime.
 * Single source of truth — no hardcoded strings to keep in sync.
 */
const USER_SORT_VALUES = Object.values(UserSortEnum) as [
  `${UserSortEnum}`,
  ...`${UserSortEnum}`[]
]
const SORT_ORDER_VALUES = Object.values(SortOrdersEnum) as [
  `${SortOrdersEnum}`,
  ...`${SortOrdersEnum}`[]
]

async function withDiscogsDataClient<T>(
  input: DiscogsOptionalClientInput,
  operation: string,
  query: (
    dataClient: ReturnType<typeof createDiscogsClient>['data']
  ) => Promise<T>
): Promise<T> {
  const tokens: OAuthTokens | undefined =
    input.accessToken === undefined || input.accessTokenSecret === undefined
      ? undefined
      : {
          accessToken: input.accessToken,
          accessTokenSecret: input.accessTokenSecret
        }

  const client = createDiscogsClient(tokens)

  try {
    return await query(client.data)
  } catch (error) {
    mapFacadeErrorToTRPC(error, operation)
  }
}

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
    .input(authInput)
    .query(async ({ input }) =>
      withDiscogsDataClient(input, 'get identity', (dataClient) =>
        dataClient.getIdentity()
      )
    ),

  /**
   * Get a user's collection releases.
   * Supports pagination and sorting.
   * Access token pair is optional for public collections in folder 0.
   * Uses query (not mutation) but sent as POST via methodOverride for security.
   */
  getCollection: publicProcedure
    .input(
      optionalAuthInput.extend({
        username: z.string(),
        folderId: z.number().optional().default(0),
        page: z.number().optional().default(1),
        perPage: z.number().max(100).optional().default(50),
        sort: z.enum(USER_SORT_VALUES).optional(),
        sortOrder: z.enum(SORT_ORDER_VALUES).optional()
      })
    )
    .query(async ({ input }) =>
      withDiscogsDataClient(input, 'get collection', (dataClient) =>
        dataClient.getCollectionReleases(input.username, input.folderId, {
          page: input.page,
          perPage: input.perPage,
          sort: input.sort,
          sortOrder: input.sortOrder
        })
      )
    ),

  /**
   * Get a user's profile including avatar_url and email.
   * OAuth token pair is optional.
   * Email is only visible when authenticated as the requested user.
   * Uses query (not mutation) but sent as POST via methodOverride for security.
   */
  getUserProfile: publicProcedure
    .input(
      optionalAuthInput.extend({
        username: z.string()
      })
    )
    .query(async ({ input }) =>
      withDiscogsDataClient(input, 'get user profile', (dataClient) =>
        dataClient.getUserProfile(input.username)
      )
    ),

  /**
   * Get collection metadata for change detection.
   * Returns only the total count without fetching full collection data.
   * OAuth token pair is optional for public collections.
   * Fast endpoint (1 API call) for detecting new/deleted items.
   */
  getCollectionMetadata: publicProcedure
    .input(
      optionalAuthInput.extend({
        username: z.string()
      })
    )
    .query(async ({ input }) =>
      withDiscogsDataClient(input, 'get collection metadata', (dataClient) =>
        dataClient.getCollectionMetadata(input.username)
      )
    )
})

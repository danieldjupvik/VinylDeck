/**
 * Discogs API facade entry point.
 * Provides unified API surface hiding dual-library complexity.
 */

import { createDataClient } from './client.js'
import { createOAuthClient, type OAuthClient } from './oauth.js'

import type { DataClient } from './client.js'
import type { OAuthTokens } from '../../types/discogs/oauth.js'

/**
 * Discogs client with oauth and data namespaces.
 */
export interface DiscogsClient {
  oauth: OAuthClient
  data: DataClient
}

/**
 * Creates a Discogs API client with OAuth and data operation support.
 * Factory function appropriate for stateless Vercel Serverless Functions.
 *
 * @param tokens - Optional OAuth tokens for authenticated operations
 * @returns Facade client with oauth and data namespaces
 *
 * @example
 * ```ts
 * // Unauthenticated client (OAuth flow only)
 * const client = createDiscogsClient()
 * const { requestToken, authorizeUrl } = await client.oauth.getRequestToken(callbackUrl)
 *
 * // Authenticated client (full API access)
 * const client = createDiscogsClient({ accessToken, accessTokenSecret })
 * const identity = await client.data.getIdentity()
 * const releases = await client.data.getCollectionReleases(username)
 * ```
 */
export function createDiscogsClient(tokens?: OAuthTokens): DiscogsClient {
  let oauthClient: OAuthClient | undefined
  const getOAuthClient = (): OAuthClient => {
    oauthClient ??= createOAuthClient()
    return oauthClient
  }

  return {
    oauth: {
      getRequestToken(callbackUrl) {
        return getOAuthClient().getRequestToken(callbackUrl)
      },
      getAccessToken(requestToken, requestTokenSecret, verifier) {
        return getOAuthClient().getAccessToken(
          requestToken,
          requestTokenSecret,
          verifier
        )
      }
    },
    data: createDataClient(tokens)
  }
}

export {
  DiscogsApiError,
  DiscogsAuthError,
  DiscogsRateLimitError
} from './errors.js'

export {
  getRateLimitState,
  updateRateLimitState,
  resetRateLimitState,
  type RateLimitState
} from './rate-state.js'

export type { OAuthTokens } from '../../types/discogs/oauth.js'
export type { OAuthClient, DataClient }

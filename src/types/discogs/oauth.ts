/**
 * OAuth types extracted from @lionralfs/discogs-client.
 * These types are inferred from the DiscogsOAuth class methods to ensure
 * type-safety without duplicating definitions.
 */

import type { DiscogsOAuth } from '@lionralfs/discogs-client'

/**
 * OAuth instance type helper for extracting method return types
 */
type OAuthInstance = InstanceType<typeof DiscogsOAuth>

/**
 * Result from DiscogsOAuth.getRequestToken()
 * @source @lionralfs/discogs-client DiscogsOAuth.getRequestToken
 */
export type RequestTokenResult = Awaited<
  ReturnType<OAuthInstance['getRequestToken']>
>

/**
 * Result from DiscogsOAuth.getAccessToken()
 * @source @lionralfs/discogs-client DiscogsOAuth.getAccessToken
 */
export type AccessTokenResult = Awaited<
  ReturnType<OAuthInstance['getAccessToken']>
>

/**
 * App-level OAuth token storage (stored in localStorage via Zustand).
 * These are the access tokens obtained after successful OAuth flow.
 */
export interface OAuthTokens {
  accessToken: string
  accessTokenSecret: string
}

/**
 * OAuth request tokens (temporary, stored in sessionStorage during OAuth flow).
 * These are the tokens obtained from the initial request token step.
 */
export interface OAuthRequestTokens {
  requestToken: string
  requestTokenSecret: string
}

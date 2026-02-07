/**
 * OAuth wrapper using @lionralfs/discogs-client.
 * Handles OAuth 1.0a flow (request token, access token).
 */

import { DiscogsOAuth } from '@lionralfs/discogs-client'

import { DiscogsApiError } from './errors.js'

declare const process: {
  env: {
    VITE_DISCOGS_CONSUMER_KEY?: string
    DISCOGS_CONSUMER_SECRET?: string
  }
}

const CONSUMER_KEY = process.env.VITE_DISCOGS_CONSUMER_KEY
const CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET

function extractStatusCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode
  }
  return undefined
}

/**
 * OAuth client interface returned by createOAuthClient
 */
export interface OAuthClient {
  getRequestToken(callbackUrl: string): Promise<{
    requestToken: string
    requestTokenSecret: string
    authorizeUrl: string
  }>
  getAccessToken(
    requestToken: string,
    requestTokenSecret: string,
    verifier: string
  ): Promise<{
    accessToken: string
    accessTokenSecret: string
  }>
}

/**
 * Creates an OAuth client for Discogs authentication flow.
 *
 * @returns OAuth client with getRequestToken and getAccessToken methods
 * @throws {DiscogsApiError} When OAuth credentials are missing
 */
export function createOAuthClient(): OAuthClient {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new DiscogsApiError('Missing OAuth credentials', {
      cause: new Error(
        'VITE_DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET not set'
      )
    })
  }

  const oauth = new DiscogsOAuth(CONSUMER_KEY, CONSUMER_SECRET)

  return {
    /**
     * Step 1: Get request token and authorization URL.
     *
     * @param callbackUrl - URL to redirect to after authorization
     * @returns Request token, secret, and authorize URL
     * @throws {DiscogsApiError} When request token exchange fails
     */
    async getRequestToken(callbackUrl: string) {
      try {
        const response = await oauth.getRequestToken(callbackUrl)

        if (!response.token || !response.tokenSecret) {
          throw new DiscogsApiError('Failed to obtain request token', {
            cause: new Error('Discogs returned null token or tokenSecret'),
            statusCode: 400
          })
        }

        return {
          requestToken: response.token,
          requestTokenSecret: response.tokenSecret,
          authorizeUrl: response.authorizeUrl
        }
      } catch (error) {
        if (error instanceof DiscogsApiError) {
          throw error
        }
        const statusCode = extractStatusCode(error)
        throw new DiscogsApiError('OAuth request token exchange failed', {
          cause: error,
          ...(statusCode !== undefined ? { statusCode } : {})
        })
      }
    },

    /**
     * Step 2: Exchange request token + verifier for access token.
     *
     * @param requestToken - Token from getRequestToken
     * @param requestTokenSecret - Secret from getRequestToken
     * @param verifier - Verifier code from OAuth callback
     * @returns Access token and secret for API calls
     * @throws {DiscogsApiError} When access token exchange fails
     */
    async getAccessToken(
      requestToken: string,
      requestTokenSecret: string,
      verifier: string
    ) {
      try {
        const response = await oauth.getAccessToken(
          requestToken,
          requestTokenSecret,
          verifier
        )

        if (!response.accessToken || !response.accessTokenSecret) {
          throw new DiscogsApiError('Failed to obtain access token', {
            cause: new Error(
              'Discogs returned null accessToken or accessTokenSecret'
            ),
            statusCode: 400
          })
        }

        return {
          accessToken: response.accessToken,
          accessTokenSecret: response.accessTokenSecret
        }
      } catch (error) {
        if (error instanceof DiscogsApiError) {
          throw error
        }
        const statusCode = extractStatusCode(error)
        throw new DiscogsApiError('OAuth access token exchange failed', {
          cause: error,
          ...(statusCode !== undefined ? { statusCode } : {})
        })
      }
    }
  }
}

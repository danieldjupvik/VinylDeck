import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createDiscogsClient } from '../../discogs/index.js'
import { mapFacadeErrorToTRPC } from '../error-mapper.js'
import { publicProcedure, router } from '../init.js'

declare const process: {
  env: {
    ALLOWED_CALLBACK_ORIGINS?: string
    VERCEL_URL?: string
  }
}

/**
 * Get allowed callback origins for OAuth flow.
 * Prevents open redirect attacks by restricting where OAuth can redirect.
 *
 * Always includes VERCEL_URL (for preview deployments) plus any explicitly
 * configured origins from ALLOWED_CALLBACK_ORIGINS.
 */
function getAllowedCallbackOrigins(): string[] {
  const origins: string[] = []

  // Add explicitly configured origins (production domains)
  if (process.env.ALLOWED_CALLBACK_ORIGINS) {
    origins.push(
      ...process.env.ALLOWED_CALLBACK_ORIGINS.split(',').map((o) => o.trim())
    )
  } else {
    // Default localhost origins for development (only when no explicit config)
    origins.push(
      'http://localhost:5173', // Vite dev server
      'http://localhost:4173' // Vite preview
    )
  }

  // Always add Vercel URL if available (enables preview deployments)
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }

  return origins
}

/**
 * Validates that a callback URL's origin is in the allowlist.
 * Prevents OAuth phishing attacks using our consumer credentials.
 */
function validateCallbackUrl(callbackUrl: string): boolean {
  try {
    const url = new URL(callbackUrl)
    const allowedOrigins = getAllowedCallbackOrigins()
    return allowedOrigins.some((origin) => url.origin === origin)
  } catch {
    return false
  }
}

/**
 * OAuth router for Discogs OAuth 1.0a token exchange.
 * These procedures handle the server-side OAuth flow that requires
 * the Consumer Secret (which must never be exposed to the client).
 */
export const oauthRouter = router({
  /**
   * Step 1: Get a request token and authorization URL.
   * Client stores the request token secret in sessionStorage,
   * then redirects user to the authorization URL.
   */
  getRequestToken: publicProcedure
    .input(
      z.object({
        callbackUrl: z.url()
      })
    )
    .mutation(async ({ input }) => {
      // Validate callback URL against allowlist to prevent OAuth phishing
      if (!validateCallbackUrl(input.callbackUrl)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid callback URL origin'
        })
      }

      try {
        const client = createDiscogsClient()
        return await client.oauth.getRequestToken(input.callbackUrl)
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get request token')
      }
    }),

  /**
   * Step 2: Exchange request token + verifier for access token.
   * Called after user authorizes on Discogs and is redirected back.
   */
  getAccessToken: publicProcedure
    .input(
      z.object({
        requestToken: z.string(),
        requestTokenSecret: z.string(),
        verifier: z.string()
      })
    )
    .mutation(async ({ input }) => {
      try {
        const client = createDiscogsClient()
        return await client.oauth.getAccessToken(
          input.requestToken,
          input.requestTokenSecret,
          input.verifier
        )
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get access token')
      }
    })
})

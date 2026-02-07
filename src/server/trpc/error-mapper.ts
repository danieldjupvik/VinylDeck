/**
 * Maps facade layer errors to tRPC errors.
 * Replaces error-utils.ts handleDiscogsError for facade-based routers.
 */

import { TRPCError } from '@trpc/server'

import { RateLimitError } from '../../lib/errors.js'
import { DiscogsAuthError, DiscogsApiError } from '../discogs/index.js'

/**
 * Converts facade layer errors to tRPC errors with appropriate codes.
 * Preserves original error as `cause` for debugging.
 *
 * @param error - The caught error from facade client
 * @param operation - Description of what operation failed (e.g., "get access token")
 * @throws {TRPCError} Always throws - converts error to tRPC format
 */
export function mapFacadeErrorToTRPC(error: unknown, operation: string): never {
  if (error instanceof TRPCError) {
    throw error
  }

  if (error instanceof DiscogsAuthError) {
    throw new TRPCError({
      code: error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
      message: error.message,
      cause: error
    })
  }

  if (error instanceof RateLimitError) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Backoff for ${Math.ceil(error.backoffMs / 1000)}s`,
      cause: error
    })
  }

  if (error instanceof DiscogsApiError) {
    let code:
      | 'BAD_REQUEST'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'TOO_MANY_REQUESTS'
      | 'INTERNAL_SERVER_ERROR' = 'INTERNAL_SERVER_ERROR'

    if (error.statusCode === 400) {
      code = 'BAD_REQUEST'
    } else if (error.statusCode === 401) {
      code = 'UNAUTHORIZED'
    } else if (error.statusCode === 403) {
      code = 'FORBIDDEN'
    } else if (error.statusCode === 404) {
      code = 'NOT_FOUND'
    } else if (error.statusCode === 429) {
      code = 'TOO_MANY_REQUESTS'
    }

    throw new TRPCError({
      code,
      message: error.message,
      cause: error
    })
  }

  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred'

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `Failed to ${operation}: ${errorMessage}`,
    cause: error instanceof Error ? error : undefined
  })
}

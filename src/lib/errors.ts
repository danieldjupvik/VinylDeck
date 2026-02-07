import { TRPCClientError } from '@trpc/client'

/**
 * Custom error for offline state without cached profile.
 * Thrown when user tries to continue session while offline
 * but has no cached profile data to work with.
 *
 * @example
 * ```ts
 * if (!isOnline && !cachedProfile) {
 *   throw new OfflineNoCacheError()
 * }
 * ```
 */
export class OfflineNoCacheError extends Error {
  constructor() {
    super('Cannot continue offline without cached profile')
    this.name = 'OfflineNoCacheError'
  }
}

/**
 * Error thrown when Discogs API rate limit is exceeded and retries are exhausted.
 * Contains a suggested client backoff duration for user feedback.
 *
 * @example
 * ```ts
 * catch (error) {
 *   if (error instanceof RateLimitError) {
 *     showToast(`Try again in ${Math.ceil(error.backoffMs / 1000)}s`)
 *   }
 * }
 * ```
 */
export class RateLimitError extends Error {
  readonly backoffMs: number
  readonly statusCode = 429

  constructor(backoffMs: number) {
    super(
      `Rate limit exceeded. Suggested backoff: about ${Math.ceil(backoffMs / 1000)}s`
    )
    this.name = 'RateLimitError'
    this.backoffMs = backoffMs
  }
}

/**
 * Extracts the tRPC error code from a TRPCClientError.
 * Returns undefined if the error is not a TRPCClientError or has no code.
 */
function getTRPCErrorCode(error: unknown): string | undefined {
  if (!(error instanceof TRPCClientError)) {
    return undefined
  }
  const data: unknown = error.data
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { code: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

/**
 * Checks if an error indicates invalid OAuth tokens.
 * Returns true for UNAUTHORIZED (401) and FORBIDDEN (403) errors.
 * Returns false for transient errors (5xx, network issues) that should not trigger logout.
 *
 * @param error - The error to check
 * @returns True if error indicates invalid credentials
 */
export function isAuthError(error: unknown): boolean {
  const code = getTRPCErrorCode(error)
  return code === 'UNAUTHORIZED' || code === 'FORBIDDEN'
}

/**
 * Checks if an error should not be retried.
 * Returns true for errors where retrying would not help:
 * - UNAUTHORIZED (401) - Invalid credentials
 * - FORBIDDEN (403) - Insufficient permissions
 * - NOT_FOUND (404) - Resource doesn't exist
 * - TOO_MANY_REQUESTS (429) - Rate limited
 *
 * @param error - The error to check
 * @returns True if retrying would not resolve the error
 */
export function isNonRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true

  const code = getTRPCErrorCode(error)
  return (
    code === 'UNAUTHORIZED' ||
    code === 'FORBIDDEN' ||
    code === 'NOT_FOUND' ||
    code === 'TOO_MANY_REQUESTS'
  )
}

/**
 * Unified error types for the Discogs facade layer.
 * All facade errors extend Error with ES2022 Error.cause for stack trace preservation.
 */

/**
 * Base error for Discogs API facade errors.
 * Preserves original error via Error.cause for debugging.
 */
export class DiscogsApiError extends Error {
  readonly statusCode?: number | undefined
  readonly originalError: unknown

  constructor(
    message: string,
    options: { cause: unknown; statusCode?: number }
  ) {
    super(message, { cause: options.cause })
    this.name = 'DiscogsApiError'
    this.statusCode = options.statusCode
    this.originalError = options.cause
  }
}

/**
 * Authentication error (401, 403).
 * Indicates invalid or expired OAuth tokens.
 */
export class DiscogsAuthError extends Error {
  readonly statusCode: 401 | 403
  readonly originalError: unknown

  constructor(
    message: string,
    options: { cause: unknown; statusCode: 401 | 403 }
  ) {
    super(message, { cause: options.cause })
    this.name = 'DiscogsAuthError'
    this.statusCode = options.statusCode
    this.originalError = options.cause
  }
}

/**
 * Rate limit error (429).
 * Re-exported from retry.ts for facade API consistency.
 */
export { RateLimitError as DiscogsRateLimitError } from './retry.js'

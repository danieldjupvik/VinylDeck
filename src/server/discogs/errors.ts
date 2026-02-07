/**
 * Unified error types for the Discogs facade layer.
 * All facade errors extend Error with manual cause assignment for stack trace preservation.
 */

/**
 * Base error for Discogs API facade errors.
 * Preserves original error via Error.cause for debugging.
 */
export class DiscogsApiError extends Error {
  declare readonly cause?: unknown
  readonly statusCode?: number | undefined
  readonly originalError: unknown

  constructor(
    message: string,
    options: { cause: unknown; statusCode?: number }
  ) {
    super(message)
    this.name = 'DiscogsApiError'
    this.cause = options.cause
    this.statusCode = options.statusCode
    this.originalError = options.cause
  }
}

/**
 * Authentication error (401, 403).
 * Indicates authentication is required, denied, or token access is invalid.
 */
export class DiscogsAuthError extends Error {
  declare readonly cause?: unknown
  readonly statusCode: 401 | 403
  readonly originalError: unknown

  constructor(
    message: string,
    options: { cause: unknown; statusCode: 401 | 403 }
  ) {
    super(message)
    this.name = 'DiscogsAuthError'
    this.cause = options.cause
    this.statusCode = options.statusCode
    this.originalError = options.cause
  }
}

/**
 * Rate limit error (429).
 * Re-exported from retry.ts for facade API consistency.
 */
export { RateLimitError as DiscogsRateLimitError } from './retry.js'

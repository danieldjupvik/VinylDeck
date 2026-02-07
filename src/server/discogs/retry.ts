import { DiscogsError } from 'discojs'

import { RateLimitError } from '../../lib/errors.js'

/**
 * Type guard to check if an error is a Discogs 429 rate limit error.
 *
 * @param error - The error to check
 * @returns True if error is a DiscogsError with statusCode 429
 */
export function isRateLimitError(error: unknown): error is DiscogsError {
  return error instanceof DiscogsError && error.statusCode === 429
}

/**
 * Calculate exponential backoff delay with jitter.
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000)
 * @returns Delay in milliseconds, capped at 60000ms (1 minute)
 */
export function calculateBackoff(attempt: number, baseDelayMs = 1000): number {
  const exponential = baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * exponential * 0.3
  return Math.min(exponential + jitter, 60000)
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelayMs?: number
}

/**
 * Wraps a discojs API call with rate limit retry logic.
 * Implements exponential backoff with jitter for 429 errors.
 *
 * Use this wrapper around discojs calls that may hit rate limits.
 * Non-429 errors are rethrown immediately without retry.
 *
 * @param fn - Async function to execute (typically a discojs API call)
 * @param options - Retry configuration
 * @returns The result of the function call
 * @throws {RateLimitError} When retries are exhausted
 * @throws Re-throws non-429 errors immediately
 *
 * @example
 * ```ts
 * const collection = await withRateLimitRetry(
 *   () => client.user().collection().getReleases(username, 0),
 *   { maxRetries: 3 }
 * )
 * ```
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelayMs = options?.baseDelayMs ?? 1000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (!isRateLimitError(error)) {
        throw error
      }

      if (attempt === maxRetries) {
        throw new RateLimitError(calculateBackoff(attempt, baseDelayMs))
      }

      await delay(calculateBackoff(attempt, baseDelayMs))
    }
  }

  // Unreachable — loop always returns or throws, but required for TypeScript control flow
  throw new RateLimitError(calculateBackoff(maxRetries, baseDelayMs))
}

export { RateLimitError } from '../../lib/errors.js'

const RATE_LIMIT = {
  MAX_REQUESTS: 60,
  WINDOW_MS: 60 * 1000
} as const

/**
 * Represents the current state of Discogs API rate limiting.
 *
 * Note: This is a client-side estimate based on response headers.
 * The resetAt field is an approximation and may drift from the server's
 * actual window timing.
 */
export interface RateLimitState {
  /** Total requests allowed per minute (60 auth, 25 unauth) */
  limit: number
  /** Requests remaining in current window */
  remaining: number
  /** Estimated Unix timestamp (ms) when window resets (approximation - may drift from server) */
  resetAt: number
  /** Last update timestamp (ms) */
  updatedAt: number
}

const DEFAULT_STATE: RateLimitState = {
  limit: RATE_LIMIT.MAX_REQUESTS,
  remaining: RATE_LIMIT.MAX_REQUESTS,
  resetAt: 0,
  updatedAt: 0
}

/**
 * Module-level singleton for rate limit state.
 * Appropriate for VinylDeck's single-user-per-deployment architecture.
 * Using object with mutable properties instead of reassignable let.
 */
const rateLimitState: RateLimitState = { ...DEFAULT_STATE }

/**
 * Returns a readonly copy of the current rate limit state.
 * The copy prevents external mutation of the singleton.
 *
 * @returns Current rate limit state
 */
export function getRateLimitState(): Readonly<RateLimitState> {
  return { ...rateLimitState } as Readonly<RateLimitState>
}

/**
 * Updates the rate limit state with new values from API response headers.
 * Only accepts limit and remaining - resetAt and updatedAt are computed.
 *
 * @param update - Partial update with limit and/or remaining values
 *
 * @example
 * ```ts
 * // After receiving response headers:
 * updateRateLimitState({
 *   limit: parseInt(headers['x-discogs-ratelimit']),
 *   remaining: parseInt(headers['x-discogs-ratelimit-remaining'])
 * })
 * ```
 */
export function updateRateLimitState(
  update: Partial<Pick<RateLimitState, 'limit' | 'remaining'>>
): void {
  if (update.limit !== undefined && update.limit > 0) {
    rateLimitState.limit = update.limit
  }
  if (update.remaining !== undefined && update.remaining >= 0) {
    rateLimitState.remaining = update.remaining
  }
  rateLimitState.updatedAt = Date.now()
  rateLimitState.resetAt = rateLimitState.updatedAt + RATE_LIMIT.WINDOW_MS
}

/**
 * Resets rate limit state to defaults.
 * Use when the rate limit window expires or authentication changes.
 */
export function resetRateLimitState(): void {
  rateLimitState.limit = DEFAULT_STATE.limit
  rateLimitState.remaining = DEFAULT_STATE.remaining
  rateLimitState.resetAt = DEFAULT_STATE.resetAt
  rateLimitState.updatedAt = DEFAULT_STATE.updatedAt
}

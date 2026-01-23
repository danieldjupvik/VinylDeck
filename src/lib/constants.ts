export const APP_VERSION = __APP_VERSION__

/**
 * Discogs API Rate Limiting Configuration
 *
 * Official Discogs rate limits (as of API documentation):
 * - Authenticated requests: 60 per minute
 * - Unauthenticated requests: 25 per minute
 *
 * Rate limiting behavior:
 * - Uses a moving average over a 60 second window
 * - Window resets if no requests are made for 60 seconds
 * - Tracked by source IP address
 * - Unique user agent required to achieve maximum requests/minute
 *
 * Response headers provided by Discogs:
 * - X-Discogs-Ratelimit: Total requests allowed in one minute window
 * - X-Discogs-Ratelimit-Used: Requests made in current window
 * - X-Discogs-Ratelimit-Remaining: Remaining requests in current window
 *
 * Note: These limits may be updated by Discogs in the future.
 */
export const RATE_LIMIT = {
  /** Max requests per minute for authenticated requests */
  MAX_REQUESTS: 60,
  /** Start throttling when remaining requests drops below this */
  BUFFER: 5,
  /** Rate limit window duration (60 seconds) */
  WINDOW_MS: 60 * 1000
} as const

export const COLLECTION = {
  PER_PAGE: 100
} as const

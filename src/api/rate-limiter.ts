/**
 * Discogs API Rate Limiter
 *
 * Implements client-side rate limiting to respect Discogs API limits.
 *
 * Discogs Rate Limiting Rules:
 * - Authenticated requests: 60 per minute
 * - Unauthenticated requests: 25 per minute
 * - Uses moving average over 60 second window
 * - Window resets if no requests made for 60 seconds
 * - Tracked by source IP address
 *
 * This implementation:
 * - Tracks rate limit state from response headers
 * - Throttles requests when approaching limit (with configurable buffer)
 * - Automatically resets window after 60 seconds of inactivity
 * - Prevents multiple simultaneous waits with shared promise
 *
 * Response headers from Discogs:
 * - X-Discogs-Ratelimit: Total allowed requests in one minute
 * - X-Discogs-Ratelimit-Used: Requests made in current window
 * - X-Discogs-Ratelimit-Remaining: Remaining requests in window
 */
import { RATE_LIMIT } from '@/lib/constants'

interface RateLimitState {
  /** Total requests allowed per minute */
  limit: number
  /** Number of requests used in current window */
  used: number
  /** Number of requests remaining in current window */
  remaining: number
  /** Timestamp of last rate limit update */
  lastUpdated: number
}

class RateLimiter {
  private state: RateLimitState = {
    limit: RATE_LIMIT.MAX_REQUESTS,
    used: 0,
    remaining: RATE_LIMIT.MAX_REQUESTS,
    lastUpdated: Date.now()
  }

  private waitPromise: Promise<void> | null = null

  /**
   * Update rate limit state from Discogs response headers.
   *
   * Discogs provides these headers in every response:
   * - X-Discogs-Ratelimit: Total allowed (60 for authenticated, 25 for unauthenticated)
   * - X-Discogs-Ratelimit-Used: How many requests have been made in current window
   * - X-Discogs-Ratelimit-Remaining: How many requests are left in current window
   */
  updateFromHeaders(headers: Record<string, string>): void {
    const limit = headers['x-discogs-ratelimit']
    const used = headers['x-discogs-ratelimit-used']
    const remaining = headers['x-discogs-ratelimit-remaining']

    if (limit) this.state.limit = parseInt(limit, 10)
    if (used) this.state.used = parseInt(used, 10)
    if (remaining) this.state.remaining = parseInt(remaining, 10)
    this.state.lastUpdated = Date.now()
  }

  /**
   * Check if we should throttle requests.
   *
   * Throttles when:
   * - Remaining requests < BUFFER threshold
   *
   * Does NOT throttle when:
   * - 60+ seconds have passed since last request (window reset)
   */
  shouldThrottle(): boolean {
    // Reset if window has passed (Discogs resets after 60s of no requests)
    if (Date.now() - this.state.lastUpdated > RATE_LIMIT.WINDOW_MS) {
      this.state.remaining = this.state.limit
      this.state.used = 0
      return false
    }

    return this.state.remaining < RATE_LIMIT.BUFFER
  }

  /**
   * Get time to wait before next request (in ms)
   */
  getWaitTime(): number {
    if (!this.shouldThrottle()) return 0

    const elapsed = Date.now() - this.state.lastUpdated
    const waitTime = RATE_LIMIT.WINDOW_MS - elapsed

    return Math.max(0, waitTime)
  }

  /**
   * Wait if rate limited, ensuring only one wait at a time.
   *
   * Called by the API client before each request.
   * If approaching rate limit, waits until window resets.
   * Multiple concurrent calls share the same wait promise.
   */
  async waitIfNeeded(): Promise<void> {
    if (!this.shouldThrottle()) return

    // If already waiting, return the existing promise
    if (this.waitPromise) {
      return this.waitPromise
    }

    const waitTime = this.getWaitTime()
    if (waitTime <= 0) return

    this.waitPromise = new Promise((resolve) => {
      setTimeout(() => {
        this.waitPromise = null
        resolve()
      }, waitTime)
    })

    return this.waitPromise
  }

  /**
   * Get current rate limit state (for debugging/display)
   */
  getState(): Readonly<RateLimitState> {
    return { ...this.state }
  }
}

export const rateLimiter = new RateLimiter()

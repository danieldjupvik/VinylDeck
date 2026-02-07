# Phase 5: Rate Limiting - Research

**Researched:** 2026-02-05
**Domain:** Rate limiting, retry patterns, Discogs API headers
**Confidence:** HIGH

## Summary

Phase 5 adds 429 error handling and rate state exposure on top of discojs's built-in Bottleneck throttling. Research confirms discojs handles proactive rate limiting via Bottleneck but does NOT handle 429 retry or expose rate limit state.

The architecture requires a wrapper layer that:

1. Catches `DiscogsError` with `statusCode: 429`
2. Parses the `Retry-After` header (if present) or calculates backoff
3. Retries with exponential backoff + jitter
4. Exposes rate state from response headers for UI consumption

**Primary recommendation:** Extend discojs via subclass or wrapper to intercept 429 errors and implement retry-with-backoff. Create typed `RateLimitError` for exhausted retries.

## Standard Stack

### Core (Already in Project)

| Library    | Version | Purpose                            | Status             |
| ---------- | ------- | ---------------------------------- | ------------------ |
| discojs    | 2.3.1   | Discogs API client with Bottleneck | Installed          |
| bottleneck | 2.19.5  | Proactive request throttling       | Bundled in discojs |

### No Additional Dependencies Needed

discojs already includes Bottleneck internally. The retry and backoff logic can be implemented with native TypeScript/JavaScript without additional libraries.

**Considered but not needed:**

| Library                 | Why Not Needed                                                    |
| ----------------------- | ----------------------------------------------------------------- |
| p-retry                 | Simple retry logic is ~20 lines; no external dependency justified |
| async-retry             | Same - manual implementation is clearer and typed                 |
| bottleneck (standalone) | Already bundled in discojs                                        |

## Architecture Patterns

### What discojs Already Handles (Do Not Duplicate)

```
Proactive Throttling:
┌─────────────────────────────────────────────────────────┐
│ discojs internal Bottleneck limiter                     │
│                                                         │
│ - maxConcurrent: 1 (serial requests)                    │
│ - minTime: 1000ms (for 60 req/min) or 2400ms (25/min)   │
│ - reservoir: 60 or 25 requests                          │
│ - reservoirRefreshInterval: 60000ms                     │
│ - Auto-updates from X-Discogs-Ratelimit headers         │
└─────────────────────────────────────────────────────────┘
```

### What Phase 5 Adds

```
Reactive Recovery (429 handling):
┌─────────────────────────────────────────────────────────┐
│ Wrapper Layer (discogs-client.ts)                       │
│                                                         │
│ try {                                                   │
│   return await discojs.someMethod()                     │
│ } catch (error) {                                       │
│   if (isRateLimitError(error)) {                        │
│     const waitMs = parseRetryAfter(headers) || backoff  │
│     await delay(waitMs + jitter)                        │
│     // retry with count tracking                        │
│   }                                                     │
│   throw new RateLimitError(remainingWaitMs)             │
│ }                                                       │
└─────────────────────────────────────────────────────────┘

Rate State Exposure:
┌─────────────────────────────────────────────────────────┐
│ RateLimitState (shared object)                          │
│                                                         │
│ {                                                       │
│   limit: number       // X-Discogs-Ratelimit            │
│   remaining: number   // X-Discogs-Ratelimit-Remaining  │
│   resetAt: number     // Calculated timestamp           │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```

### Recommended Pattern: Wrapper with Retry

The cleanest approach is a wrapper function that:

1. Calls discojs method
2. Catches errors
3. If 429: retry with backoff
4. If retries exhausted: throw typed `RateLimitError`
5. Updates shared rate state from headers

```typescript
// Pattern: Retry wrapper (NOT actual implementation)
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number }
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (!isRateLimitError(error)) throw error
      if (attempt === options.maxRetries) {
        throw new RateLimitError(calculateWaitTime(error))
      }
      lastError = error
      await delay(calculateBackoff(attempt, error))
    }
  }

  throw lastError
}
```

### Anti-Patterns to Avoid

- **Do NOT recreate Bottleneck limiter**: discojs already has one internally configured correctly
- **Do NOT wrap every call**: Only data calls need 429 handling; OAuth uses @lionralfs/discogs-client
- **Do NOT block on rate limit**: Throw `RateLimitError` so consumers can decide (show UI, queue, etc.)

## Don't Hand-Roll

| Problem                      | Don't Build               | Use Instead                         | Why                                           |
| ---------------------------- | ------------------------- | ----------------------------------- | --------------------------------------------- |
| Proactive throttling         | Custom Bottleneck setup   | discojs built-in                    | Already configured, auto-updates from headers |
| Date parsing for Retry-After | Manual IMF-fixdate parser | `new Date(header)`                  | HTTP dates are valid JS Date inputs           |
| Rate limit headers parsing   | Custom header extractor   | discojs internal maybeUpdateLimiter | Already done, but not exposed                 |

**Key insight:** The main work is interception and retry logic, not rate limiting itself.

## Common Pitfalls

### Pitfall 1: Not Preserving Retry-After from Response

**What goes wrong:** DiscogsError thrown by discojs doesn't include the response headers, so Retry-After is lost.

**Why it happens:** discojs's `fetch()` method parses the status and throws before headers are accessible to callers.

**How to avoid:** If Retry-After parsing is needed, either:

1. Extend discojs Fetcher class (protected access)
2. Use fallback exponential backoff (recommended - simpler, works reliably)
3. Check if discojs exposes raw response in future versions

**Recommendation:** Use exponential backoff as primary strategy. Retry-After parsing adds complexity for minimal benefit since Discogs doesn't consistently include the header.

### Pitfall 2: Retry-After Format Confusion

**What goes wrong:** Treating Retry-After as always seconds when it could be an HTTP date.

**Why it happens:** RFC 9110 allows two formats:

- `Retry-After: 120` (seconds)
- `Retry-After: Wed, 21 Oct 2026 07:28:00 GMT` (date)

**How to avoid:**

```typescript
function parseRetryAfter(header: string): number {
  const seconds = parseInt(header, 10)
  if (!isNaN(seconds)) return seconds * 1000

  const date = new Date(header)
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now())
  }

  return 0 // fallback to immediate retry (backoff will handle)
}
```

### Pitfall 3: Exponential Backoff Without Jitter

**What goes wrong:** Multiple clients hitting rate limit simultaneously all retry at the exact same time, creating thundering herd.

**Why it happens:** Pure exponential backoff (1s, 2s, 4s) is deterministic.

**How to avoid:** Add random jitter:

```typescript
function calculateBackoff(attempt: number, baseMs = 1000): number {
  const exponential = baseMs * Math.pow(2, attempt)
  const jitter = Math.random() * exponential * 0.5 // 0-50% jitter
  return Math.min(exponential + jitter, 60000) // cap at 60s
}
```

### Pitfall 4: Infinite Retry Loops

**What goes wrong:** Keep retrying forever, blocking user indefinitely.

**Why it happens:** No max retry count, or not throwing after exhausted.

**How to avoid:**

- Set max retries (recommendation: 3)
- Throw typed `RateLimitError` with remaining wait time
- Let consumers (tRPC handlers, UI) decide what to do

## Code Examples

### Detecting 429 from discojs Errors

```typescript
// Source: discojs/dist/index.js analysis
import { DiscogsError } from 'discojs'

function isRateLimitError(error: unknown): error is DiscogsError {
  return error instanceof DiscogsError && error.statusCode === 429
}
```

### RateLimitError Type

```typescript
// Source: Project pattern from src/lib/errors.ts
export class RateLimitError extends Error {
  readonly retryAfterMs: number
  readonly statusCode = 429

  constructor(retryAfterMs: number) {
    super(`Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)}s`)
    this.name = 'RateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}
```

### Exponential Backoff with Jitter

```typescript
// Source: MDN best practices, AWS exponential backoff pattern
const DEFAULT_BASE_DELAY = 1000
const MAX_DELAY = 60000

function calculateBackoff(
  attempt: number,
  baseDelay = DEFAULT_BASE_DELAY
): number {
  const exponential = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * exponential * 0.3 // 0-30% jitter
  return Math.min(exponential + jitter, MAX_DELAY)
}
```

### Rate State Interface

```typescript
// Source: Existing pattern from src/api/rate-limiter.ts
export interface RateLimitState {
  /** Total requests allowed per minute */
  limit: number
  /** Requests remaining in current window */
  remaining: number
  /** Unix timestamp when window resets */
  resetAt: number
  /** Last update timestamp */
  updatedAt: number
}
```

### Wrapper Pattern Sketch

```typescript
// Conceptual - not complete implementation
async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  state: RateLimitState,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      // Update state from successful response (headers not accessible here)
      return result
    } catch (error) {
      if (!isRateLimitError(error)) throw error

      if (attempt === maxRetries) {
        const waitMs = calculateBackoff(attempt)
        throw new RateLimitError(waitMs)
      }

      await delay(calculateBackoff(attempt))
    }
  }

  throw new RateLimitError(60000) // Should not reach
}
```

## State of the Art

| Old Approach              | Current Approach      | When Changed   | Impact                           |
| ------------------------- | --------------------- | -------------- | -------------------------------- |
| Custom Bottleneck setup   | Use discojs built-in  | discojs 2.0    | No manual throttle config needed |
| Client-side rate tracking | Server parses headers | VinylDeck v1.0 | Accurate state from Discogs      |
| Silent retry              | Typed RateLimitError  | This phase     | Consumers can show feedback      |

**Deprecated/outdated:**

- Manual Bottleneck configuration alongside discojs (duplicates work, can conflict)
- Ignoring 429 errors (leads to broken experiences)

## Key Findings: discojs Internals

From source code analysis (`node_modules/discojs/dist/index.js`):

### What discojs Exposes

1. **`DiscogsError`** - Exported, has `statusCode` property
2. **`AuthError`** - Exported, fixed `statusCode: 401`
3. **`Discojs` class** - Main entry point

### What discojs Does NOT Expose

1. **`Fetcher` class** - Internal, not exported
2. **Bottleneck limiter** - Private property of Fetcher
3. **Raw response headers** - Only parsed internally
4. **Rate limit state** - Updated internally, not queryable

### discojs Error Handling (Lines 358-382)

```javascript
// Simplified from source
async fetch(url, options) {
  const response = await crossFetch(url, options)
  const { status, statusText, headers } = response

  this.maybeUpdateLimiter(headers) // Updates internal Bottleneck

  if (status === 401) throw new AuthError()
  if (status === 422 || status >= 500) {
    throw new DiscogsError(message, status)
  }
  if (status < 200 || status >= 300) {
    throw new DiscogsError(statusText, status) // 429 lands here
  }

  return data
}
```

**Critical observation:** 429 becomes `DiscogsError("Too Many Requests", 429)` without Retry-After header preserved.

## Open Questions

### 1. How to Expose Rate State Without Header Access?

**What we know:** discojs parses headers internally but doesn't expose them.

**What's unclear:** How to get current rate limit state for UI consumption.

**Recommendation:** Two options:

- Option A: Track state from tRPC response metadata (already done in current codebase)
- Option B: Extend Discojs class to expose Fetcher state (more invasive)

Recommend Option A - continue using existing pattern from `src/api/rate-limiter.ts` which tracks from tRPC responses.

### 2. Should We Parse Retry-After?

**What we know:** Discogs doesn't consistently include Retry-After header. discojs doesn't expose it.

**What's unclear:** Whether the added complexity is worth it.

**Recommendation:** No. Use exponential backoff with jitter. Simpler, reliable, doesn't require extending discojs.

### 3. Retry Count Configuration?

**What we know:** Need to eventually throw so consumers can handle.

**Recommendation:** 3 retries with exponential backoff (1s, 2s, 4s base). Total max wait ~12s before throwing. Configurable via constant.

## Sources

### Primary (HIGH confidence)

- discojs source code (`node_modules/discojs/dist/index.js`) - Lines 267-412 for Fetcher, 180-205 for errors
- discojs types (`node_modules/discojs/dist/index.d.ts`) - Exported symbols
- Bottleneck types (`node_modules/bottleneck/bottleneck.d.ts`) - Event handling, retry patterns
- Existing codebase (`src/api/rate-limiter.ts`, `src/lib/errors.ts`)

### Secondary (MEDIUM confidence)

- [MDN Retry-After Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After) - Header format specification
- [MDN 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429) - Error semantics

### Tertiary (LOW confidence)

- [Discogs Forum - Best-practice RateLimit strategy](https://www.discogs.com/forum/thread/745530) - Community patterns (blocked by 403)
- [Beets discogs rate limiting](https://github.com/beetbox/beets/issues/3878) - Real-world Python implementation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Direct source code analysis
- Architecture: HIGH - Based on verified discojs internals
- Pitfalls: HIGH - From source code + MDN standards
- Rate state exposure: MEDIUM - Existing pattern works, alternatives possible

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (discojs stable, patterns well-established)

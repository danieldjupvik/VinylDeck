# Architecture Research: Dual-Library Coordination

**Domain:** Discogs API client with OAuth + data separation
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

VinylDeck currently uses @lionralfs/discogs-client for both OAuth and data operations. The planned migration adds discojs for data operations (superior types) while retaining @lionralfs for OAuth (only mature OAuth 1.0a library). This creates a dual-library architecture requiring careful coordination.

**Recommended architecture:** Facade pattern with library-specific wrappers behind unified interface. Bottleneck throttling shared across both libraries to respect Discogs 60 req/min limit.

## Current Architecture (Baseline)

### File Structure

```
src/server/
├── discogs-client.ts              # Factory for @lionralfs DiscogsClient
├── trpc/
│   ├── init.ts                    # tRPC instance
│   ├── index.ts                   # App router (merges oauth + discogs)
│   ├── error-utils.ts             # Discogs error handling
│   └── routers/
│       ├── oauth.ts               # OAuth flow (getRequestToken, getAccessToken)
│       └── discogs.ts             # Data calls (getIdentity, getCollection, etc.)
```

### Current Data Flow

```
React Component
    ↓ (tRPC mutation/query)
TanStack Query
    ↓ (HTTP POST to /api/trpc/*)
Vercel Serverless Function (api/trpc/[trpc].ts)
    ↓
tRPC Router (oauth or discogs)
    ↓
createDiscogsClient(accessToken, accessTokenSecret)
    ↓
@lionralfs/discogs-client methods
    ↓ (OAuth 1.0a signed request)
Discogs API
```

### Current Strengths

- **Single client:** Only @lionralfs, no coordination needed
- **OAuth handling:** Mature OAuth 1.0a implementation with callback validation
- **Error handling:** Centralized in error-utils.ts with tRPC mapping
- **Type safety:** TypeScript throughout, manual types in src/types/discogs.ts

### Current Weaknesses

- **Incomplete types:** Manual DiscogsCollectionRelease type with `as unknown as` casts
- **Type maintenance:** Manual type updates lag behind Discogs API changes
- **No throttling:** Relies on tRPC query deduplication, no explicit rate limiting

## Recommended Architecture (Target)

### Facade Pattern for Dual-Library Coordination

The facade pattern provides a simplified, high-level interface to coordinate multiple libraries, hiding complexity from consumers (tRPC routers) and centralizing library-specific logic.

**Why facade for this use case:**

1. **Clean separation:** OAuth calls go to @lionralfs, data calls go to discojs
2. **Shared throttling:** Bottleneck limiter wraps both clients
3. **Unified error handling:** Both libraries throw different error shapes, facade normalizes them
4. **Future-proof:** If either library is replaced, only facade changes, not tRPC routers

### File Organization

```
src/server/discogs/
├── index.ts                       # Facade entry point (public API)
├── oauth.ts                       # @lionralfs wrapper (OAuth operations)
├── client.ts                      # discojs wrapper (data operations)
├── throttle.ts                    # Bottleneck configuration (shared limiter)
└── error-utils.ts                 # Unified error handling (moved from trpc/)

src/types/discogs/
├── index.ts                       # Re-exports from discojs + extensions
├── extensions.d.ts                # Module augmentation for discojs (if needed)
└── oauth.ts                       # OAuth-specific types from @lionralfs

src/server/trpc/routers/
├── oauth.ts                       # Updated to use facade (oauth.getRequestToken)
└── discogs.ts                     # Updated to use facade (client.getCollection)
```

**Rationale:**

- **src/server/discogs/:** New folder isolates all Discogs-specific logic (OAuth, data, throttling)
- **index.ts:** Single public entry point for facade, hides internal library split
- **oauth.ts + client.ts:** Separate files for library-specific wrappers, clear boundaries
- **throttle.ts:** Shared Bottleneck instance, imported by both oauth.ts and client.ts
- **src/types/discogs/:** Dedicated type folder matches server/discogs/ structure

### Facade Entry Point (index.ts)

```typescript
// src/server/discogs/index.ts

import { getOAuthClient } from './oauth.js'
import { getDataClient } from './client.js'

/**
 * Facade entry point for all Discogs API operations.
 * Coordinates @lionralfs (OAuth) and discojs (data) behind unified interface.
 *
 * @example
 * // In tRPC routers
 * import { discogs } from '../../discogs/index.js'
 *
 * const oauth = discogs.getOAuthClient()
 * const requestToken = await oauth.getRequestToken(callbackUrl)
 *
 * const dataClient = discogs.getDataClient(accessToken, accessTokenSecret)
 * const collection = await dataClient.getCollection(username)
 */
export const discogs = {
  getOAuthClient,
  getDataClient
}
```

**Design decisions:**

- **Single named export:** `discogs.getOAuthClient()` reads better than separate imports
- **Factory pattern:** Both getters return configured instances with throttling
- **No environment access:** Factories validate credentials, throw early if missing

### OAuth Wrapper (oauth.ts)

```typescript
// src/server/discogs/oauth.ts

import { DiscogsOAuth } from '@lionralfs/discogs-client'
import { throttleLimiter } from './throttle.js'

const CONSUMER_KEY = process.env.VITE_DISCOGS_CONSUMER_KEY
const CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET

/**
 * Creates throttled OAuth client for Discogs OAuth 1.0a flow.
 * All methods automatically respect rate limits via shared Bottleneck instance.
 */
export function getOAuthClient() {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('Missing Discogs OAuth credentials')
  }

  const oauth = new DiscogsOAuth(CONSUMER_KEY, CONSUMER_SECRET)

  // Wrap OAuth methods with throttling
  return {
    async getRequestToken(callbackUrl: string) {
      return throttleLimiter.schedule(() => oauth.getRequestToken(callbackUrl))
    },
    async getAccessToken(
      requestToken: string,
      requestTokenSecret: string,
      verifier: string
    ) {
      return throttleLimiter.schedule(() =>
        oauth.getAccessToken(requestToken, requestTokenSecret, verifier)
      )
    }
  }
}
```

**Design decisions:**

- **Throttle wrapping:** `throttleLimiter.schedule()` wraps each method individually
- **No rate limit extraction:** @lionralfs returns headers, but not parsed in a standard format
- **Factory function:** Returns object with methods, not class instance (matches tRPC style)

### Data Client Wrapper (client.ts)

```typescript
// src/server/discogs/client.ts

import { Discojs } from 'discojs'
import { throttleLimiter } from './throttle.js'

const CONSUMER_KEY = process.env.VITE_DISCOGS_CONSUMER_KEY
const CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET

/**
 * Creates throttled data client for Discogs API operations.
 * Uses discojs for superior TypeScript types compared to @lionralfs.
 */
export function getDataClient(accessToken: string, accessTokenSecret: string) {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('Missing Discogs OAuth credentials')
  }

  const client = new Discojs({
    auth: {
      method: 'oauth',
      consumerKey: CONSUMER_KEY,
      consumerSecret: CONSUMER_SECRET,
      accessToken,
      accessTokenSecret
    },
    userAgent: `VinylDeck/${process.env.npm_package_version ?? '1.0.0'}`
  })

  // Return facade with throttled methods
  return {
    async getIdentity() {
      return throttleLimiter.schedule(() => client.getIdentity())
    },
    async getUserProfile(username: string) {
      return throttleLimiter.schedule(() => client.user().getProfile(username))
    },
    async getCollection(username: string, options?: CollectionOptions) {
      return throttleLimiter.schedule(() =>
        client.user().collection().getReleases(username, 0, options)
      )
    },
    async getCollectionMetadata(username: string) {
      return throttleLimiter.schedule(() =>
        client
          .user()
          .collection()
          .getReleases(username, 0, { page: 1, per_page: 1 })
      )
    }
  }
}
```

**Design decisions:**

- **Throttle per method:** Each data call wrapped individually, not client creation
- **Type inference:** discojs returns strongly typed data, no `as unknown as` needed
- **userAgent:** Matches current implementation (VinylDeck/version)
- **Method facade:** Returns object with specific methods, not raw discojs client (prevents bypass)

### Shared Throttling (throttle.ts)

```typescript
// src/server/discogs/throttle.ts

import Bottleneck from 'bottleneck'

/**
 * Shared rate limiter for all Discogs API calls.
 * Discogs allows 60 requests per minute (authenticated).
 *
 * Configuration:
 * - reservoir: 60 requests
 * - reservoirRefreshAmount: 60 (refill to 60)
 * - reservoirRefreshInterval: 60_000ms (1 minute)
 * - maxConcurrent: 5 (limit parallel requests to avoid thundering herd)
 * - minTime: 1000ms (minimum 1 second between requests)
 */
export const throttleLimiter = new Bottleneck({
  reservoir: 60,
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60_000, // 1 minute

  maxConcurrent: 5,
  minTime: 1000 // 1 second between requests
})

/**
 * Optional: Listen to Bottleneck events for debugging.
 */
throttleLimiter.on('failed', (error, jobInfo) => {
  console.error(
    `Discogs API request failed (attempt ${jobInfo.retryCount + 1}):`,
    error
  )
  // Retry on 429 (rate limit) after delay
  if (error.statusCode === 429) {
    return 5000 // Retry after 5 seconds
  }
})

throttleLimiter.on('depleted', () => {
  console.warn('Discogs API rate limit reservoir depleted, queueing requests')
})
```

**Design decisions:**

- **Reservoir pattern:** Matches Discogs "60 per minute" limit exactly
- **Conservative concurrency:** maxConcurrent: 5 prevents parallel request bursts
- **minTime safety net:** 1 second minimum ensures gradual consumption
- **Retry logic:** Automatic retry on 429 with backoff (Bottleneck feature)
- **Event logging:** Optional debugging hooks for production monitoring

**Why Bottleneck over alternatives:**

| Library               | Verdict     | Reasoning                                                |
| --------------------- | ----------- | -------------------------------------------------------- |
| Bottleneck            | RECOMMENDED | Reservoir pattern, Redis clustering, retry support       |
| p-limit               | Rejected    | Only concurrency control, no rate limiting               |
| rate-limiter-flexible | Rejected    | Designed for server-side request limiting, not API calls |
| async                 | Rejected    | No built-in rate limiting, only control flow             |

## Data Flow (Target Architecture)

### OAuth Flow (Token Exchange)

```
[Login Page]
    ↓
[tRPC oauth.getRequestToken mutation]
    ↓
[oauthRouter in src/server/trpc/routers/oauth.ts]
    ↓
[discogs.getOAuthClient()]
    ↓
[throttleLimiter.schedule(() => oauth.getRequestToken(callbackUrl))]
    ↓ (Rate limited, queued if necessary)
[@lionralfs DiscogsOAuth.getRequestToken()]
    ↓ (OAuth 1.0a signed request)
[Discogs API]
    ↓
[Returns { token, tokenSecret, authorizeUrl }]
    ↓
[Client stores in sessionStorage, redirects to Discogs]

[OAuth Callback Page]
    ↓ (User authorized on Discogs, redirected back with verifier)
[tRPC oauth.getAccessToken mutation]
    ↓
[oauthRouter]
    ↓
[discogs.getOAuthClient()]
    ↓
[throttleLimiter.schedule(() => oauth.getAccessToken(...))]
    ↓
[@lionralfs DiscogsOAuth.getAccessToken()]
    ↓
[Discogs API]
    ↓
[Returns { accessToken, accessTokenSecret }]
    ↓
[Client stores in localStorage via auth-store]
```

### Data Call Flow (Collection Fetch)

```
[Collection Page]
    ↓
[useCollection hook (TanStack Query)]
    ↓
[tRPC discogs.getCollection query]
    ↓
[discogsRouter in src/server/trpc/routers/discogs.ts]
    ↓
[discogs.getDataClient(accessToken, accessTokenSecret)]
    ↓
[throttleLimiter.schedule(() => client.getCollection(username, options))]
    ↓ (Rate limited, shares quota with OAuth calls)
[discojs Discojs.user().collection().getReleases()]
    ↓ (OAuth 1.0a signed request)
[Discogs API]
    ↓
[Returns { releases: DiscogsCollectionRelease[], pagination, rateLimit }]
    ↓ (Strong types from discojs, no casting needed)
[TanStack Query caches in IndexedDB]
    ↓
[useCollection returns typed data to component]
```

### Error Handling Flow

```
[Discogs API error (e.g., 401 Unauthorized)]
    ↓
[discojs throws error]
    ↓
[Caught in getDataClient wrapper method]
    ↓
[error-utils.ts handleDiscogsError()]
    ↓ (Normalizes error shape from discojs/lionralfs)
[Throws TRPCError with mapped code (UNAUTHORIZED)]
    ↓
[tRPC returns error to client]
    ↓
[TanStack Query onError callback]
    ↓
[AuthProvider checks error.data?.code]
    ↓ (If 401/403, disconnects user)
[Updates auth-store.sessionActive = false]
```

## Integration Points

### 1. tRPC Router Updates

**OAuth Router (src/server/trpc/routers/oauth.ts):**

```typescript
// BEFORE
import { DiscogsOAuth } from '@lionralfs/discogs-client'

function getDiscogsOAuth() {
  return new DiscogsOAuth(CONSUMER_KEY, CONSUMER_SECRET)
}

// In mutation
const oauth = getDiscogsOAuth()
const response = await oauth.getRequestToken(input.callbackUrl)

// AFTER
import { discogs } from '../../discogs/index.js'

// In mutation
const oauth = discogs.getOAuthClient()
const response = await oauth.getRequestToken(input.callbackUrl)
// Throttling now automatic, no code change needed
```

**Discogs Router (src/server/trpc/routers/discogs.ts):**

```typescript
// BEFORE
import { createDiscogsClient } from '../../discogs-client.js'

const client = createDiscogsClient(input.accessToken, input.accessTokenSecret)
const { data, rateLimit } = await client.user().collection().getReleases(...)

// Type cast required - types incomplete
const releases = data.releases as unknown as DiscogsCollectionRelease[]

// AFTER
import { discogs } from '../../discogs/index.js'

const client = discogs.getDataClient(input.accessToken, input.accessTokenSecret)
const { data, rateLimit } = await client.getCollection(username, options)

// No type cast needed - discojs types complete
const releases = data.releases // Already DiscogsCollectionRelease[]
```

### 2. Error Handling Updates

**Move error-utils.ts to discogs folder:**

```
BEFORE: src/server/trpc/error-utils.ts
AFTER:  src/server/discogs/error-utils.ts
```

**Extend to handle both libraries:**

```typescript
// Add discojs error detection
export function isDiscojsError(error: unknown): error is DiscogsError {
  return error instanceof Error && 'statusCode' in error
}

// Unified handler works for both libraries
export function handleDiscogsError(error: unknown, context: string): never {
  if (error instanceof TRPCError) throw error

  // Works for both @lionralfs and discojs (both throw objects with statusCode)
  if (isDiscogsError(error) || isDiscojsError(error)) {
    // Same logic as before
  }
  // ... rest of handler
}
```

### 3. Type System Updates

**Current manual types (src/types/discogs.ts):**

```typescript
// Manual type definitions, incomplete, require maintenance
export interface DiscogsCollectionRelease {
  id: number
  basic_information: { ... }
  // Missing fields, requires periodic updates
}
```

**Target type imports (src/types/discogs/index.ts):**

```typescript
// Re-export discojs types (complete, maintained by library)
export type {
  Collection,
  CollectionRelease,
  Pagination,
  Identity,
  UserProfile
} from 'discojs'

// OAuth types from @lionralfs (separate namespace)
export type { RequestTokenResponse, AccessTokenResponse } from './oauth.js'
```

**OAuth types (src/types/discogs/oauth.ts):**

```typescript
// Extract types from @lionralfs responses (library doesn't export them)
export interface RequestTokenResponse {
  token: string
  tokenSecret: string
  authorizeUrl: string
}

export interface AccessTokenResponse {
  accessToken: string
  accessTokenSecret: string
}
```

**Module augmentation (if needed - src/types/discogs/extensions.d.ts):**

```typescript
// Only if discojs types are incomplete
declare module 'discojs' {
  interface CollectionRelease {
    // Add missing fields discovered after migration
    custom_field?: string
  }
}
```

## Build Order

### Phase Dependencies

```
Phase 1: Throttling Foundation (no dependencies)
├── Create src/server/discogs/throttle.ts
└── Install Bottleneck: bun add bottleneck

Phase 2: Error Handling Migration (depends on throttle)
├── Move src/server/trpc/error-utils.ts → src/server/discogs/error-utils.ts
└── Extend for discojs error shapes

Phase 3: Type System (depends on Phase 1, 2)
├── Install discojs: bun add discojs
├── Create src/types/discogs/oauth.ts
├── Create src/types/discogs/index.ts (re-exports)
└── Create src/types/discogs/extensions.d.ts (placeholder)

Phase 4: Library Wrappers (depends on Phase 1, 2, 3)
├── Create src/server/discogs/oauth.ts (@lionralfs wrapper)
├── Create src/server/discogs/client.ts (discojs wrapper)
└── Create src/server/discogs/index.ts (facade entry)

Phase 5: tRPC Router Updates (depends on Phase 4)
├── Update src/server/trpc/routers/oauth.ts (use facade)
├── Update src/server/trpc/routers/discogs.ts (use facade)
└── Remove src/server/discogs-client.ts (deprecated)

Phase 6: Type Migration (depends on Phase 5)
├── Update import paths in hooks (use-collection, use-user-profile)
├── Remove src/types/discogs.ts (replaced by discojs types)
└── Verify type inference works (no `as unknown as` casts)
```

### Build Considerations

**New dependencies:**

```bash
bun add discojs          # Data client with complete types
bun add bottleneck       # Rate limiting
bun add @types/bottleneck -D  # TypeScript types
```

**Removed dependencies:**

- None (@lionralfs/discogs-client still needed for OAuth)

**Bundle impact:**

- **discojs:** ~50KB (includes full API types)
- **Bottleneck:** ~15KB (rate limiting logic)
- **Net increase:** ~65KB server-side only (Vercel functions)

**TypeScript considerations:**

- All imports in src/server/ must use `.js` extensions (Vercel requirement)
- No `@/` path aliases in server code (use relative paths)
- Test with `vercel build` after migration (catches issues local build misses)

## Architectural Patterns

### Pattern 1: Facade with Library-Specific Wrappers

**What:** Single public interface (src/server/discogs/index.ts) coordinates multiple libraries
**When to use:** Multiple libraries serve different purposes but share concerns (rate limiting, error handling)
**Trade-offs:**

- PRO: tRPC routers unaware of library split, single import point
- PRO: Throttling shared transparently across OAuth + data calls
- PRO: Future library swaps isolated to facade internals
- CON: Indirection layer adds one file hop for debugging

**Why this pattern:**

Based on [facade pattern research](https://refactoring.guru/design-patterns/facade/typescript/example), facades excel at coordinating multiple subsystems (OAuth library + data library) behind a unified API. The pattern is "particularly useful when dealing with legacy systems, large APIs, or complex workflows that require interaction with multiple components."

### Pattern 2: Shared Bottleneck Instance

**What:** Single throttleLimiter imported by both oauth.ts and client.ts
**When to use:** Multiple clients share same API rate limit quota
**Trade-offs:**

- PRO: Accurately respects Discogs 60/min limit across all call types
- PRO: Prevents OAuth token exchange from consuming quota needed for data calls
- PRO: Automatic queueing and retry on 429 errors
- CON: OAuth calls count against data call budget (acceptable, OAuth is rare)

**Why this pattern:**

Bottleneck supports [clustering with Redis](https://github.com/SGrondin/bottleneck) for distributed rate limiting, but VinylDeck uses Vercel Serverless Functions (stateless). Single shared instance works because:

1. Vercel routes all /api/trpc requests through same function instance (hot start)
2. OAuth calls are rare (login flow only), won't starve data requests
3. Reservoir pattern (60 refill per minute) matches Discogs limit exactly

**Future scaling consideration:** If VinylDeck adds multiple serverless instances (geographic regions), upgrade to Redis-backed Bottleneck clustering.

### Pattern 3: Method-Level Throttle Wrapping

**What:** Each facade method wraps library call in `throttleLimiter.schedule()`
**When to use:** Need fine-grained control over which operations are rate limited
**Trade-offs:**

- PRO: Explicit visibility into what's throttled (every method shows schedule())
- PRO: Allows per-method customization later (different priorities, timeouts)
- CON: Boilerplate (every method needs wrapping)

**Why not client-level wrapping:**

Could wrap entire discojs client in Proxy, but:

- Proxy doesn't work with method chaining (client.user().collection().getReleases())
- Harder to debug (which method triggered throttle?)
- Method-level wrapping is more explicit and maintainable

## Anti-Patterns

### Anti-Pattern 1: Exposing Raw Library Instances

**What people do:** Export `new Discojs()` directly from facade
**Why it's wrong:**

- Clients can call methods without throttling (bypass rate limiting)
- Can't enforce error handling (clients must remember to catch)
- Future library swap requires updating all import sites

**Do this instead:** Export factory returning object with specific methods (facade pattern)

### Anti-Pattern 2: Separate Throttle Instances per Library

**What people do:** Create one Bottleneck for @lionralfs, another for discojs
**Why it's wrong:**

- Both libraries hit same Discogs API endpoint, share same rate limit
- Could exceed 60/min by splitting quota (30 OAuth + 30 data = 60, but both could spike to 60)
- Doesn't reflect reality of shared API quota

**Do this instead:** Single shared throttleLimiter imported by both wrappers

### Anti-Pattern 3: Duplicating Types from discojs

**What people do:** Copy discojs types into src/types/discogs.ts
**Why it's wrong:**

- Maintenance burden (must sync with library updates)
- Version skew (types don't match actual API responses)
- Defeats purpose of using discojs (superior types)

**Do this instead:** Re-export types from discojs, use module augmentation for missing fields

### Anti-Pattern 4: Not Testing with `vercel build`

**What people do:** Only test with `bun run build` locally
**Why it's wrong:**

- Vercel Serverless Functions use different TypeScript compiler settings
- Missing `.js` extensions pass locally, fail on Vercel
- Path alias issues only surface on Vercel

**Do this instead:** Always run `vercel build` before pushing (documented in CLAUDE.md)

## Migration Risks

### Risk 1: discojs API Differences

**Likelihood:** Medium
**Impact:** High

**Scenario:** discojs method signatures differ from @lionralfs, breaking existing tRPC routers

**Mitigation:**

1. Research discojs API during Phase 3 (Type System)
2. Create mapping layer in client.ts if method names differ
3. Keep @lionralfs as fallback if discojs doesn't support operation

### Risk 2: Throttling Over-Constrains Requests

**Likelihood:** Low
**Impact:** Medium

**Scenario:** Bottleneck settings too conservative, users see slow loading

**Mitigation:**

1. Start with conservative settings (minTime: 1000ms, maxConcurrent: 5)
2. Monitor Bottleneck events in production (depleted, failed)
3. Tune based on real usage (increase maxConcurrent if no 429s)

### Risk 3: Error Shape Incompatibilities

**Likelihood:** Medium
**Impact:** Medium

**Scenario:** discojs throws different error shapes than @lionralfs, breaks error handling

**Mitigation:**

1. Extend error-utils.ts with discojs-specific guards (Phase 2)
2. Test all error paths (401, 429, 500, network errors)
3. Ensure both libraries map to same TRPCError codes

### Risk 4: Type Inference Failures

**Likelihood:** Low
**Impact:** Low

**Scenario:** discojs types still incomplete, require `as unknown as` casts

**Mitigation:**

1. Use module augmentation (extensions.d.ts) to fill gaps
2. Report missing types to discojs maintainer
3. Fallback to inline type assertions if module augmentation doesn't work

## Success Metrics

Architecture migration is successful when:

- [ ] All tRPC routers use facade (no direct library imports)
- [ ] No `as unknown as` type casts in discogs.ts router
- [ ] Bottleneck throttling active (check via event listeners)
- [ ] OAuth calls and data calls share rate limit quota
- [ ] Error handling works for both libraries (401/429/500 tests pass)
- [ ] `vercel build` succeeds with no TypeScript errors
- [ ] No regression in existing functionality (collection fetch, OAuth flow)

**Validation steps:**

1. Add Bottleneck event logging, verify schedule() calls in serverless logs
2. Trigger 429 error (spam requests), verify retry logic works
3. Remove access tokens, verify 401 handling disconnects user
4. Test with `bun run build` AND `vercel build`

## Sources

**Facade Pattern:**

- [Facade in TypeScript](https://refactoring.guru/design-patterns/facade/typescript/example) - HIGH confidence, canonical design patterns resource
- [A Guide to the Facade Design Pattern in TypeScript](https://medium.com/@robinviktorsson/a-guide-to-the-facade-design-pattern-in-typescript-and-node-js-with-practical-examples-b568a45b7dfa) - MEDIUM confidence, practical examples
- [Common Design Patterns in TypeScript](https://birdeatsbug.com/blog/common-design-patterns-in-typescript) - MEDIUM confidence, library coordination use case

**Bottleneck Rate Limiting:**

- [GitHub - SGrondin/bottleneck](https://github.com/SGrondin/bottleneck) - HIGH confidence, official documentation
- [Prevent API Overload: A Comprehensive Guide to Rate Limiting with Bottleneck](https://dev.to/arifszn/prevent-api-overload-a-comprehensive-guide-to-rate-limiting-with-bottleneck-c2p) - MEDIUM confidence, integration patterns
- [Rate limiting API calls - sometimes a Bottleneck is a good thing](https://dev.to/rcoundon/rate-limiting-api-calls-sometimes-a-bottleneck-is-a-good-thing-1h5o) - MEDIUM confidence, API client use case

**TypeScript Module Augmentation:**

- [TypeScript: Documentation - Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) - HIGH confidence, official TypeScript docs
- [Module Augmentation in TypeScript](https://www.digitalocean.com/community/tutorials/typescript-module-augmentation) - HIGH confidence, comprehensive guide
- [Extending various TypeScript type declarations](https://dev.to/wojciechmatuszewski/extending-various-typescript-type-declarations-36km) - MEDIUM confidence, practical examples

**discojs Library:**

- [GitHub - aknorw/discojs](https://github.com/aknorw/discojs) - HIGH confidence, official repository
- [discojs Documentation](https://aknorw.github.io/discojs/) - HIGH confidence, official docs
- [discojs - npm](https://www.npmjs.com/package/discojs) - HIGH confidence, package registry

**OAuth Integration:**

- [OAuth Libraries for Node.js](https://oauth.net/code/nodejs/) - MEDIUM confidence, ecosystem overview
- [GitHub - lionralfs/discogs-client](https://github.com/lionralfs/discogs-client) - HIGH confidence, current OAuth library

---

_Architecture research for: VinylDeck dual-library coordination (discojs + @lionralfs)_
_Researched: 2026-02-03_

# Features Research: API Facade Layer

**Project:** VinylDeck v1.1 API Types Architecture
**Domain:** Hybrid API facade combining OAuth (@lionralfs) with typed data client (discojs)
**Researched:** 2026-02-03
**Confidence:** HIGH (based on established API client patterns, facade design patterns, and type-safe client architectures)

## Feature Landscape

### Table Stakes (Must-Have for Facade to Be Useful)

Features that users (developers consuming the facade) expect. Missing these makes the facade incomplete or unusable.

| Feature                  | Why Expected                                              | Complexity | Notes                                                 |
| ------------------------ | --------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| Single client factory    | Facade should hide dual-library complexity                | LOW        | `createDiscogsClient()` as sole entry point           |
| Automatic OAuth handoff  | Token management between @lionralfs and discojs invisible | LOW        | Extract tokens from @lionralfs, inject into discojs   |
| Type-safe responses      | Primary value of discojs over @lionralfs                  | LOW        | Import and re-export discojs types                    |
| Rate limit exposure      | UI needs remaining requests for UX decisions              | MEDIUM     | Extract from discojs internals or maintain separately |
| Error normalization      | Different libraries throw different error shapes          | MEDIUM     | Unified error interface for tRPC layer                |
| Request/response headers | OAuth signing, user-agent, rate limit tracking            | LOW        | Both libraries support, facade passes through         |
| Authenticated calls      | Core use case (user's collection)                         | LOW        | Already working with @lionralfs                       |

### Differentiators (Competitive Advantage Over Direct Library Usage)

Features that make the facade better than developers using @lionralfs or discojs directly.

| Feature                      | Value Proposition                                               | Complexity | Notes                                                              |
| ---------------------------- | --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| Proactive rate limiting      | Prevents 429 errors before they happen                          | HIGH       | Bottleneck queue with 60/min (auth) or 25/min (unauth) limits      |
| Retry-After handling         | Auto-retry with exponential backoff on rate limit               | MEDIUM     | Parse 429 response Retry-After header, queue for retry             |
| Optional authentication      | Enables future unauthenticated browsing                         | MEDIUM     | Facade accepts optional tokens, routes to appropriate library mode |
| Unified type augmentation    | Missing fields (avatar_url, banner_url) added once              | LOW        | Module augmentation extends discojs types for both OAuth and data  |
| Response metadata            | Rate limit, request timing, pagination info in single object    | MEDIUM     | Structured metadata wrapper around discojs responses               |
| Transparent library swapping | Can replace discojs without changing tRPC layer                 | MEDIUM     | Facade interface isolates implementation from consumers            |
| Progress streaming support   | Architecture enables future aggregation with progress callbacks | HIGH       | Deferred to future milestone, but facade designed to support       |

### Anti-Features (Deliberately NOT Building)

Features that seem useful but create problems or violate design principles.

| Anti-Feature                  | Why Requested                      | Why Avoid                                                 | Alternative                                                 |
| ----------------------------- | ---------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Runtime validation with io-ts | "Catch API contract changes"       | Bundle size overhead, performance cost, false security    | Use TypeScript types only, let API errors surface naturally |
| Request caching layer         | "Reduce API calls"                 | Wrong layer (TanStack Query handles this), violates SRP   | Keep facade stateless, caching is Query's job               |
| Custom OAuth implementation   | "Reduce dependencies"              | Security risk, maintenance burden, reinventing wheel      | Keep @lionralfs for OAuth, mature and tested                |
| Wrapped promise API           | "Modernize discojs callback style" | discojs already uses promises, unnecessary abstraction    | Use discojs promises directly                               |
| Built-in retry for all errors | "Make it resilient"                | Retrying 4xx errors wastes quota, wrong for auth failures | Retry only transient errors (429, 5xx, network)             |
| Request/response logging      | "Debug API issues"                 | Belongs in tRPC middleware, not client library            | Use tRPC logging, keep facade focused                       |
| Type generation from OpenAPI  | "Auto-sync with API"               | Complexity explosion, discojs already maintains types     | Trust discojs maintenance, contribute upstream if gaps      |

## Feature Dependencies

```
[Single Client Factory]
    └──requires──> [OAuth handoff] (tokens from @lionralfs to discojs)
    └──requires──> [Optional authentication] (mode selection)

[Type-Safe Responses]
    └──requires──> [discojs types import]
    └──requires──> [Module augmentation] (for missing fields)

[Proactive Rate Limiting]
    └──requires──> [Bottleneck integration]
    └──requires──> [Rate limit exposure] (feedback loop)
    └──enhances──> [Retry-After handling]

[Retry-After Handling]
    └──requires──> [Error normalization] (detect 429)
    └──requires──> [Proactive rate limiting] (queue management)

[Response Metadata]
    └──requires──> [Rate limit exposure]
    └──enhances──> [Type-safe responses] (wrapper pattern)

[Optional Authentication]
    └──enables──> [Future unauthenticated browsing]
    └──affects──> [Rate limit strategy] (60/min vs 25/min)

[Progress Streaming Support]
    └──requires──> [Response metadata] (foundation)
    └──blocked by──> Out of scope for v1.1
```

### Dependency Notes

- **OAuth handoff is foundational**: Nothing works without token passing between libraries
- **Rate limiting and retry are coupled**: Retry-After responses feed back into rate limiter state
- **Type augmentation is independent**: Can be done separately from client factory
- **Progress streaming deferred**: Architecture supports it, but implementation is future milestone

## MVP Definition

### Launch With (v1.1)

Minimum viable facade - what's needed to replace current architecture.

**Core functionality:**

- ✓ Single factory function: `createDiscogsClient(tokens?, options?)`
- ✓ OAuth token handoff from @lionralfs to discojs
- ✓ Type imports from discojs (Collection, Pagination, User, Identity)
- ✓ Module augmentation for missing fields (avatar_url, banner_url, date_added, etc.)
- ✓ Bottleneck rate limiting (60/min auth, 25/min unauth)
- ✓ Retry-After parsing and handling for 429 errors
- ✓ Error normalization (DiscogsApiError interface)
- ✓ Rate limit metadata exposure to tRPC layer

**Out of scope for v1.1:**

- Progress streaming (architecture supports, implementation deferred)
- Unauthenticated browsing UI (facade supports, UI is future milestone)
- Request interceptors (not needed yet)
- Response caching (wrong layer, TanStack Query handles this)

### Add After Validation (v1.2+)

Features to add once core facade is stable and proven.

- [ ] Progress callbacks for aggregation endpoints (when aggregation milestone starts)
- [ ] Dynamic rate limit adjustment based on X-Discogs-Ratelimit headers
- [ ] Request timeout configuration (if Discogs API proves unreliable)
- [ ] Circuit breaker pattern (if sustained API errors become common)

### Future Consideration (v2+)

Features to defer until broader API needs emerge.

- [ ] Request/response interceptors (only if multiple cross-cutting concerns emerge)
- [ ] Batch request support (if Discogs adds batch endpoints)
- [ ] WebSocket support for real-time updates (if Discogs adds WebSocket API)

## Feature Prioritization Matrix

| Feature                 | User Value | Implementation Cost | Priority      |
| ----------------------- | ---------- | ------------------- | ------------- |
| Single client factory   | HIGH       | LOW                 | P1            |
| OAuth handoff           | HIGH       | LOW                 | P1            |
| Type imports            | HIGH       | LOW                 | P1            |
| Module augmentation     | HIGH       | LOW                 | P1            |
| Error normalization     | HIGH       | MEDIUM              | P1            |
| Proactive rate limiting | HIGH       | HIGH                | P1            |
| Retry-After handling    | HIGH       | MEDIUM              | P1            |
| Rate limit exposure     | MEDIUM     | MEDIUM              | P1            |
| Optional authentication | MEDIUM     | MEDIUM              | P1            |
| Response metadata       | MEDIUM     | MEDIUM              | P2            |
| Progress streaming      | LOW        | HIGH                | P3 (deferred) |
| Dynamic rate limits     | LOW        | MEDIUM              | P3            |

**Priority key:**

- P1: Must have for v1.1 launch
- P2: Should have, add when core stable
- P3: Nice to have, future consideration

## Acceptance Criteria

### Single Client Factory

**Given:** tRPC router needs a Discogs client
**When:** `createDiscogsClient({ accessToken, accessTokenSecret })` is called
**Then:**

- Returns single client instance with all methods (collection, user, identity)
- OAuth tokens passed through to both libraries transparently
- Client is ready to make authenticated calls

**Edge cases:**

- Calling without tokens should create unauthenticated client (25/min rate limit)
- Invalid token format should throw clear error (not pass to Discogs API)

### Type-Safe Responses

**Given:** Client calls `client.collection.get(username, { page: 1 })`
**When:** Response is returned
**Then:**

- TypeScript infers correct response type from discojs
- Response includes all fields from Discogs API (pagination, releases, etc.)
- Module-augmented fields (avatar_url, banner_url) are type-safe
- No `as unknown as` casts needed in consuming code

**Edge cases:**

- Optional fields correctly typed as `field?: Type` or `field: Type | undefined`
- Array fields correctly typed (not `any[]`)

### Proactive Rate Limiting

**Given:** Client makes 58 requests in 60 seconds (approaching 60/min limit)
**When:** 59th request is made
**Then:**

- Request is queued by Bottleneck
- Request waits until rate limit window resets
- No 429 error occurs
- Request completes successfully after wait

**Edge cases:**

- Unauthenticated requests use 25/min limit
- Multiple concurrent requests don't exceed limit
- Rate limit resets after 60 seconds of no requests

### Retry-After Handling

**Given:** Client receives 429 rate limit error with `Retry-After: 30` header
**When:** Retry logic triggers
**Then:**

- Request is not immediately retried
- Request waits 30 seconds (from Retry-After header)
- Request retries automatically after wait
- Successful response returned to caller

**Edge cases:**

- Missing Retry-After header falls back to exponential backoff
- Max retry count prevents infinite loops
- Auth errors (401, 403) do not retry

### Error Normalization

**Given:** discojs or @lionralfs throws an error
**When:** Error propagates through facade
**Then:**

- Error conforms to `DiscogsApiError` interface
- Error includes status code, message, response body
- Error includes rate limit info if available
- tRPC layer can handle error uniformly

**Edge cases:**

- Network errors (no response) include clear message
- Unexpected error shapes (null, string, etc.) are wrapped

### Rate Limit Exposure

**Given:** Client makes successful request
**When:** Response is returned
**Then:**

- Response metadata includes `rateLimit: { limit, used, remaining }`
- Values match X-Discogs-Ratelimit-\* headers
- tRPC can pass to UI for display

**Edge cases:**

- Missing headers default to known limits (60 auth, 25 unauth)
- Invalid header values (non-numeric) are handled gracefully

### Optional Authentication

**Given:** Client created without tokens
**When:** `createDiscogsClient()` called with no auth
**Then:**

- Client uses unauthenticated mode (25/min rate limit)
- Public endpoints accessible (database, search)
- Private endpoints (collection, wantlist) throw clear auth error
- Rate limiter uses 25/min threshold

**Edge cases:**

- Switching from unauth to auth requires new client instance
- Unauth client doesn't accept token methods

## Implementation Considerations

### Facade Interface Design

```typescript
// Unified client interface
interface DiscogsClient {
  // Data methods (from discojs)
  collection: {
    get(
      username: string,
      options?: PaginationOptions
    ): Promise<CollectionResponse>
    getMetadata(username: string): Promise<CollectionMetadata>
  }
  user: {
    getProfile(username: string): Promise<UserProfile>
    getIdentity(): Promise<Identity>
  }

  // Metadata access
  getRateLimitState(): RateLimitState

  // Lifecycle (for Bottleneck cleanup)
  close(): Promise<void>
}

// Factory function
function createDiscogsClient(
  auth?: { accessToken: string; accessTokenSecret: string },
  options?: { userAgent?: string }
): DiscogsClient
```

### Rate Limiting Strategy

**Bottleneck configuration:**

```typescript
const limiter = new Bottleneck({
  reservoir: auth ? 60 : 25, // Max requests per window
  reservoirRefreshAmount: auth ? 60 : 25,
  reservoirRefreshInterval: 60 * 1000, // 60 seconds
  minTime: 1000, // Minimum 1s between requests
  maxConcurrent: 5 // Max parallel requests
})
```

**Retry-After handling:**

- Parse `Retry-After` header from 429 responses
- Use Bottleneck's `schedule` with delay
- Exponential backoff if no Retry-After header (1s, 2s, 4s, 8s, fail)
- Max 3 retries to prevent infinite loops

### Error Normalization Approach

```typescript
interface DiscogsApiError extends Error {
  status?: number
  code: string
  body?: unknown
  rateLimit?: RateLimitState
  isRetryable: boolean
}

function normalizeError(error: unknown, context: string): DiscogsApiError {
  // Detect error type (@lionralfs vs discojs vs network)
  // Normalize to unified interface
  // Mark retryable vs non-retryable
}
```

### Module Augmentation Pattern

```typescript
// src/types/discogs-augmented.ts
import type { Collection, UserProfile } from 'discojs'

declare module 'discojs' {
  interface Collection {
    releases: Array<
      CollectionRelease & {
        date_added?: string
        master_id?: number
        master_url?: string
        resource_url?: string
      }
    >
  }

  interface UserProfile {
    avatar_url?: string
    banner_url?: string
  }
}
```

## Comparison: Direct Library Usage vs Facade

| Aspect            | Direct (@lionralfs + discojs)       | Via Facade                  | Advantage                |
| ----------------- | ----------------------------------- | --------------------------- | ------------------------ |
| **Setup**         | Configure both libraries separately | Single factory call         | Facade: simpler          |
| **Types**         | @lionralfs (weak), discojs (strong) | Unified strong types        | Facade: consistent       |
| **Rate limiting** | Manual tracking, reactive           | Proactive queue, auto-retry | Facade: prevents errors  |
| **Auth**          | Different patterns per library      | Unified token passing       | Facade: less error-prone |
| **Errors**        | Different shapes per library        | Normalized interface        | Facade: easier handling  |
| **Metadata**      | Parse headers manually              | Structured response         | Facade: DX improvement   |
| **Swapping**      | Breaks all consumers                | Isolated to facade          | Facade: maintainable     |

## Sources

### API Design Patterns (HIGH confidence)

- [A Guide to the Facade Design Pattern in TypeScript and Node.js](https://medium.com/@robinviktorsson/a-guide-to-the-facade-design-pattern-in-typescript-and-node-js-with-practical-examples-b568a45b7dfa) - Facade pattern in TypeScript/Node.js
- [Facade - Design Patterns in TypeScript](https://sbcode.net/typescript/facade/) - TypeScript facade implementation
- [Facade in TypeScript / Design Patterns](https://refactoring.guru/design-patterns/facade/typescript/example) - Refactoring Guru facade examples
- [TypeScript Best Practices for Large-Scale Web Applications in 2026](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/) - Modern TypeScript patterns

### OAuth & Authentication Architecture (MEDIUM confidence)

- [OAuth 2.1 Features You Can't Ignore in 2026](https://rgutierrez2004.medium.com/oauth-2-1-features-you-cant-ignore-in-2026-a15f852cb723) - OAuth 2.1 security best practices
- [Auth Facade Pattern - Simplifying Identity Management](https://fusionauth.io/articles/ciam/auth-facade-pattern) - Identity facade patterns
- [API Security Maturity Model](https://curity.io/resources/learn/the-api-security-maturity-model/) - Token-based architecture progression

### Type-Safe API Clients (HIGH confidence)

- [Creating a Type-Safe API Client with TypeScript and React](https://medium.com/@ignatovich.dm/creating-a-type-safe-api-client-with-typescript-and-react-ce1b82bf8b9b) - TypeScript generics for API clients
- [How to Build a REST API with TypeScript in 2026](https://encore.dev/articles/build-rest-api-typescript-2026) - Modern TypeScript API patterns
- [Building Type-Safe REST Clients in TypeScript](https://toastingcode.com/posts/building-type-safe-rest-clients-in-typescript-proven-patterns-and-tools-for-enterprise-apis/) - Enterprise patterns, runtime validation
- [tRPC - Move Fast and Break Nothing](https://trpc.io/) - End-to-end type safety reference

### Rate Limiting Best Practices (HIGH confidence)

- [API Rate Limiting 2026 - How It Works & Why It Matters](https://www.levo.ai/resources/blogs/api-rate-limiting-guide-2026) - Token bucket, sliding window algorithms
- [Rate Limiting Best Practices in REST API Design](https://www.speakeasy.com/api-design/rate-limiting) - Tiered limits, response headers
- [10 Best Practices for API Rate Limiting in 2025](https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025) - Algorithms, dynamic limits, monitoring
- [Mastering API Rate Limiting](https://testfully.io/blog/api-rate-limit/) - Retry-After headers, client-side strategies

### Error Handling & Retry Strategies (MEDIUM confidence)

- [Resilient API Calls with ts-retry-promise](https://typescript.tv/best-practices/resilient-api-calls-with-ts-retry-promise/) - TypeScript retry patterns
- [Type Safe Retry Function In Typescript](https://tusharf5.com/posts/type-safe-retry-function-in-typescript/) - Typed retry logic
- [Building Resilient Systems with API Retry Mechanisms](https://medium.com/@devharshgupta.com/building-resilient-systems-with-api-retry-mechanisms-in-node-js-a-guide-to-handling-failure-d6d9021b172a) - Exponential backoff, circuit breakers

### Progress Streaming (MEDIUM confidence)

- [AI System Design Patterns for 2026](https://zenvanriel.nl/ai-engineer-blog/ai-system-design-patterns-2026/) - Streaming through stack layers, SSE patterns
- [Stream Processing Design Patterns](https://www.datacouncil.ai/talks/stream-processing-design-patterns) - Latency vs throughput balance
- [Mastering API Design Patterns](https://mayurashinde.medium.com/mastering-api-design-patterns-best-practices-for-building-robust-apis-ef950da4f169) - SSE for event-driven APIs

### Library Abstraction Anti-Patterns (MEDIUM confidence)

- [Leaky Abstractions](https://alexkondov.com/leaky-abstractions/) - When abstractions fail to hide complexity
- [When NOT to Write an Abstraction Layer](https://codeopinion.com/when-not-to-write-an-abstraction-layer/) - Over-abstraction of opinionated libraries
- [Library patterns: Multiple levels of abstraction](https://tomasp.net/blog/2015/library-layers/) - Multi-level API design
- [The shared code fallacy](https://www.ben-morris.com/the-shared-code-fallacy-why-internal-libraries-are-an-anti-pattern/) - Coupling through shared libraries

---

_Feature research for: API Facade Layer (Hybrid @lionralfs + discojs)_
_Researched: 2026-02-03_
_Milestone: v1.1 Improve API Types_

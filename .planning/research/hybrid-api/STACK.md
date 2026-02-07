# Stack Research: Hybrid Discogs API Architecture

**Domain:** Hybrid @lionralfs + discojs architecture with server-side rate limiting
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

VinylDeck needs to transition from full @lionralfs/discogs-client to a hybrid architecture:

- **Keep @lionralfs** for OAuth 1.0a flow (discojs can't do OAuth dance)
- **Add discojs** for data calls (better TypeScript types via io-ts)
- **Add Bottleneck** for server-side rate limiting (replace passive tracking)
- **Module augmentation** to extend discojs types for missing Discogs fields

This is a SUBSEQUENT MILESTONE adding to existing capabilities. Focus is on stack additions, not architectural validation.

## Recommended Stack Additions

### Core Library: discojs

| Package   | Version  | Purpose                             | Why                                                    |
| --------- | -------- | ----------------------------------- | ------------------------------------------------------ |
| `discojs` | `^2.3.1` | Discogs API client with io-ts types | Runtime-validated types, better than manual type casts |

**Key capabilities:**

- Runtime type validation via io-ts codecs
- TypeScript types generated from io-ts schemas
- Handles authentication with pre-existing OAuth tokens
- Built-in rate limiter (Bottleneck) - but we'll use our own server-side instance

**What discojs CANNOT do:**

- OAuth 1.0a flow (getting request token, redirecting user, exchanging for access token)
- This is why @lionralfs stays for OAuth

**Installation:**

```bash
bun add discojs
```

**Dependencies brought in by discojs:**

- `io-ts` (^2.2.16) - Runtime type system
- `fp-ts` (^2.12.3) - Functional programming utilities (peer dep of io-ts)
- `bottleneck` (^2.19.5) - Rate limiting (discojs uses internally)
- `cross-fetch` (^3.1.5) - Fetch polyfill
- `oauth-1.0a` (^2.2.6) - OAuth signing (won't use, we have @lionralfs)

**Bundle impact:**

- Total package: ~477 KB unpacked
- io-ts + fp-ts: Significant size (~100KB+ minified)
- Server-only usage: No client bundle impact (used in tRPC serverless functions)
- Client types only: Zero runtime cost (types stripped at build)

**Version currency:**

- Last published: 9 months ago (May 2025)
- Stable, no breaking changes expected
- io-ts and fp-ts are mature libraries (fp-ts considering v3 as Effect-TS)

### Rate Limiting: Bottleneck

| Package      | Version   | Purpose                   | Why                                                    |
| ------------ | --------- | ------------------------- | ------------------------------------------------------ |
| `bottleneck` | `^2.19.5` | Server-side rate limiting | Zero dependencies, clustering support, proven at scale |

**Why replace passive rate limiter:**

- Current implementation: Passive tracking (reads headers, warns, doesn't prevent)
- New implementation: Active limiting (enforces 60 req/min, queues excess)
- Prevents 429 errors before they happen

**Key features:**

- Zero dependencies
- Built-in TypeScript types
- Clustering support via Redis (not needed for single-region Vercel)
- Handles burst traffic with reservoir/penalty patterns
- 2.6M weekly downloads, battle-tested

**Vercel serverless considerations:**

- Serverless functions are stateless between invocations
- In-memory Bottleneck state resets per cold start
- For single-user app: Acceptable (each user's function instance limits their own requests)
- For multi-tenant: Would need Redis clustering (not our case)

**Why NOT Redis clustering:**

- VinylDeck is single-user per deployment (each user runs their own Vercel project)
- Rate limits are per-user OAuth token anyway
- In-memory state is sufficient
- Avoids Redis dependency and cost

**Installation:**

```bash
bun add bottleneck
```

### TypeScript Module Augmentation

**No package needed.** Use built-in TypeScript declaration merging.

**Purpose:** Extend discojs types to include Discogs fields missing from their schemas:

- `avatar_url` (user profile)
- `banner_url` (user profile)
- Any other undocumented fields VinylDeck uses

**Pattern:**

```typescript
// src/types/discogs-augmentation.d.ts
import 'discojs'

declare module 'discojs/lib/types' {
  interface User {
    avatar_url?: string
    banner_url?: string
  }
}
```

**Sources for augmentation:**

- [TypeScript Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) - Official docs
- [DigitalOcean Module Augmentation Guide](https://www.digitalocean.com/community/tutorials/typescript-module-augmentation) - Practical examples

## Integration Points

### 1. OAuth Flow (No Change)

**Keep @lionralfs/discogs-client for:**

- `getRequestToken()` - Start OAuth flow
- `getAccessToken()` - Exchange request token for access token

**File:** `src/server/routers/oauth.ts`

**Why:** discojs accepts OAuth tokens but cannot perform the OAuth dance. @lionralfs handles this correctly.

### 2. Data Calls (Migrate to discojs)

**Migrate these tRPC procedures to discojs:**

- `discogs.getIdentity` - Get user identity
- `discogs.getUserProfile` - Get user profile (avatar, email)
- `discogs.getCollection` - Get collection with pagination
- `discogs.getCollectionMetadata` - Fast count check

**Before (with @lionralfs):**

```typescript
// Manual type casting, no runtime validation
const identity = (await client.database().getIdentity()) as DiscogsIdentity
```

**After (with discojs):**

```typescript
// Runtime-validated types
import { client } from 'discojs'
const db = client({ auth: { userToken: oauthToken } })
const identity = await db.user().getIdentity() // Type: t.TypeOf<typeof IdentityCodec>
```

### 3. Rate Limiting (Replace Passive Tracker)

**Current:** `src/api/rate-limiter.ts` - Passive tracking from response headers

**New:** Proactive Bottleneck instance in tRPC context

**File:** `src/server/init.ts` or `src/server/rate-limiter.ts`

**Implementation:**

```typescript
import Bottleneck from 'bottleneck'

// Discogs limits: 60 requests per minute authenticated
const limiter = new Bottleneck({
  reservoir: 60, // Initial capacity
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000, // 1 minute
  maxConcurrent: 10, // Max parallel requests
  minTime: 1000 // Min 1s between requests
})

// Wrap all Discogs calls
const rateLimitedFetch = limiter.wrap(fetch)
```

**Integration with discojs:**

- discojs has internal Bottleneck, but we control our own instance
- Pass custom fetch to discojs: `client({ fetch: rateLimitedFetch })`

### 4. tRPC Context Enhancement

**File:** `src/server/init.ts`

**Add to context:**

```typescript
interface TRPCContext {
  // Existing
  oauthTokens?: OAuthTokens

  // New
  rateLimiter: Bottleneck
  discogsClient: ReturnType<typeof createDiscogsClient> | null
}
```

**Why:** Share rate limiter and client across all procedures

## Configuration Requirements

### discojs Configuration

**Minimal setup (authentication only):**

```typescript
import { client } from 'discojs'

const db = client({
  auth: {
    userToken: oauthToken // From @lionralfs OAuth flow
  },
  userAgent: 'VinylDeck/0.3.1 +https://github.com/danieldjupvik/VinylDeck'
})
```

**Full setup (with custom rate limiter):**

```typescript
const db = client({
  auth: { userToken: oauthToken },
  userAgent: 'VinylDeck/0.3.1',
  rateLimit: false, // Disable discojs internal limiter
  fetch: rateLimitedFetch // Use our Bottleneck instance
})
```

### Bottleneck Configuration

**For Discogs API (60 req/min authenticated):**

```typescript
const limiter = new Bottleneck({
  // Reservoir pattern (token bucket)
  reservoir: 60,
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000,

  // Concurrency controls
  maxConcurrent: 10,
  minTime: 1000,

  // Error handling
  trackDoneStatus: true,

  // No Redis (single-user app)
  datastore: 'local'
})

// Event handlers for observability
limiter.on('failed', async (error, jobInfo) => {
  if (jobInfo.retryCount < 2) {
    console.warn(`Rate limit retry ${jobInfo.retryCount + 1}`)
    return 5000 // Retry after 5s
  }
})

limiter.on('depleted', () => {
  console.warn('Rate limit reservoir depleted, queueing requests')
})
```

### Module Augmentation Setup

**File:** `src/types/discogs-augmentation.d.ts`

**Extends discojs types for missing fields:**

```typescript
import 'discojs'

declare module 'discojs/lib/types' {
  // User profile extensions
  interface User {
    avatar_url?: string
    banner_url?: string
  }

  // Add more as needed based on VinylDeck usage
}
```

**TypeScript config (already correct):**

- `src/types/` is included in tsconfig.json
- `.d.ts` files are auto-discovered
- No additional configuration needed

## Bundle Impact Analysis

### Server-Side (Vercel Serverless Functions)

| Package    | Size Impact      | Notes                                  |
| ---------- | ---------------- | -------------------------------------- |
| discojs    | ~477 KB unpacked | Server-only, no client impact          |
| io-ts      | ~50 KB minified  | Peer dep, server-only                  |
| fp-ts      | ~60 KB minified  | Peer dep, server-only                  |
| bottleneck | ~20 KB minified  | Zero dependencies                      |
| **Total**  | **~600 KB**      | Acceptable for serverless (10MB limit) |

**Cold start impact:** Minimal. Bottleneck and discojs are lightweight. io-ts/fp-ts add ~100ms to cold start (one-time).

### Client-Side (React Bundle)

| Addition      | Size Impact | Notes                                      |
| ------------- | ----------- | ------------------------------------------ |
| discojs types | **0 bytes** | Types stripped at build, no runtime        |
| Type imports  | **0 bytes** | `import type { User }` - compile-time only |
| **Total**     | **0 bytes** | No client bundle increase                  |

**Why zero impact:**

- discojs used only in `src/server/` and `api/` (server-side)
- Client imports types only: `import type { User } from 'discojs'`
- TypeScript strips types during compilation
- No runtime validation on client (validated at server boundary via tRPC)

### Comparison to Alternatives

| Approach                                | Server Size | Client Size | Type Safety       |
| --------------------------------------- | ----------- | ----------- | ----------------- |
| **Current (@lionralfs + manual types)** | ~200 KB     | 0 bytes     | Manual casts      |
| **Hybrid (recommended)**                | ~800 KB     | 0 bytes     | Runtime validated |
| **Full discojs (can't do OAuth)**       | N/A         | N/A         | Not viable        |
| **Manual types + Zod**                  | ~300 KB     | 0 bytes     | Runtime validated |

**Why not Zod instead of io-ts:**

- discojs already provides io-ts schemas
- Zod would require rewriting all type definitions
- io-ts is validated by discojs maintainers against real API responses
- Would lose the benefit of using discojs

## What NOT to Add

### @types/discogs (Deprecated)

**Why avoid:**

- Unofficial, unmaintained
- Outdated type definitions
- discojs provides better types via io-ts

**Use instead:** discojs types + module augmentation for gaps

### disconnect (Alternative Discogs Client)

**Package:** `disconnect`

**Why avoid:**

- No TypeScript support
- No runtime validation
- OAuth implementation outdated
- Last updated 7 years ago

**Use instead:** @lionralfs for OAuth, discojs for data

### Custom io-ts Schemas

**Why avoid:**

- discojs already maintains comprehensive schemas
- Significant maintenance burden
- Prone to drift from actual API responses
- 100+ endpoints to type

**Use instead:** discojs types + augmentation for missing fields

### Redis for Bottleneck Clustering

**Why avoid:**

- VinylDeck is single-user per deployment
- Rate limits are per OAuth token (inherently isolated)
- Adds hosting cost (Upstash/Vercel KV)
- Adds latency (network round-trip per request)
- Adds complexity (connection pooling, error handling)

**Use instead:** In-memory Bottleneck (stateless serverless is acceptable)

### @upstash/ratelimit

**Why avoid:**

- Requires Redis (Upstash)
- Designed for multi-tenant edge functions
- VinylDeck rate limits are per-user, not global
- Adds cost and complexity

**Use instead:** Bottleneck with local datastore

### p-limit / p-queue

**Why avoid:**

- Simpler than Bottleneck (good)
- But no reservoir/penalty patterns
- No event system for observability
- No clustering option if needed later

**Use instead:** Bottleneck (proven, full-featured, zero deps)

## Migration Path

### Phase 1: Add Dependencies

```bash
bun add discojs bottleneck
```

### Phase 2: Create Rate Limiter

- File: `src/server/rate-limiter.ts`
- Export Bottleneck instance configured for Discogs

### Phase 3: Module Augmentation

- File: `src/types/discogs-augmentation.d.ts`
- Extend discojs types for `avatar_url`, `banner_url`

### Phase 4: Create discojs Client Factory

- File: `src/server/discogs-client.ts`
- Factory function: `createDiscogsClient(oauthToken: string)`
- Integrates with rate limiter

### Phase 5: Migrate tRPC Procedures (One at a Time)

- Keep @lionralfs for OAuth procedures (no changes)
- Migrate `getIdentity` first (simplest)
- Then `getUserProfile`, `getCollection`, etc.
- Update response types to use discojs types

### Phase 6: Remove Old Rate Limiter

- Delete `src/api/rate-limiter.ts` (passive tracker)
- Remove rate limit header parsing logic

## Version Compatibility

| Package                   | Version | Compatible With | Notes                        |
| ------------------------- | ------- | --------------- | ---------------------------- |
| discojs                   | 2.3.1   | Node 14+, Bun   | Works with Vercel serverless |
| io-ts                     | 2.2.16+ | TypeScript 4.1+ | Peer dep of discojs          |
| fp-ts                     | 2.12.3+ | TypeScript 4.1+ | Peer dep of io-ts            |
| bottleneck                | 2.19.5  | Node 10+, Bun   | Zero dependencies            |
| @lionralfs/discogs-client | 4.1.4   | Current         | Keep for OAuth only          |

**TypeScript version:** VinylDeck uses TS 5.9.3 - fully compatible with all packages

**Bun compatibility:**

- discojs: Yes (uses standard fetch)
- bottleneck: Yes (zero native deps)
- io-ts / fp-ts: Yes (pure TypeScript)

## Sources

### Package Information

- [discojs npm](https://www.npmjs.com/package/discojs) - v2.3.1, 477KB unpacked - HIGH confidence
- [discojs GitHub](https://github.com/aknorw/discojs) - OAuth limitations documented - HIGH confidence
- [bottleneck npm](https://www.npmjs.com/package/bottleneck) - v2.19.5, zero deps - HIGH confidence
- [bottleneck GitHub](https://github.com/SGrondin/bottleneck) - Clustering docs - HIGH confidence
- [io-ts npm](https://www.npmjs.com/package/io-ts) - v2.2.22, fp-ts peer dep - HIGH confidence

### OAuth & Authentication

- [discojs Documentation](https://aknorw.github.io/discojs/) - "OAuth workflow on your own" - HIGH confidence
- [Discogs Forum - discojs thread](https://www.discogs.com/forum/thread/779725) - Community validation - MEDIUM confidence

### Rate Limiting

- [Bottleneck Guide 2025](https://generalistprogrammer.com/tutorials/bottleneck-npm-package-guide) - Configuration examples - MEDIUM confidence
- [Rate Limiting with Bottleneck - DEV](https://dev.to/arifszn/prevent-api-overload-a-comprehensive-guide-to-rate-limiting-with-bottleneck-c2p) - Practical patterns - MEDIUM confidence

### Vercel Serverless

- [Vercel Functions Docs](https://vercel.com/docs/functions) - Stateless nature - HIGH confidence
- [Vercel Serverless State Persistence Discussion](https://github.com/vercel/next.js/discussions/36806) - Limitations - MEDIUM confidence
- [Vercel KV / Redis Docs](https://vercel.com/changelog/vercel-kv) - Why we don't need it - HIGH confidence

### TypeScript Module Augmentation

- [TypeScript Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) - Official docs - HIGH confidence
- [DigitalOcean Module Augmentation](https://www.digitalocean.com/community/tutorials/typescript-module-augmentation) - Practical guide - HIGH confidence
- [Module Augmentation in TypeScript - DEV](https://dev.to/alexteng/a-simple-example-to-understand-module-augmentation-in-typescript-5gg3) - Examples - MEDIUM confidence

---

_Stack research for: VinylDeck Hybrid Discogs API Architecture_
_Researched: 2026-02-03_
_Confidence: HIGH_

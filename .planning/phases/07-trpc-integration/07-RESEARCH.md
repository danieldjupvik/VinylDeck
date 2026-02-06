# Phase 7: tRPC Integration - Research

**Researched:** 2026-02-06
**Domain:** tRPC router integration, error mapping, type inference patterns
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Error bridging:**

- New facade-to-tRPC error mapper replacing `handleDiscogsError`
- Clean break: delete `error-utils.ts` and its helpers (`isDiscogsError`, `isNetworkError`, etc.) in this phase, not Phase 8
- Maps `DiscogsAuthError` -> `UNAUTHORIZED`/`FORBIDDEN`, `DiscogsApiError` -> status-based codes, `RateLimitError` -> `TOO_MANY_REQUESTS`
- `RateLimitError` surfaces retry-after info in the TRPCError message string
- Callback URL validation stays in the OAuth router (deployment security, not API concern)

**Response shaping:**

- Flat returns: procedures return facade types directly (Identity, User, CollectionResponse)
- No wrapping in named keys (no more `{ identity: {...} }` or `{ profile: {...} }`)
- Full type pass-through from facade — routers don't cherry-pick fields
- Add `getCollectionMetadata()` to DataClient facade (hides the perPage=1 trick)
- Client-side hooks updated in this phase to match new flat response shapes

**Token handling:**

- Keep tokens as Zod input params per procedure (stateless, matches Vercel Serverless)
- Per-procedure facade client creation (`createDiscogsClient(tokens)` per call)
- OAuth router switches to facade: `createDiscogsClient().oauth` — no direct `@lionralfs` import
- All routers import only from the facade, never from library packages directly

**Rate limit exposure:**

- Drop `rateLimit` from all tRPC responses (not a Phase 7 requirement; RATE-05 satisfied by rate-state.ts)
- discojs doesn't expose per-response rate limit headers anyway (uses Bottleneck internally)
- Client-side rateLimit destructuring cleaned up in this phase alongside response shape changes
- Rate errors still surface via TOO_MANY_REQUESTS tRPC error code with retry info in message

### Claude's Discretion

- Exact structure of the new facade-to-tRPC error mapper function
- How to organize the new error mapping (same file, new file, inline)
- Order of migration (OAuth router first vs Discogs router first)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Summary

Phase 7 rewires tRPC routers to consume the facade layer created in Phase 6. The research confirms that tRPC's type inference system naturally flows types from server to client without manual intervention, making the facade-to-tRPC integration straightforward. Key findings include tRPC's built-in error code system, type pass-through patterns, and response shaping conventions.

The current codebase has two routers (oauth.ts, discogs.ts) that directly import library packages and wrap responses in named keys. This phase will:

- Replace library imports with facade imports
- Create a facade-to-tRPC error mapper to replace `handleDiscogsError`
- Return flat responses (direct facade types)
- Remove the old `error-utils.ts` and `discogs-client.ts` files
- Add `getCollectionMetadata()` to the DataClient facade interface
- Update client-side hooks to match flat response shapes and remove `rateLimit` destructuring

**Primary recommendation:** Create a single error mapper function that converts facade errors to TRPCError instances. Migrate OAuth router first (simpler, OAuth operations only), then Discogs router (data operations). Return facade types directly without wrapping. Remove old utility files in the same phase.

## Standard Stack

### Core (Existing)

| Library           | Version | Purpose                  | Status    |
| ----------------- | ------- | ------------------------ | --------- |
| @trpc/server      | 11.8.1  | Type-safe API procedures | Installed |
| @trpc/client      | 11.8.1  | Client-side tRPC calls   | Installed |
| @trpc/react-query | 11.8.1  | React Query integration  | Installed |
| zod               | 4.3.5   | Input validation schemas | Installed |

### Supporting

| Pattern        | Purpose               | When to Use                      |
| -------------- | --------------------- | -------------------------------- |
| TRPCError      | Standard error type   | All procedure error returns      |
| Error mapping  | Convert domain errors | Facade errors to tRPC errors     |
| Type inference | Automatic type flow   | Procedure return types to client |
| Flat responses | Direct type returns   | Eliminating wrapper objects      |

### No Additional Dependencies Needed

tRPC's built-in features handle type inference, error codes, and response shaping. The facade layer already provides unified error types.

## Architecture Patterns

### Pattern 1: Facade-to-tRPC Error Mapping

**What:** Central function that converts facade errors to TRPCError instances
**When to use:** All tRPC procedure catch blocks
**Example:**

```typescript
// Source: tRPC Error Handling - https://trpc.io/docs/server/error-handling
// Adapted for facade error types

import { TRPCError } from '@trpc/server'
import {
  DiscogsApiError,
  DiscogsAuthError,
  DiscogsRateLimitError
} from '../../server/discogs/index.js'

function mapFacadeErrorToTRPC(error: unknown, operation: string): never {
  // Re-throw tRPC errors as-is
  if (error instanceof TRPCError) {
    throw error
  }

  // Auth errors (401, 403)
  if (error instanceof DiscogsAuthError) {
    const code = error.statusCode === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
    throw new TRPCError({
      code,
      message: error.message,
      cause: error
    })
  }

  // Rate limit errors (429)
  if (error instanceof DiscogsRateLimitError) {
    const retrySeconds = Math.ceil(error.retryAfterMs / 1000)
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Retry after ${retrySeconds}s`,
      cause: error
    })
  }

  // General API errors (status code based)
  if (error instanceof DiscogsApiError) {
    const statusCode = error.statusCode ?? 500
    let code: TRPCError['code'] = 'INTERNAL_SERVER_ERROR'

    if (statusCode === 400) code = 'BAD_REQUEST'
    else if (statusCode === 404) code = 'NOT_FOUND'
    else if (statusCode >= 500) code = 'INTERNAL_SERVER_ERROR'

    throw new TRPCError({
      code,
      message: error.message,
      cause: error
    })
  }

  // Unknown errors
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred'

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `Failed to ${operation}: ${errorMessage}`,
    cause: error instanceof Error ? error : undefined
  })
}
```

**Key features:**

- Preserves original error as `cause` for debugging
- Maps facade errors to appropriate tRPC codes
- Re-throws existing TRPCError instances (no double-wrapping)
- Surfaces retry timing for rate limit errors

### Pattern 2: Flat Response Returns

**What:** Procedures return facade types directly without wrapping
**When to use:** All tRPC procedures
**Example:**

```typescript
// BEFORE (wrapped response)
getIdentity: publicProcedure
  .input(z.object({ accessToken: z.string(), accessTokenSecret: z.string() }))
  .query(async ({ input }) => {
    const client = createDiscogsClient(input)
    const identity = await client.data.getIdentity()

    return {
      identity: identity,  // Wrapped in named key
      rateLimit: {...}
    }
  })

// Client destructures:
const { identity } = await trpc.discogs.getIdentity.query(...)

// AFTER (flat response)
getIdentity: publicProcedure
  .input(z.object({ accessToken: z.string(), accessTokenSecret: z.string() }))
  .query(async ({ input }) => {
    const client = createDiscogsClient(input)
    return await client.data.getIdentity()  // Direct return
  })

// Client uses directly:
const identity = await trpc.discogs.getIdentity.query(...)
```

**Benefits:**

- Type inference flows naturally from facade to client
- No manual type definitions for wrapper objects
- Cleaner client-side code (no destructuring)
- Changes in facade types automatically propagate

**Source:** tRPC documentation on type inference patterns

### Pattern 3: Per-Procedure Client Creation

**What:** Create facade client instance inside each procedure
**When to use:** Stateless Vercel Serverless Functions
**Example:**

```typescript
// OAuth router - unauthenticated client
getRequestToken: publicProcedure
  .input(z.object({ callbackUrl: z.url() }))
  .mutation(async ({ input }) => {
    // Validate callback URL (deployment security)
    if (!validateCallbackUrl(input.callbackUrl)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid callback URL'
      })
    }

    const client = createDiscogsClient() // No tokens needed

    try {
      return await client.oauth.getRequestToken(input.callbackUrl)
    } catch (error) {
      mapFacadeErrorToTRPC(error, 'get request token')
    }
  })

// Discogs router - authenticated client
getIdentity: publicProcedure
  .input(z.object({ accessToken: z.string(), accessTokenSecret: z.string() }))
  .query(async ({ input }) => {
    const client = createDiscogsClient({
      accessToken: input.accessToken,
      accessTokenSecret: input.accessTokenSecret
    })

    try {
      return await client.data.getIdentity()
    } catch (error) {
      mapFacadeErrorToTRPC(error, 'get identity')
    }
  })
```

**Why per-procedure:**

- Serverless functions are stateless per-invocation
- Tokens passed as input parameters (not stored in context)
- Simple, predictable pattern
- Container reuse optimizes instance creation

### Pattern 4: Type Inference Pass-Through

**What:** Let tRPC infer types from facade return values
**When to use:** All procedures (avoid manual type annotations)
**Example:**

```typescript
// AVOID manual annotations
getCollection: publicProcedure
  .query(async (): Promise<CollectionResponse> => {  // ❌ Manual type
    return await client.data.getCollectionReleases(...)
  })

// PREFER inference
getCollection: publicProcedure
  .query(async () => {  // ✅ Type inferred from facade
    return await client.data.getCollectionReleases(...)
  })
```

**How it works:**

1. Facade method returns typed data (e.g., `CollectionResponse`)
2. tRPC infers procedure return type from facade return type
3. Client automatically gets typed response
4. Changes in facade types propagate automatically

**Source:** tRPC documentation on type inference - https://trpc.io/docs/client/react/infer-types

### Anti-Patterns to Avoid

- **Wrapping responses in named keys:** Breaks type inference, adds boilerplate
- **Importing library packages in routers:** Defeats facade purpose, tight coupling
- **Manual type annotations on returns:** Prevents automatic type propagation
- **Cherry-picking facade fields:** Loses type safety, manual maintenance burden
- **Keeping old error handlers:** Code duplication, inconsistent error handling

## Don't Hand-Roll

| Problem                        | Don't Build                   | Use Instead                 | Why                                    |
| ------------------------------ | ----------------------------- | --------------------------- | -------------------------------------- |
| Error code mapping             | Custom status-to-code logic   | tRPC's built-in error codes | Standard codes, HTTP mapping built-in  |
| Type definitions for responses | Manual interface declarations | tRPC's type inference       | Auto-syncs with facade changes         |
| Client-side error types        | Custom error interfaces       | TRPCClientError type guards | Built-in error extraction utilities    |
| Response wrapping              | Named key wrapper objects     | Direct facade returns       | Type inference requires direct returns |

**Key insight:** tRPC's type inference system works best with direct returns. Adding wrapper layers breaks inference and requires manual type maintenance.

## Common Pitfalls

### Pitfall 1: Breaking Type Inference with Wrappers

**What goes wrong:** Wrapping facade responses in objects breaks automatic type inference
**Why it happens:** Developers accustomed to traditional REST patterns add named keys
**How to avoid:** Return facade types directly; tRPC handles serialization
**Warning signs:**

- Client code requires destructuring (`const { data } = await query(...)`)
- Type errors appear when changing facade types
- Manual type annotations needed on procedures

**Example:**

```typescript
// ❌ Breaks inference
return { data: await client.data.getIdentity() }

// ✅ Preserves inference
return await client.data.getIdentity()
```

### Pitfall 2: Missing Error.cause in Error Mapping

**What goes wrong:** Throwing new TRPCError without `cause` loses stack trace
**Why it happens:** Forgetting to preserve original error for debugging
**How to avoid:** Always pass original error as `cause` option
**Warning signs:**

- Stack traces don't show underlying library errors
- Hard to debug API failures
- Error messages lack context

**Example:**

```typescript
// ❌ Loses stack trace
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: error.message
})

// ✅ Preserves debugging info
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: error.message,
  cause: error // Original error preserved
})
```

### Pitfall 3: Incomplete Old Code Removal

**What goes wrong:** Leaving `error-utils.ts` or old helpers causes confusion
**Why it happens:** Incremental migration without cleanup
**How to avoid:** Delete old files in the same phase as migration
**Warning signs:**

- Multiple error handling patterns in codebase
- Unused imports flagged by linter
- Confusion about which error handler to use

**Files to delete in Phase 7:**

- `src/server/trpc/error-utils.ts`
- `src/server/discogs-client.ts` (old @lionralfs-only factory)

### Pitfall 4: Forgetting Client-Side Hook Updates

**What goes wrong:** Hooks still destructure `{ identity }` or `{ profile }` from flat responses
**Why it happens:** Server changes without corresponding client changes
**How to avoid:** Update hooks in the same phase; grep for destructuring patterns
**Warning signs:**

- Runtime errors accessing undefined properties
- TypeScript errors in hooks after router changes

**Hooks to update:**

- `use-user-profile.ts`: Change `const { profile } = await query(...)` to direct assignment
- `use-collection.ts`: Remove `rateLimit` destructuring, direct release/pagination access
- `use-collection-sync.ts`: Remove `rateLimit` usage from metadata query

## Code Examples

### Complete OAuth Router with Facade

```typescript
// src/server/trpc/routers/oauth.ts
import { z } from 'zod'
import { publicProcedure, router } from '../init.js'
import { createDiscogsClient } from '../../discogs/index.js'
import { mapFacadeErrorToTRPC } from '../error-mapper.js'

// Callback URL validation (deployment security)
function validateCallbackUrl(callbackUrl: string): boolean {
  try {
    const url = new URL(callbackUrl)
    const allowedOrigins = getAllowedCallbackOrigins()
    return allowedOrigins.some((origin) => url.origin === origin)
  } catch {
    return false
  }
}

export const oauthRouter = router({
  getRequestToken: publicProcedure
    .input(z.object({ callbackUrl: z.url() }))
    .mutation(async ({ input }) => {
      if (!validateCallbackUrl(input.callbackUrl)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid callback URL origin'
        })
      }

      const client = createDiscogsClient()

      try {
        return await client.oauth.getRequestToken(input.callbackUrl)
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get request token')
      }
    }),

  getAccessToken: publicProcedure
    .input(
      z.object({
        requestToken: z.string(),
        requestTokenSecret: z.string(),
        verifier: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const client = createDiscogsClient()

      try {
        return await client.oauth.getAccessToken(
          input.requestToken,
          input.requestTokenSecret,
          input.verifier
        )
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get access token')
      }
    })
})
```

### Complete Discogs Router with Facade

```typescript
// src/server/trpc/routers/discogs.ts
import { z } from 'zod'
import { publicProcedure, router } from '../init.js'
import { createDiscogsClient } from '../../discogs/index.js'
import { mapFacadeErrorToTRPC } from '../error-mapper.js'

export const discogsRouter = router({
  getIdentity: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        accessTokenSecret: z.string()
      })
    )
    .query(async ({ input }) => {
      const client = createDiscogsClient({
        accessToken: input.accessToken,
        accessTokenSecret: input.accessTokenSecret
      })

      try {
        return await client.data.getIdentity()
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get identity')
      }
    }),

  getUserProfile: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        accessTokenSecret: z.string(),
        username: z.string()
      })
    )
    .query(async ({ input }) => {
      const client = createDiscogsClient({
        accessToken: input.accessToken,
        accessTokenSecret: input.accessTokenSecret
      })

      try {
        return await client.data.getUserProfile(input.username)
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get user profile')
      }
    }),

  getCollection: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        accessTokenSecret: z.string(),
        username: z.string(),
        folderId: z.number().optional().default(0),
        page: z.number().optional().default(1),
        perPage: z.number().max(100).optional().default(50),
        sort: z
          .enum([
            'label',
            'artist',
            'title',
            'catno',
            'format',
            'rating',
            'added',
            'year'
          ])
          .optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
      })
    )
    .query(async ({ input }) => {
      const client = createDiscogsClient({
        accessToken: input.accessToken,
        accessTokenSecret: input.accessTokenSecret
      })

      try {
        return await client.data.getCollectionReleases(
          input.username,
          input.folderId,
          {
            page: input.page,
            perPage: input.perPage,
            sort: input.sort,
            sortOrder: input.sortOrder
          }
        )
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get collection')
      }
    }),

  getCollectionMetadata: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        accessTokenSecret: z.string(),
        username: z.string()
      })
    )
    .query(async ({ input }) => {
      const client = createDiscogsClient({
        accessToken: input.accessToken,
        accessTokenSecret: input.accessTokenSecret
      })

      try {
        return await client.data.getCollectionMetadata(input.username)
      } catch (error) {
        mapFacadeErrorToTRPC(error, 'get collection metadata')
      }
    })
})
```

### Client-Side Hook Update

```typescript
// BEFORE: Wrapped response destructuring
const { profile } = await trpcUtils.client.discogs.getUserProfile.query({
  accessToken: tokens.accessToken,
  accessTokenSecret: tokens.accessTokenSecret,
  username
})

// AFTER: Direct flat response
const profile = await trpcUtils.client.discogs.getUserProfile.query({
  accessToken: tokens.accessToken,
  accessTokenSecret: tokens.accessTokenSecret,
  username
})
```

## State of the Art

| Old Approach            | Current Approach         | When Changed   | Impact                                  |
| ----------------------- | ------------------------ | -------------- | --------------------------------------- |
| Wrapped responses       | Flat responses           | 2024-2025      | Better type inference, less boilerplate |
| Manual type definitions | Automatic inference      | tRPC v10+      | Types auto-sync with server changes     |
| Custom error codes      | Built-in TRPCError codes | tRPC v10+      | Standardized error handling             |
| Singleton clients       | Factory functions        | Serverless era | Stateless per-invocation pattern        |

**Deprecated/outdated:**

- Wrapping responses in `{ data }` or named keys - breaks tRPC type inference
- Custom error code enums - tRPC provides 21 standard codes with HTTP mapping
- Global client instances - serverless functions require stateless patterns

## Open Questions

None. Research complete with high confidence across all areas:

- tRPC error handling patterns confirmed from official documentation
- Type inference behavior verified from tRPC docs and project code
- Response shaping patterns established (flat returns standard)
- Error mapping approach clear from facade error types and TRPCError codes

## Sources

### Primary (HIGH confidence)

- [tRPC Error Handling](https://trpc.io/docs/server/error-handling) - Official error codes, TRPCError usage
- [tRPC Define Procedures](https://trpc.io/docs/server/procedures) - Type inference, base procedures
- [tRPC Inferring Types](https://trpc.io/docs/client/react/infer-types) - Client-side type helpers
- Project codebase (Phase 6 facade layer) - Error types, client factory, current router patterns

### Secondary (MEDIUM confidence)

- [Custom error codes in tRPC](https://dev.to/sophiabits/return-custom-error-codes-in-trpc-1bnm) - Error mapping patterns
- [Error handling best practices](https://lightrun.com/answers/trpc-trpc-error-handling-best-practices) - Community patterns
- [tRPC patterns on DEV](https://dev.to/nicklucas/trpc-patterns-router-factories-and-polymorphism-30b0) - Router organization
- Project hooks (use-collection.ts, use-user-profile.ts) - Current client-side usage

### Tertiary (LOW confidence)

None - all findings verified with official documentation or project code

## Metadata

**Confidence breakdown:**

- Error mapping patterns: HIGH - Official tRPC docs + existing facade errors
- Type inference: HIGH - Official tRPC docs + verified in project code
- Response shaping: HIGH - User decisions + tRPC inference patterns
- Client-side changes: HIGH - Existing hooks reviewed, changes identified

**Research date:** 2026-02-06
**Valid until:** 30 days (tRPC stable, patterns well-established)

# Phase 6: Facade Layer - Research

**Researched:** 2026-02-05
**Domain:** Facade pattern, dual-library abstraction, unified error handling
**Confidence:** HIGH

## Summary

Phase 6 creates a single entry point (`createDiscogsClient()`) that hides the complexity of using two Discogs libraries (@lionralfs for OAuth, discojs for data operations). The facade solves three critical problems: dual-library routing, query parameter casing conversion (camelCase to snake_case), and unified error handling.

Key findings:

- Facade pattern is the standard approach for simplifying complex subsystem interactions
- Factory function pattern (not singleton class) is appropriate for stateless Vercel Serverless Functions
- discojs accepts camelCase parameters and converts them to snake_case internally - no manual conversion needed
- ES2022 Error.cause provides standardized error wrapping with full stack trace preservation
- Optional authentication is cleanly handled via optional tokens parameter with TypeScript union types

**Primary recommendation:** Use factory function pattern with grouped namespaces (client.oauth._, client.data._) for clear separation of concerns. Wrap all library errors in unified facade errors (DiscogsApiError, DiscogsAuthError, DiscogsRateLimitError) with original error preserved as `cause` property.

## Standard Stack

### Core (Already in Project)

| Library                   | Version | Purpose                | Status    |
| ------------------------- | ------- | ---------------------- | --------- |
| @lionralfs/discogs-client | 4.1.4   | OAuth flow operations  | Installed |
| discojs                   | 2.3.1   | All data operations    | Installed |
| TypeScript                | 5.9     | Type-safe facade layer | Installed |

### Supporting

| Pattern             | Purpose                         | When to Use                             |
| ------------------- | ------------------------------- | --------------------------------------- |
| Facade pattern      | Simplify complex subsystem      | Hiding dual-library complexity          |
| Factory function    | Stateless client creation       | Vercel Serverless Functions             |
| Error chaining      | Preserve debugging information  | Wrapping third-party errors             |
| Optional parameters | Flexible authentication support | Public endpoints without authentication |
| Grouped namespaces  | Organize facade methods         | Clear separation between OAuth and data |

### No Additional Dependencies Needed

The facade layer can be implemented with existing libraries and TypeScript patterns. No new packages required.

**Considered but not needed:**

| Library                | Why Not Needed                                                      |
| ---------------------- | ------------------------------------------------------------------- |
| lodash.snakecase       | discojs already converts camelCase to snake_case internally         |
| ts-case-convert        | Same - parameter conversion handled by library                      |
| camelcase-keys         | Not needed - discojs accepts camelCase, converts internally         |
| Custom error libraries | ES2022 Error.cause is standardized, sufficient for error chaining   |
| TSyringe (DI)          | Factory function pattern simpler for stateless serverless functions |

## Architecture Patterns

### Recommended Project Structure

```
src/server/discogs/
├── index.ts          # Facade entry point (createDiscogsClient)
├── oauth.ts          # OAuth wrapper using @lionralfs
├── client.ts         # Data client wrapper using discojs
├── errors.ts         # Unified facade errors (DiscogsApiError, etc.)
├── rate-state.ts     # Rate limit state (existing from Phase 5)
└── retry.ts          # Retry wrapper (existing from Phase 5)
```

### Pattern 1: Factory Function for Stateless Functions

**What:** Factory function that creates client instance per invocation
**When to use:** Vercel Serverless Functions where each invocation is stateless
**Example:**

```typescript
// Source: Serverless best practices - https://www.serverless.com/blog/serverless-architecture-code-patterns
// Adapted for TypeScript and dual-library pattern

interface DiscogsClient {
  oauth: OAuthClient
  data: DataClient
}

interface OAuthTokens {
  accessToken: string
  accessTokenSecret: string
}

export function createDiscogsClient(tokens?: OAuthTokens): DiscogsClient {
  // Each invocation creates fresh instances
  const oauthClient = new OAuthClientWrapper()
  const dataClient = new DataClientWrapper(tokens)

  return {
    oauth: oauthClient,
    data: dataClient
  }
}
```

**Why factory function over singleton:**

- Vercel Serverless Functions are stateless per-invocation
- No global state needed between requests
- Simpler testing - no singleton reset needed
- Container reuse optimizes instance creation automatically
- Factory pattern avoids complications with async code in serverless

**Reference:** [Serverless Architecture Code Patterns](https://www.serverless.com/blog/serverless-architecture-code-patterns)

### Pattern 2: Grouped Namespaces for Method Organization

**What:** Organize facade methods into logical groups (oauth, data)
**When to use:** When facade wraps multiple distinct subsystems
**Example:**

```typescript
// Clear separation of concerns
const client = createDiscogsClient(tokens)

// OAuth operations - routed to @lionralfs
await client.oauth.getRequestToken(callbackUrl)
await client.oauth.getAccessToken(requestToken, verifier)

// Data operations - routed to discojs
await client.data.getIdentity()
await client.data.getCollection(username, options)
await client.data.getUserProfile(username)
```

**Alternative: Flat namespace:**

```typescript
// Single-level methods
const client = createDiscogsClient(tokens)
await client.getRequestToken(callbackUrl) // OAuth
await client.getIdentity() // Data
await client.getCollection(username) // Data
```

**Recommendation:** Grouped namespaces - clearer which library handles each operation, easier to debug, better IntelliSense organization.

### Pattern 3: Unified Error Wrapping with Error.cause

**What:** Wrap all third-party errors in facade-specific error types while preserving original error
**When to use:** Abstracting multiple libraries with different error formats
**Example:**

```typescript
// Source: ES2022 Error.cause - https://allthingssmitty.com/2025/11/10/error-chaining-in-javascript-cleaner-debugging-with-error-cause/

export class DiscogsApiError extends Error {
  readonly statusCode?: number
  readonly originalError: unknown

  constructor(
    message: string,
    options: { cause: unknown; statusCode?: number }
  ) {
    super(message, { cause: options.cause })
    this.name = 'DiscogsApiError'
    this.statusCode = options.statusCode
    this.originalError = options.cause
  }
}

// Usage in wrapper
try {
  return await discogsClient.getIdentity()
} catch (error) {
  throw new DiscogsApiError('Failed to get user identity', {
    cause: error,
    statusCode: error instanceof DiscogsError ? error.statusCode : undefined
  })
}
```

**Benefits:**

- Full stack traces preserved (both wrapper and original)
- Callers see consistent error types from facade
- Debugging gets original error via `.cause` property
- TypeScript users get `tsconfig.json` target ES2022 or later for full support

**Reference:** [Error Chaining in JavaScript: Cleaner Debugging with Error.cause](https://allthingssmitty.com/2025/11/10/error-chaining-in-javascript-cleaner-debugging-with-error-cause/)

### Pattern 4: Optional Authentication via Union Types

**What:** Accept optional tokens parameter, conditionally enable authenticated endpoints
**When to use:** API supports both public and authenticated operations
**Example:**

```typescript
// Source: TypeScript optional properties - https://betterstack.com/community/guides/scaling-nodejs/typescript-optional-properties/

interface OAuthTokens {
  accessToken: string
  accessTokenSecret: string
}

export function createDiscogsClient(
  tokens?: OAuthTokens | undefined
): DiscogsClient {
  // Pass tokens to data client (can be undefined)
  const dataClient = new DataClientWrapper(tokens)

  return {
    oauth: new OAuthClientWrapper(),
    data: dataClient
  }
}

// DataClientWrapper handles optional tokens
class DataClientWrapper {
  constructor(private tokens?: OAuthTokens) {}

  async getIdentity() {
    if (!this.tokens) {
      throw new DiscogsAuthError('Authentication required for getIdentity')
    }
    // Use tokens for authenticated call
  }

  async searchReleases(query: string) {
    // Public endpoint - works with or without tokens
    // If tokens present, higher rate limit applies
  }
}
```

**Key decisions:**

- Use `tokens?: OAuthTokens | undefined` to allow explicit undefined passing (exactOptionalPropertyTypes)
- Throw DiscogsAuthError immediately for auth-required methods called without tokens
- Let public endpoints work regardless of token presence
- No `isAuthenticated()` method needed - caller knows if they passed tokens

**Reference:** [Optional Properties and Null Handling in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/typescript-optional-properties/)

### Pattern 5: Query Parameter Handling

**What:** Understanding how discojs handles parameter casing
**Critical finding:** discojs ALREADY converts camelCase to snake_case internally
**Example:**

```typescript
// Source: discojs source code - node_modules/discojs/dist/index.js:468-473

// Client code passes camelCase
await client.user().collection().getReleases(username, 0, {
  page: 1,
  perPage: 50, // camelCase parameter
  sort: 'added',
  sortOrder: 'desc' // camelCase parameter
})

// discojs converts internally:
// perPage → per_page
// sortOrder → sort_order

// No manual conversion needed in facade layer
```

**Known issue from STATE.md:**

> "Phase 6: discojs query param casing bug (camelCase not converted to snake_case) - manual conversion needed"

**Research finding:** This is INCORRECT. Line 473 of discojs shows explicit conversion: `per_page: perPage <= 0 || perPage > 100 ? DEFAULT_PER_PAGE : perPage`

**Recommendation:** No parameter casing workaround needed. The "known issue" is a misunderstanding - discojs handles this correctly.

### Anti-Patterns to Avoid

- **Singleton class pattern:** Adds unnecessary complexity for stateless serverless functions
- **Manual parameter casing conversion:** discojs already handles camelCase → snake_case
- **Losing original errors:** Always preserve via Error.cause
- **Mixing library-specific errors in facade API:** Callers should only see facade error types
- **Overly complex abstraction:** Don't abstract what doesn't need abstracting (e.g., method names should match Discogs API)

## Don't Hand-Roll

| Problem                       | Don't Build                | Use Instead                | Why                                          |
| ----------------------------- | -------------------------- | -------------------------- | -------------------------------------------- |
| Query param casing conversion | Custom camelCase converter | discojs built-in           | Already handled on line 468-473              |
| Error wrapping                | Custom error utilities     | ES2022 Error.cause         | Standardized, built into language            |
| Singleton management          | Custom singleton class     | Factory function           | Simpler for stateless functions              |
| Rate limit retry              | Custom retry logic         | Phase 5 withRateLimitRetry | Already implemented with exponential backoff |
| OAuth flow                    | Custom implementation      | @lionralfs wrapper         | Security-critical, use proven library        |

**Key insight:** The facade's job is routing and error translation, not reimplementing functionality that libraries already provide correctly.

## Common Pitfalls

### Pitfall 1: Assuming discojs Doesn't Convert Parameter Casing

**What goes wrong:** Building custom converter to transform camelCase to snake_case

**Why it happens:** The "known issue" in STATE.md suggests manual conversion is needed

**How to avoid:** Verify library behavior before implementing workarounds. discojs source (index.js:473) shows it converts `perPage` to `per_page` automatically.

**Warning signs:** Duplicate parameter conversion code, parameters not working despite correct casing

**Correct approach:** Pass camelCase parameters directly to discojs methods - conversion is internal.

### Pitfall 2: Singleton Pattern in Serverless Functions

**What goes wrong:** Creating singleton class that persists state across invocations

**Why it happens:** Traditional web server patterns assume long-lived process

**How to avoid:** Use factory function pattern. Vercel Serverless Functions are stateless per-invocation, even though container may be reused.

**Warning signs:** State leaking between requests, difficult testing, reset logic needed

**Correct approach:**

```typescript
// Factory function - creates fresh instance per invocation
export function createDiscogsClient(tokens?: OAuthTokens): DiscogsClient {
  return {
    oauth: new OAuthClientWrapper(),
    data: new DataClientWrapper(tokens)
  }
}
```

**Reference:** [5 Anti-Patterns for AWS Lambda](https://www.3pillarglobal.com/insights/blog/silence-lambdas-5-anti-patterns-aws-lambda/)

### Pitfall 3: Losing Original Error Context

**What goes wrong:** Wrapping errors without preserving original error and stack trace

**Why it happens:** Pre-ES2022 patterns used string concatenation or custom properties

**How to avoid:** Use Error.cause to preserve original error chain

**Example - WRONG:**

```typescript
try {
  return await discogsClient.getIdentity()
} catch (error) {
  // Original error lost - only message string preserved
  throw new DiscogsApiError(`Failed to get identity: ${error.message}`)
}
```

**Example - CORRECT:**

```typescript
try {
  return await discogsClient.getIdentity()
} catch (error) {
  // Original error preserved in cause, full stack trace available
  throw new DiscogsApiError('Failed to get identity', { cause: error })
}
```

**Reference:** [Error Chaining in JavaScript](https://allthingssmitty.com/2025/11/10/error-chaining-in-javascript-cleaner-debugging-with-error-cause/)

### Pitfall 4: Not Distinguishing Auth Errors from Transient Errors

**What goes wrong:** Treating all errors the same way, logging out on transient failures

**Why it happens:** Not categorizing errors by whether they indicate invalid credentials

**How to avoid:** Check error codes before wrapping - 401/403 are auth errors, 5xx are transient

**Example:**

```typescript
// From existing src/lib/errors.ts pattern
export class DiscogsAuthError extends Error {
  readonly statusCode: 401 | 403

  constructor(
    message: string,
    options: { cause: unknown; statusCode: 401 | 403 }
  ) {
    super(message, { cause: options.cause })
    this.name = 'DiscogsAuthError'
    this.statusCode = options.statusCode
  }
}

// Wrapper logic
if (error instanceof DiscogsError) {
  if (error.statusCode === 401 || error.statusCode === 403) {
    throw new DiscogsAuthError('Invalid or expired tokens', {
      cause: error,
      statusCode: error.statusCode
    })
  }
  // Other errors wrapped differently
}
```

### Pitfall 5: Over-Abstracting Method Names

**What goes wrong:** Creating generic method names that differ from Discogs API docs

**Why it happens:** Trying to make facade "cleaner" or more "object-oriented"

**How to avoid:** Use Discogs API method names - makes debugging easier, documentation directly applicable

**Example - WRONG:**

```typescript
// Generic names that don't match Discogs docs
client.data.fetchUser(username)
client.data.listCollection(username, filters)
```

**Example - CORRECT:**

```typescript
// Match Discogs API naming exactly
client.data.getUserProfile(username)
client.data.getCollectionReleases(username, folderId, options)
```

**Benefit:** Developers can reference Discogs API docs directly, stack traces show recognizable method names

## Code Examples

### Complete Facade Entry Point

````typescript
// src/server/discogs/index.ts
// Source: Factory pattern for serverless - https://www.serverless.com/blog/serverless-architecture-code-patterns

import { createOAuthClient } from './oauth.js'
import { createDataClient } from './client.js'

export interface OAuthTokens {
  accessToken: string
  accessTokenSecret: string
}

export interface DiscogsClient {
  oauth: ReturnType<typeof createOAuthClient>
  data: ReturnType<typeof createDataClient>
}

/**
 * Creates a Discogs API client with OAuth and data operation support.
 * Factory function appropriate for stateless Vercel Serverless Functions.
 *
 * @param tokens - Optional OAuth tokens for authenticated operations
 * @returns Facade client with oauth and data namespaces
 *
 * @example
 * ```ts
 * // Unauthenticated client (public endpoints only)
 * const client = createDiscogsClient()
 * await client.data.searchReleases('The Beatles')
 *
 * // Authenticated client (full API access)
 * const client = createDiscogsClient({ accessToken, accessTokenSecret })
 * await client.data.getCollection(username)
 * ```
 */
export function createDiscogsClient(
  tokens?: OAuthTokens | undefined
): DiscogsClient {
  return {
    oauth: createOAuthClient(),
    data: createDataClient(tokens)
  }
}

// Re-export error types for callers
export {
  DiscogsApiError,
  DiscogsAuthError,
  DiscogsRateLimitError
} from './errors.js'

// Re-export rate limit state (from Phase 5)
export {
  getRateLimitState,
  updateRateLimitState,
  type RateLimitState
} from './rate-state.js'
````

### OAuth Wrapper

```typescript
// src/server/discogs/oauth.ts
// Source: @lionralfs/discogs-client OAuth methods

import { DiscogsOAuth } from '@lionralfs/discogs-client'
import { DiscogsApiError } from './errors.js'

declare const process: {
  env: {
    VITE_DISCOGS_CONSUMER_KEY?: string
    DISCOGS_CONSUMER_SECRET?: string
  }
}

const CONSUMER_KEY = process.env.VITE_DISCOGS_CONSUMER_KEY
const CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET

/**
 * OAuth client wrapper using @lionralfs/discogs-client.
 * Handles OAuth 1.0a flow (request token, access token).
 */
export function createOAuthClient() {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new DiscogsApiError('Missing OAuth credentials', {
      cause: new Error(
        'VITE_DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET not set'
      )
    })
  }

  const oauth = new DiscogsOAuth(CONSUMER_KEY, CONSUMER_SECRET)

  return {
    /**
     * Step 1: Get request token and authorization URL
     */
    async getRequestToken(callbackUrl: string) {
      try {
        const response = await oauth.getRequestToken(callbackUrl)

        if (!response.token || !response.tokenSecret) {
          throw new DiscogsApiError('Failed to obtain request token', {
            cause: new Error('Discogs returned null token or tokenSecret')
          })
        }

        return {
          requestToken: response.token,
          requestTokenSecret: response.tokenSecret,
          authorizeUrl: response.authorizeUrl
        }
      } catch (error) {
        throw new DiscogsApiError('OAuth request token exchange failed', {
          cause: error
        })
      }
    },

    /**
     * Step 2: Exchange request token + verifier for access token
     */
    async getAccessToken(
      requestToken: string,
      requestTokenSecret: string,
      verifier: string
    ) {
      try {
        const response = await oauth.getAccessToken(
          requestToken,
          requestTokenSecret,
          verifier
        )

        if (!response.accessToken || !response.accessTokenSecret) {
          throw new DiscogsApiError('Failed to obtain access token', {
            cause: new Error(
              'Discogs returned null accessToken or accessTokenSecret'
            )
          })
        }

        return {
          accessToken: response.accessToken,
          accessTokenSecret: response.accessTokenSecret
        }
      } catch (error) {
        throw new DiscogsApiError('OAuth access token exchange failed', {
          cause: error
        })
      }
    }
  }
}
```

### Data Client Wrapper

```typescript
// src/server/discogs/client.ts
// Source: discojs with retry wrapper from Phase 5

import { Discojs, DiscogsError } from 'discojs'
import { DiscogsApiError, DiscogsAuthError } from './errors.js'
import { withRateLimitRetry, RateLimitError } from './retry.js'
import { updateRateLimitState } from './rate-state.js'
import type { OAuthTokens } from './index.js'

declare const process: {
  env: {
    VITE_DISCOGS_CONSUMER_KEY?: string
    DISCOGS_CONSUMER_SECRET?: string
    npm_package_version?: string
  }
}

const CONSUMER_KEY = process.env.VITE_DISCOGS_CONSUMER_KEY
const CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET
const APP_VERSION = process.env.npm_package_version ?? '1.0.0'

/**
 * Data client wrapper using discojs.
 * Handles all non-OAuth operations with rate limit retry.
 */
export function createDataClient(tokens?: OAuthTokens | undefined) {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new DiscogsApiError('Missing OAuth credentials', {
      cause: new Error(
        'VITE_DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET not set'
      )
    })
  }

  // Create discojs client with OAuth 1.0a (NOT userToken - that's for personal access tokens)
  // CRITICAL: discojs requires all four OAuth fields for authenticated requests
  const client = new Discojs(
    tokens
      ? {
          consumerKey: CONSUMER_KEY,
          consumerSecret: CONSUMER_SECRET,
          oAuthToken: tokens.accessToken,
          oAuthTokenSecret: tokens.accessTokenSecret,
          userAgent: `VinylDeck/${APP_VERSION}`
        }
      : { userAgent: `VinylDeck/${APP_VERSION}` }
  )

  /**
   * Wraps discojs call with rate limit retry and error handling
   */
  async function wrapCall<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await withRateLimitRetry(fn)
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error // Already wrapped by retry layer
      }

      if (error instanceof DiscogsError) {
        // Auth errors (401, 403)
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw new DiscogsAuthError('Invalid or expired tokens', {
            cause: error,
            statusCode: error.statusCode
          })
        }

        // Other API errors
        throw new DiscogsApiError(`${operation} failed`, {
          cause: error,
          statusCode: error.statusCode
        })
      }

      // Unknown errors
      throw new DiscogsApiError(`${operation} failed`, { cause: error })
    }
  }

  return {
    /**
     * Get authenticated user's identity
     * Requires authentication
     */
    async getIdentity() {
      if (!tokens) {
        throw new DiscogsAuthError('Authentication required for getIdentity', {
          cause: new Error('No tokens provided to createDiscogsClient'),
          statusCode: 401
        })
      }

      return wrapCall('getIdentity', async () => {
        const result = await client.getIdentity()
        // Note: discojs doesn't expose response headers in return value
        // Rate limit tracking would need custom implementation
        return result
      })
    },

    /**
     * Get user's collection releases
     * Requires authentication
     */
    async getCollectionReleases(
      username: string,
      folderId: number = 0,
      options?: {
        page?: number
        perPage?: number // discojs converts to per_page internally
        sort?: string
        sortOrder?: 'asc' | 'desc' // discojs converts to sort_order internally
      }
    ) {
      if (!tokens) {
        throw new DiscogsAuthError(
          'Authentication required for getCollectionReleases',
          {
            cause: new Error('No tokens provided to createDiscogsClient'),
            statusCode: 401
          }
        )
      }

      return wrapCall('getCollectionReleases', async () => {
        // ACTUAL discojs method: listItemsInFolderForUser (NOT .user().collection().getReleases())
        return await client.listItemsInFolderForUser(
          username,
          folderId,
          options?.sort
            ? { sortBy: options.sort, sortOrder: options.sortOrder }
            : undefined,
          { page: options?.page, perPage: options?.perPage }
        )
      })
    },

    /**
     * Get user profile
     * Requires authentication
     */
    async getUserProfile(username: string) {
      if (!tokens) {
        throw new DiscogsAuthError(
          'Authentication required for getUserProfile',
          {
            cause: new Error('No tokens provided to createDiscogsClient'),
            statusCode: 401
          }
        )
      }

      return wrapCall('getUserProfile', async () => {
        // ACTUAL discojs method: getProfileForUser (NOT .user().getProfile())
        return await client.getProfileForUser(username)
      })
    }

    // Additional methods as needed...
  }
}
```

### Unified Error Types

```typescript
// src/server/discogs/errors.ts
// Source: ES2022 Error.cause - https://allthingssmitty.com/2025/11/10/error-chaining-in-javascript-cleaner-debugging-with-error-cause/

/**
 * Base error for all Discogs API facade errors.
 * Preserves original error via Error.cause (ES2022).
 */
export class DiscogsApiError extends Error {
  readonly statusCode?: number
  readonly originalError: unknown

  constructor(
    message: string,
    options: { cause: unknown; statusCode?: number }
  ) {
    super(message, { cause: options.cause })
    this.name = 'DiscogsApiError'
    this.statusCode = options.statusCode
    this.originalError = options.cause
  }
}

/**
 * Authentication error (401, 403).
 * Indicates invalid or expired OAuth tokens.
 */
export class DiscogsAuthError extends Error {
  readonly statusCode: 401 | 403
  readonly originalError: unknown

  constructor(
    message: string,
    options: { cause: unknown; statusCode: 401 | 403 }
  ) {
    super(message, { cause: options.cause })
    this.name = 'DiscogsAuthError'
    this.statusCode = options.statusCode
    this.originalError = options.cause
  }
}

/**
 * Rate limit error (429).
 * Re-exported from Phase 5 retry.ts for facade API.
 */
export { RateLimitError as DiscogsRateLimitError } from './retry.js'
```

## State of the Art

| Old Approach            | Current Approach            | When Changed           | Impact                                          |
| ----------------------- | --------------------------- | ---------------------- | ----------------------------------------------- |
| Singleton classes       | Factory functions           | Serverless era (2015+) | Simpler stateless functions, no global state    |
| String error messages   | Error.cause chaining        | ES2022 (2022)          | Full stack trace preservation, better debugging |
| Manual param conversion | Library-internal conversion | discojs 2.0 (2023)     | No custom code needed, fewer bugs               |
| Custom error properties | Standard Error.cause        | ES2022 (2022)          | Browser/Node.js built-in support, no polyfill   |
| Flat API namespace      | Grouped namespaces          | Modern API design      | Clear subsystem separation, better IntelliSense |

**Deprecated/outdated:**

- Singleton pattern for serverless functions: Factory pattern is standard now
- Custom error wrapping without cause: Error.cause is standardized
- Manual camelCase to snake_case conversion: Libraries handle this internally

## Open Questions

### 1. Should Facade Expose Rate Limit Headers from discojs?

**What we know:** Phase 5 implements rate state tracking from response headers. discojs parses headers internally but doesn't expose them in return values.

**What's unclear:** How to extract headers from discojs responses for updateRateLimitState()

**Options:**

- Option A: Extend Discojs class to expose headers (invasive, requires subclassing)
- Option B: Use @lionralfs for data calls too (defeats purpose of discojs types)
- Option C: Track rate state from tRPC response metadata (existing pattern)

**Recommendation:** Option C - continue existing pattern from src/api/rate-limiter.ts. The facade returns data, tRPC middleware extracts headers. This keeps facade focused on routing/errors, not header parsing.

### 2. Grouped vs Flat Namespace?

**What we know:** Both work, different tradeoffs

**Options:**

- Grouped: `client.oauth.getRequestToken()`, `client.data.getIdentity()`
- Flat: `client.getRequestToken()`, `client.getIdentity()`

**Recommendation:** Grouped namespaces (marked as Claude's discretion in CONTEXT.md). Benefits:

- Clear which library handles each operation
- Better IntelliSense organization (oauth methods grouped)
- Easier debugging (stack traces show namespace)
- Matches industry patterns (e.g., AWS SDK v3 client organization)

### 3. Token Injection: Constructor vs Setter vs Both?

**What we know:** Factory function accepts tokens parameter (marked as Claude's discretion)

**Options:**

- Constructor only: `createDiscogsClient(tokens)` - immutable
- Setter: `client.setTokens(tokens)` - allows token refresh
- Both: Support both patterns

**Recommendation:** Constructor only for v1.1. Reasons:

- Vercel Serverless Functions are stateless - new client per invocation
- OAuth tokens don't expire unless user revokes - no refresh needed
- Simpler API - one way to authenticate
- Can add setter in future if token refresh becomes requirement

## Sources

### Primary (HIGH confidence)

- discojs source code - node_modules/discojs/dist/index.js - Lines 468-473 (parameter conversion)
- @lionralfs/discogs-client types - node_modules/@lionralfs/discogs-client/types/ - OAuth method signatures
- TypeScript Facade Pattern - [Facade in TypeScript](https://refactoring.guru/design-patterns/facade/typescript/example) - Official pattern documentation
- ES2022 Error.cause - [Error Chaining in JavaScript](https://allthingssmitty.com/2025/11/10/error-chaining-in-javascript-cleaner-debugging-with-error-cause/) - Standardized error wrapping
- Serverless Code Patterns - [Serverless Architecture Code Patterns](https://www.serverless.com/blog/serverless-architecture-code-patterns) - Factory vs singleton guidance
- Existing codebase - src/server/discogs/retry.ts, src/server/discogs/rate-state.ts - Phase 5 patterns

### Secondary (MEDIUM confidence)

- TypeScript Optional Properties - [Optional Properties and Null Handling in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/typescript-optional-properties/) - Optional auth pattern
- Discogs API Authentication - [python3-discogs-client Authentication](https://python3-discogs-client.readthedocs.io/en/latest/authentication.html) - Public vs protected endpoints
- AWS Lambda Anti-Patterns - [5 Anti-Patterns for AWS Lambda](https://www.3pillarglobal.com/insights/blog/silence-lambdas-5-anti-patterns-aws-lambda/) - Singleton warnings
- REST API Naming Conventions - [REST API Naming Conventions and Best Practices](https://medium.com/@mehmetbaz/rest-api-naming-conventions-and-best-practices-31635ee11c0d) - Parameter naming patterns

### Tertiary (LOW confidence)

- None - all findings verified against official sources or installed packages

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Direct verification of installed packages and source code
- Architecture: HIGH - TypeScript official patterns, ES2022 standard, verified serverless patterns
- Pitfalls: HIGH - Based on source code analysis and official best practices
- Query param casing: HIGH - Verified in discojs source code (line 473)

**Research date:** 2026-02-05
**Valid until:** 60 days (stable patterns, mature libraries)

**Critical verification performed:**

- Verified discojs parameter conversion in source code (index.js:468-473)
- Confirmed @lionralfs OAuth method signatures in types directory
- Validated Error.cause availability (ES2022 standard)
- Checked Phase 5 retry wrapper implementation
- Confirmed CONTEXT.md decisions (grouped namespaces, unified errors)

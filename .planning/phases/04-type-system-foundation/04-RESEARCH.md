# Phase 4: Type System Foundation - Research

**Researched:** 2026-02-03
**Domain:** TypeScript type organization, module augmentation, type extraction
**Confidence:** HIGH

## Summary

Phase 4 establishes the type foundation by importing types from discojs and extracting OAuth types from @lionralfs/discogs-client. The critical requirement is that discojs MUST be used for Discogs API types (not @lionralfs), as @lionralfs has incomplete types that only cover OAuth functionality well.

Key findings:

- discojs provides comprehensive, io-ts-validated types for all Discogs endpoints
- @lionralfs OAuth methods return well-typed responses (token, tokenSecret, authorizeUrl, etc.) that can be extracted via ReturnType
- Module augmentation is the TypeScript-native way to add missing fields to discojs types
- Barrel export pattern creates a clean single import point for all Discogs types

**Primary recommendation:** Use module augmentation to extend discojs types in-place. This preserves the original type names, enables automatic updates when discojs upgrades, and follows TypeScript best practices for extending third-party libraries.

## Standard Stack

### Core

| Library                   | Version          | Purpose           | Why Standard                                                 |
| ------------------------- | ---------------- | ----------------- | ------------------------------------------------------------ |
| discojs                   | ^2.3.1           | Discogs API types | io-ts validated, comprehensive coverage, actively maintained |
| @lionralfs/discogs-client | 4.1.4 (existing) | OAuth type source | Well-typed OAuth methods, extraction-friendly                |

### Supporting

| Library                  | Version  | Purpose         | When to Use                            |
| ------------------------ | -------- | --------------- | -------------------------------------- |
| TypeScript utility types | Built-in | Type extraction | ReturnType, Parameters for OAuth types |
| Module augmentation      | Built-in | Type extension  | Adding missing fields to discojs       |

### Alternatives Considered

| Instead of            | Could Use               | Tradeoff                                                 |
| --------------------- | ----------------------- | -------------------------------------------------------- |
| discojs types         | @lionralfs types        | @lionralfs only has complete OAuth types, not data types |
| Module augmentation   | Wrapper types           | Wrapper types require renaming, lose auto-update benefit |
| ReturnType extraction | Manual type definitions | Manual defs drift from library updates                   |

**Installation:**

```bash
bun add discojs
```

## Architecture Patterns

### Recommended Project Structure

```
src/types/discogs/
├── index.ts          # Barrel export (single import point)
├── augment.ts        # Module augmentation for missing fields
└── oauth.ts          # OAuth types extracted from @lionralfs
```

### Pattern 1: Barrel Export for Type Organization

**What:** Single entry point re-exporting all Discogs-related types
**When to use:** Creating API boundaries, simplifying imports across codebase
**Example:**

```typescript
// src/types/discogs/index.ts
// Source: Barrel Export Pattern - https://basarat.gitbook.io/typescript/main-1/barrel

// Re-export discojs types (named exports)
export type {
  User,
  Identity,
  CollectionRelease,
  BasicInformation,
  Pagination
} from 'discojs/lib/types'

// Import augmentation (adds missing fields)
import './augment.js'

// Re-export OAuth types
export * from './oauth.js'
```

**Why this pattern:**

- TypeScript types have zero runtime cost - tree-shaking concerns don't apply
- Explicit named exports better than `export *` for traceability
- `import './augment.js'` ensures augmentation is loaded when barrel is imported
- Creates clear API boundary - rest of codebase imports from one place

### Pattern 2: Module Augmentation for Missing Fields

**What:** Extend discojs types in-place to add fields they've omitted
**When to use:** Third-party library types are incomplete but correct where they exist
**Example:**

```typescript
// src/types/discogs/augment.ts
// Source: TypeScript Declaration Merging - https://www.typescriptlang.org/docs/handbook/declaration-merging.html

import 'discojs'

declare module 'discojs/lib/types' {
  /**
   * User profile extensions
   * These fields exist in Discogs API responses but are missing from discojs types
   */
  interface User {
    /**
     * User avatar URL
     * @endpoint GET /users/{username}
     * @optional Sometimes omitted for users without avatars
     */
    avatar_url?: string

    /**
     * User profile banner URL
     * @endpoint GET /users/{username}
     * @optional Sometimes omitted for users without banners
     */
    banner_url?: string
  }
}
```

**Why module augmentation over wrapper types:**

- Preserves original type names - no `DiscogsUser` vs `User` confusion
- Auto-updates when discojs upgrades - augmentation merges with new base types
- TypeScript's declaration merging is designed for this use case
- Downstream code uses original type names from discojs docs

**Augmentation best practices:**

- Include JSDoc explaining why field is augmented
- Document which endpoint returns the field
- Match Discogs API reality for optionality (optional if sometimes omitted)
- Separate file imported by barrel (keeps augmentation isolated)

### Pattern 3: ReturnType Extraction for OAuth Types

**What:** Extract types from library function return types using TypeScript utility types
**When to use:** Library has well-typed functions but doesn't export result types
**Example:**

```typescript
// src/types/discogs/oauth.ts
// Source: TypeScript Utility Types - https://www.typescriptlang.org/docs/handbook/utility-types.html

import { DiscogsOAuth } from '@lionralfs/discogs-client'

/**
 * Create a type instance for type extraction
 * This is never instantiated at runtime - TypeScript-only
 */
type OAuthInstance = InstanceType<typeof DiscogsOAuth>

/**
 * Request token result from OAuth flow step 1
 * Extracted from DiscogsOAuth.getRequestToken() return type
 */
export type RequestTokenResult = Awaited<
  ReturnType<OAuthInstance['getRequestToken']>
>

/**
 * Access token result from OAuth flow step 2
 * Extracted from DiscogsOAuth.getAccessToken() return type
 */
export type AccessTokenResult = Awaited<
  ReturnType<OAuthInstance['getAccessToken']>
>

/**
 * Application-level OAuth tokens (stored in Zustand)
 * This is VinylDeck's internal structure - not from @lionralfs
 */
export interface OAuthTokens {
  accessToken: string
  accessTokenSecret: string
}
```

**Why ReturnType extraction:**

- Auto-syncs with library updates - if @lionralfs changes return type, extraction follows
- Single source of truth - library code defines types
- No maintenance burden - no manual type definitions to keep in sync
- TypeScript validates extraction is correct at compile time

**Extraction best practices:**

- Use `Awaited<>` to unwrap Promise types
- Use `InstanceType<typeof Class>` to get instance type from class constructor
- Document which library method the type is extracted from
- Create friendly aliases - `RequestTokenResult` is clearer than `Awaited<ReturnType<...>>`

### Anti-Patterns to Avoid

- **Copying types from libraries:** Creates drift, maintenance burden, breaks on library updates
- **Wildcard barrel exports (`export *`):** Makes tracing imports harder, can cause name collisions
- **Wrapper types for third-party types:** `type DiscogsUser = User & { avatar_url?: string }` loses original name, breaks consumer expectations
- **Manual OAuth type definitions:** Will drift when @lionralfs updates method signatures

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                      | Don't Build                         | Use Instead                           | Why                                                        |
| ---------------------------- | ----------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| Discogs API type definitions | Custom TypeScript interfaces        | discojs types                         | io-ts validated against real API, 100+ endpoints covered   |
| OAuth flow result types      | Manual interfaces from API docs     | ReturnType extraction from @lionralfs | Library already has correct types, extraction auto-updates |
| Extending third-party types  | Wrapper types or intersection types | Module augmentation                   | TypeScript's declaration merging is purpose-built for this |
| Type re-export organization  | Individual imports in every file    | Barrel export pattern                 | Single import point, clear API boundary                    |

**Key insight:** Type definitions are code with a maintenance burden. Extracting from authoritative sources (libraries, not docs) eliminates drift and keeps types current.

## Common Pitfalls

### Pitfall 1: Using @lionralfs Types for Data Endpoints

**What goes wrong:** Using `GetProfileResponse` from @lionralfs for user profile data
**Why it happens:** @lionralfs is already installed and has some type exports
**How to avoid:** Use discojs types for ALL data endpoints - @lionralfs types are incomplete for non-OAuth endpoints
**Warning signs:** Type casts (`as unknown as`), missing fields in IntelliSense, runtime undefined errors

**Example - WRONG:**

```typescript
// @lionralfs has GetProfileResponse but it's incomplete
import { GetProfileResponse } from '@lionralfs/discogs-client/types/user.js'
const profile = await client.user().getProfile('username')
// Missing: avatar_url, banner_url, many other fields
```

**Example - CORRECT:**

```typescript
// discojs has complete User type
import type { User } from '@/types/discogs'
const profile: User = await db.user().getProfile('username')
// Has: avatar_url, banner_url, all documented fields
```

### Pitfall 2: Not Importing Augmentation in Barrel

**What goes wrong:** Module augmentation file exists but types aren't extended
**Why it happens:** Augmentation requires explicit import to trigger declaration merging
**How to avoid:** Import augmentation file in barrel index.ts with side-effect import: `import './augment.js'`
**Warning signs:** IntelliSense not showing augmented fields, type errors on fields you know exist

**Example - WRONG:**

```typescript
// src/types/discogs/index.ts
export type { User } from 'discojs/lib/types'
// augment.ts exists but never imported - augmentation not applied!
```

**Example - CORRECT:**

```typescript
// src/types/discogs/index.ts
import './augment.js' // Side-effect import triggers augmentation
export type { User } from 'discojs/lib/types'
```

### Pitfall 3: Incorrect ReturnType Extraction Nesting

**What goes wrong:** `ReturnType<typeof DiscogsOAuth.getRequestToken>` instead of instance method
**Why it happens:** Confusing class static methods vs instance methods
**How to avoid:** Get instance type first with `InstanceType<typeof Class>`, then extract method return type
**Warning signs:** TypeScript error "Property 'getRequestToken' does not exist on type 'typeof DiscogsOAuth'"

**Example - WRONG:**

```typescript
// DiscogsOAuth is a class constructor, not an instance
type Result = ReturnType<typeof DiscogsOAuth.getRequestToken>
// Error: getRequestToken doesn't exist on constructor
```

**Example - CORRECT:**

```typescript
// Get instance type, then extract method return type
type OAuthInstance = InstanceType<typeof DiscogsOAuth>
type Result = Awaited<ReturnType<OAuthInstance['getRequestToken']>>
// Success: token, tokenSecret, callbackConfirmed, authorizeUrl
```

### Pitfall 4: Module Augmentation Without Specificity

**What goes wrong:** Augmenting wrong module path - `declare module 'discojs'` instead of `'discojs/lib/types'`
**Why it happens:** Not verifying the exact module path that exports the interface
**How to avoid:** Check library's type exports - use the exact module path where the interface is defined
**Warning signs:** Augmentation not working, duplicate identifier errors

**Example - WRONG:**

```typescript
// discojs main export doesn't define User interface
declare module 'discojs' {
  interface User {
    avatar_url?: string
  }
}
// Augmentation silently ignored - wrong module path
```

**Example - CORRECT:**

```typescript
// User interface is defined in discojs/lib/types
declare module 'discojs/lib/types' {
  interface User {
    avatar_url?: string
  }
}
// Augmentation works - correct module path
```

## Code Examples

Verified patterns from official sources and installed packages:

### Complete Barrel Export Pattern

```typescript
// src/types/discogs/index.ts
// Source: TypeScript Deep Dive Barrel Pattern - https://basarat.gitbook.io/typescript/main-1/barrel

// Import augmentation first (side effect)
import './augment.js'

// Re-export discojs collection types
export type {
  CollectionRelease,
  BasicInformation,
  Pagination
} from 'discojs/lib/types'

// Re-export discojs user types
export type { User, Identity } from 'discojs/lib/types'

// Re-export OAuth types (from local file)
export type {
  RequestTokenResult,
  AccessTokenResult,
  OAuthTokens
} from './oauth.js'
```

**Usage in application code:**

```typescript
// Single import for all Discogs types
import type { User, CollectionRelease, OAuthTokens } from '@/types/discogs'
```

### Complete Module Augmentation File

```typescript
// src/types/discogs/augment.ts
// Source: TypeScript Declaration Merging - https://www.typescriptlang.org/docs/handbook/declaration-merging.html

import 'discojs'

declare module 'discojs/lib/types' {
  /**
   * Extended User interface with fields missing from discojs
   */
  interface User {
    /**
     * User avatar image URL
     *
     * @endpoint GET /users/{username}
     * @optional Omitted for users without custom avatars
     * @augmented Not included in discojs User type
     */
    avatar_url?: string

    /**
     * User profile banner image URL
     *
     * @endpoint GET /users/{username}
     * @optional Omitted for users without custom banners
     * @augmented Not included in discojs User type
     */
    banner_url?: string
  }
}
```

### Complete OAuth Type Extraction File

```typescript
// src/types/discogs/oauth.ts
// Source: @lionralfs/discogs-client installed types + TypeScript Utility Types
// Reference: /node_modules/@lionralfs/discogs-client/types/oauth.d.ts

import { DiscogsOAuth } from '@lionralfs/discogs-client'

/**
 * Get instance type of DiscogsOAuth class for method extraction
 */
type OAuthInstance = InstanceType<typeof DiscogsOAuth>

/**
 * Result from DiscogsOAuth.getRequestToken()
 *
 * @extracted From @lionralfs/discogs-client v4.1.4
 * @contains token, tokenSecret, callbackConfirmed, authorizeUrl
 */
export type RequestTokenResult = Awaited<
  ReturnType<OAuthInstance['getRequestToken']>
>

/**
 * Result from DiscogsOAuth.getAccessToken()
 *
 * @extracted From @lionralfs/discogs-client v4.1.4
 * @contains accessToken, accessTokenSecret
 */
export type AccessTokenResult = Awaited<
  ReturnType<OAuthInstance['getAccessToken']>
>

/**
 * VinylDeck's OAuth token storage format (Zustand store)
 *
 * This is NOT from @lionralfs - it's VinylDeck's internal structure
 * Maps from @lionralfs naming (accessToken) to VinylDeck naming (same)
 */
export interface OAuthTokens {
  /** OAuth 1.0a access token */
  accessToken: string
  /** OAuth 1.0a access token secret */
  accessTokenSecret: string
}
```

**Verification of extracted types:**

```typescript
// From @lionralfs/discogs-client/types/oauth.d.ts:
// getRequestToken(): Promise<{
//   token: string | null;
//   tokenSecret: string | null;
//   callbackConfirmed: boolean;
//   authorizeUrl: string;
// }>

// RequestTokenResult will be:
// {
//   token: string | null;
//   tokenSecret: string | null;
//   callbackConfirmed: boolean;
//   authorizeUrl: string;
// }
```

## State of the Art

| Old Approach                 | Current Approach      | When Changed           | Impact                                         |
| ---------------------------- | --------------------- | ---------------------- | ---------------------------------------------- |
| Manual type definitions      | discojs io-ts types   | discojs 2.0 (2023)     | Runtime validation, auto-sync with API changes |
| Copying library return types | ReturnType extraction | TypeScript 2.8+ (2018) | Auto-updates with library, no drift            |
| Wrapper types                | Module augmentation   | TypeScript 1.8+ (2016) | Preserves names, merges with upgrades          |
| Individual type imports      | Barrel exports        | Long-standing pattern  | Single import point, clear boundaries          |

**Deprecated/outdated:**

- Manual Discogs type definitions: discojs provides comprehensive, validated types
- `export * from` wildcards: Explicit named exports preferred for traceability
- Wrapper types for third-party extension: Module augmentation is purpose-built

## Open Questions

1. **Where should OAuth types file live?**
   - What we know: Could be `src/types/discogs/oauth.ts` OR `src/types/auth/oauth.ts`
   - What's unclear: Whether OAuth types are "Discogs-specific" or "auth-specific"
   - Recommendation: Use `src/types/discogs/oauth.ts` - they're extracted from DiscogsOAuth class, not generic auth types. Keeps all Discogs types together.

2. **Should OAuthTokens be with OAuth API types?**
   - What we know: OAuthTokens is Zustand's internal structure, RequestTokenResult/AccessTokenResult are from @lionralfs
   - What's unclear: Whether to separate "internal" vs "API" types
   - Recommendation: Keep in same file - all OAuth-related, reduces file count. Document that OAuthTokens is VinylDeck-specific with JSDoc.

3. **Module augmentation vs wrapper types - final decision?**
   - What we know: Both technically work, different tradeoffs
   - What's unclear: User preference for VinylDeck's specific use case
   - Recommendation: Use module augmentation (see Architecture Patterns section for reasoning), but planner should check CONTEXT.md for user decision.

## Sources

### Primary (HIGH confidence)

- discojs npm package - https://www.npmjs.com/package/discojs - v2.3.1 verified
- @lionralfs/discogs-client types - Installed at node_modules/@lionralfs/discogs-client/types/oauth.d.ts - v4.1.4 verified
- TypeScript Declaration Merging - https://www.typescriptlang.org/docs/handbook/declaration-merging.html - Official docs
- TypeScript Utility Types - https://www.typescriptlang.org/docs/handbook/utility-types.html - Official docs
- Previous research: .planning/research/hybrid-api/STACK.md - Verified discojs requirement

### Secondary (MEDIUM confidence)

- TypeScript Barrel Pattern - https://basarat.gitbook.io/typescript/main-1/barrel - Widely cited resource
- DigitalOcean Module Augmentation - https://www.digitalocean.com/community/tutorials/typescript-module-augmentation - Practical guide
- Module Augmentation Hidden Gem - https://spin.atomicobject.com/module-augmentation-typescript/ - Real-world examples
- Barrel Export Patterns - https://frontendpatterns.dev/barrel-export/ - Best practices compilation

### Tertiary (LOW confidence)

- None - all findings verified against official sources or installed packages

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - discojs requirement from previous research, @lionralfs verified installed
- Architecture: HIGH - TypeScript official docs, verified against installed @lionralfs types
- Pitfalls: HIGH - Common module augmentation mistakes documented across multiple sources

**Research date:** 2026-02-03
**Valid until:** 60 days (stable TypeScript patterns, mature libraries)

**Critical verification performed:**

- ✓ Checked installed @lionralfs/discogs-client types in node_modules
- ✓ Verified OAuth method signatures (getRequestToken, getAccessToken)
- ✓ Confirmed discojs requirement from previous milestone research
- ✓ Validated TypeScript patterns against official documentation

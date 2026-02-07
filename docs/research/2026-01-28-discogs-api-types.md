# Discogs API TypeScript Types Research

**Date:** 2026-01-28 (updated 2026-01-28)
**Status:** Research ongoing, discojs deep dive complete
**Branch:** `chore/improve-api-types`

## Problem Statement

VinylDeck uses `@lionralfs/discogs-client` for Discogs API calls. The library's TypeScript types are incomplete, requiring type casts in the tRPC layer:

```typescript
// src/server/trpc/routers/discogs.ts:103-104
return {
  releases: data.releases as unknown as DiscogsCollectionRelease[],
  pagination: data.pagination as unknown as DiscogsPagination,
  rateLimit
}
```

We have manually created types in `src/types/discogs.ts` (738 lines) that are more complete than the library's types.

## Goals

1. Remove or reduce manual type maintenance
2. Eliminate `as unknown as` type casts
3. Ensure type accuracy matches actual API responses
4. Not miss API features due to incomplete types

## API Response Structure (Docs-Based, Not Fully Verified)

**Correction (2026-01-28):** The custom types in `src/types/discogs.ts` were **AI‑generated** from Discogs docs and are **not verified** against live API responses. Any statement that they are “verified” is incorrect. Treat these types as **best‑effort** models derived from documentation, not as ground truth.

### Collection Release Fields

```typescript
{
  id: number
  instance_id: number
  date_added: string              // ISO 8601
  rating: number
  folder_id: number
  notes: Array<{ field_id: number; value: string }>
  basic_information: {
    id: number
    master_id: number             // Documented field
    master_url: string            // Documented field
    resource_url: string
    thumb: string
    cover_image: string
    title: string
    year: number
    formats: Array<{
      name: string
      qty: string
      text?: string               // Optional, documented field
      descriptions: string[]
    }>
    labels: Array<{
      id: number
      name: string
      catno: string
      resource_url: string
      entity_type: string
      entity_type_name: string    // Documented field
    }>
    artists: Array<{...}>
    genres: string[]
    styles: string[]
  }
}
```

### Pagination Fields

```typescript
{
  page: number
  pages: number
  per_page: number
  items: number
  urls: {
    first?: string    // All optional
    prev?: string
    next?: string
    last?: string
  }
}
```

## Libraries Evaluated

### 1. @lionralfs/discogs-client (Currently Used)

- **npm:** https://www.npmjs.com/package/@lionralfs/discogs-client
- **GitHub:** https://github.com/lionralfs/discogs-client
- **Version:** ^4.1.4

**Pros:**

- Full OAuth 1.0a flow (`DiscogsOAuth.getRequestToken()`, `getAccessToken()`)
- Rate limit info in responses
- Active maintenance

**Cons - Missing Types:**
| Field | Status |
|-------|--------|
| `releases[].date_added` | Missing |
| `basic_information.master_id` | Missing |
| `basic_information.master_url` | Missing |
| `formats[].text` | Missing |
| `labels[].entity_type_name` | Missing |
| `pagination.urls.next` | Incorrectly required (should be optional) |
| `pagination.urls.last` | Incorrectly required (should be optional) |

### 2. discojs

- **npm:** https://www.npmjs.com/package/discojs
- **GitHub:** https://github.com/aknorw/discojs
- **Version:** 2.3.1
- **Last Updated:** (Unverified)

**Pros:**

- Many collection fields present that @lionralfs lacks
- Built-in rate limiting/throttling via Bottleneck (configurable)
- io-ts validators defined for runtime validation (types inferred for compile-time)
- e2e test suite exists (live API validation when run)
- GitHub stars: (Unverified)

**Cons:**

- NO OAuth flow support - only accepts existing tokens
- See "Deep Dive Analysis (2026-01-29)" section below for additional issues discovered

**Type Completeness (Collection):**
| Field | Status |
|-------|--------|
| `releases[].date_added` | ✅ Present |
| `basic_information.master_id` | ✅ Present |
| `basic_information.master_url` | ✅ Present |
| `formats[].text` | ✅ Present (optional) |
| `labels[].entity_type_name` | ✅ Present |
| `pagination.urls.*` | ✅ All optional |
| `notes` | ✅ Present (optional) |
| `folder_id` | ✅ Present (optional) |

**Type Differences vs VinylDeck (Identity):**
| Field | discojs `IdentityIO` | VinylDeck `DiscogsIdentity` |
|-------|---------------------|----------------------------|
| `consumer_name` | Required | Optional |
| `avatar_url` | Missing | Optional |

_Note: Neither has been verified against actual API responses._

### 3. @crate.ai/discogs-sdk

- **npm:** https://www.npmjs.com/package/@crate.ai/discogs-sdk
- **Version:** 2.4.1

**Verdict:** Even less complete than @lionralfs. Missing same fields plus more.

### 4. wyattowalsh/discogs-api-spec (OpenAPI)

- **GitHub:** https://github.com/wyattowalsh/discogs-api-spec
- **Format:** OpenAPI v3.1.1 (JSON & YAML)

**Verdict:** AI-generated from docs. Missing 4 fields:

- `CollectionRelease.notes`
- `basic_information.master_id`
- `basic_information.master_url`
- `labels[].entity_type_name`

### 5. leopuleo/Discogs-Postman

- **GitHub:** https://github.com/leopuleo/Discogs-Postman

**Verdict:** Request definitions only, no response examples. Not useful for type generation.

## Our Custom Types Assessment (Unverified)

**File:** `src/types/discogs.ts` (739 lines, 47 types)

**Accuracy:** **Not verified**. AI‑generated from docs; requires validation against real API responses.

**Known Issues / Gaps (Examples):**

- `DiscogsBasicInformation.country?: string` - Confirmed NOT present in the collection API response. Should be removed from `DiscogsBasicInformation` (it exists on `DiscogsRelease` for detailed release endpoint, not basic_information).
- User profile (`GET /users/{username}`) was modeled from docs examples. Real responses can differ and are scope‑dependent. Example: fields like `email`, `num_collection`, and `num_wantlist` vary by auth scope; some responses return only a subset of fields. Your current tRPC response shape (wrapping `data.profile` and `rateLimit`) also differs from raw Discogs payloads, so types must be validated against **actual** responses you consume.

**Action needed:** Validate all endpoints used in VinylDeck against real responses and update types accordingly.

## Possible Solutions

### Option 1: Keep Current Approach

- Continue using @lionralfs for OAuth + API calls
- Keep custom types in `src/types/discogs.ts`
- Cast at tRPC layer (isolated, documented)

**Effort:** None
**Maintenance:** Continue maintaining custom types

### Option 2: Hybrid - @lionralfs + discojs Types

- Use @lionralfs for OAuth flow (discojs can't do this)
- Import types from discojs for responses
- Or: Use discojs for API calls after OAuth is complete

**Effort:** Medium
**Risk:** Two libraries, potential version conflicts

### Option 3: Types Only from discojs

- Keep @lionralfs for everything
- Import/copy type definitions from discojs
- Removes need for custom type maintenance

**Effort:** Low
**Consideration:** discojs uses io-ts, types are derived from validators

### Option 4: Contribute Upstream to @lionralfs

- Submit PR with missing type fixes
- Benefits entire community
- Wait time for merge uncertain

**Effort:** Medium
**Timeline:** Dependent on maintainer

### Option 5: Fork @lionralfs

- Fork and fix types ourselves
- Full control
- Maintenance burden

**Effort:** High
**Maintenance:** High

## tRPC Type Flow (Reference)

Current architecture works correctly for frontend type inference:

```
AppRouter (typeof appRouter)
    ↓
tRPC procedure returns cast types
    ↓
createTRPCReact<AppRouter>()
    ↓
Frontend receives correct types via inference
```

The cast in the router propagates correctly to the frontend. The "ugly" part is contained to one file.

## Recommendation

**Short-term:** Keep current approach. The cast is isolated, documented, and works.

**Medium-term:** Consider Option 3 (use discojs types) or Option 4 (contribute upstream).

**Action Items:**

1. Remove `country` from `DiscogsBasicInformation` (incorrect)
2. Decide on long-term type strategy
3. If contributing upstream, prepare PR for @lionralfs/discogs-client

## Resources

- [Discogs API Documentation](https://www.discogs.com/developers/)
- [@lionralfs/discogs-client GitHub](https://github.com/lionralfs/discogs-client)
- [discojs GitHub](https://github.com/aknorw/discojs)
- [wyattowalsh/discogs-api-spec](https://github.com/wyattowalsh/discogs-api-spec)

---

## Deep Dive Analysis (2026-01-29)

Downloaded discojs source to `discojs-master/` for detailed code review.

### Architecture Overview

**Build System:**

- TypeScript 5.5.4 (strict mode)
- Rollup → dual output (CJS + ESM)
- Node >=20 requirement
- 5 production deps: `bottleneck`, `cross-fetch`, `fp-ts`, `io-ts`, `oauth-1.0a`

**Class Composition:**
Uses mixin pattern — `Discojs` class is composed of: `Database`, `UserIdentity`, `UserCollection`, `UserWantlist`, `UserLists`, `Marketplace`, `InventoryExport`.

### Type System (io-ts)

Types are defined as io-ts runtime validators, then TypeScript types are derived:

```typescript
// models/user.ts
export const UserIO = t.intersection([
  ResourceURLIO,
  t.partial({ email: t.string }), // optional
  t.type({ id: t.Integer }) // required
])
export type UserProfileResponse = t.TypeOf<typeof UserIO>
```

**Important:** The io-ts validators exist but are NOT used at runtime in production code. The `fetch.ts:207-208` just returns raw JSON cast to the type:

```typescript
const data = await response.json()
return data // No decode() call
```

Validation only happens in e2e tests via `t.exact(UserIO).is(response)`.

### API Coverage

80+ endpoints across 8 domains: User Identity, User Collection, User Wantlist, User Lists, Database, Marketplace, Inventory Export.

**Pagination helpers:** Every paginated endpoint has `getAll*()` async generator version.

### Rate Limiting

Uses Bottleneck library with moving window:

- Default: 25 req/min (unauth), 60 req/min (auth)
- Reads `X-Discogs-Ratelimit` headers to adjust dynamically
- **Does NOT expose rate limit metadata to consumers** — VinylDeck returns `{ data, rateLimit }` from tRPC which discojs cannot provide

### OAuth Support

Only supports signing requests with existing tokens:

```typescript
new Discojs({ consumerKey, consumerSecret, oAuthToken, oAuthTokenSecret })
```

**No support for:**

- `getRequestToken()` — initiate OAuth flow
- Authorization URL generation
- `getAccessToken()` — exchange verifier for tokens

This is why VinylDeck must keep @lionralfs for auth.

### Issues Discovered

#### 1. Query Param Casing Bug

`fetch.ts:259-268` — Query params are NOT transformed to snake_case:

```typescript
static addQueryToUri(uri: string, query: Record<string, any>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    params.append(key, value)  // No transformation!
  })
}
```

`transformData()` (line 279-287) only handles POST/PUT body, not GET query params.

**Impact:** Search options like `releaseTitle` are sent as-is instead of `release_title`. Discogs ignores unknown params, so searches silently return broader results.

#### 2. OrderMessageIO Intersection Bug

`models/marketplace.ts:234-251`:

```typescript
export const OrderMessageIO = t.intersection([
  t.type({ type, subject, message, timestamp, order }),
  OrderMessageStatusIO, // requires status_id, actor
  OrderMessageMessageIO, // requires from
  OrderMessageShippingIO, // requires original, new
  OrderMessageRefundIO // requires refund
])
```

Uses intersection of ALL message variants. A valid type would require ALL fields from ALL variants, but these are mutually exclusive based on `type`. Should be a discriminated union.

#### 3. Missing Endpoint Parameters

`database.ts:161-164`:

```typescript
// @TODO: There are a lot of parameters not handled here
async getMasterVersions(this: Discojs, masterId: number, pagination?: Pagination)
```

Discogs API supports: `format`, `label`, `released`, `country`, `sort`, `sort_order`. All missing.

#### 4. Broken/Workaround Endpoints

`database.ts:130-139` — `getReleaseStats` endpoint is broken, uses workaround:

```typescript
// Note: This endpoint is broken, see link below for a workaround.
async getReleaseStats(this: Discojs, releaseId: number): Promise<ReleaseStatsResponse> {
  const { community } = await this.getRelease(releaseId)  // Extra API call
  return { num_have: community.have, num_want: community.want }
}
```

#### 5. User Profile Types Overly Strict

`models/user.ts:60-88` — Most profile fields marked required via `t.type({})`:

```typescript
t.type({
  name: t.string, // Required
  profile: t.string, // Required
  home_page: t.string, // Required
  location: t.string // Required
  // ... many more
})
```

Real API responses vary by auth scope and can be partial.

#### 6. Browser Compatibility

`fetch.ts:122-128`:

```typescript
const unsafeHeadersInit: HeadersInit = allowUnsafeHeaders
  ? {
      'Accept-Encoding': 'gzip,deflate',
      Connection: 'close', // Browsers reject this
      'User-Agent': userAgent
    }
  : {}
```

Default `allowUnsafeHeaders: true` causes browser failures. Must set `false` for browser usage.

#### 7. No Retry-After Handling

`fetch.ts:183-196` handles 401, 422, 5xx but no special handling for 429 with `Retry-After` header.

### What discojs Does Well

Despite the issues above, collection types are solid:

- `FolderReleasesResponseIO` correctly types collection items with all fields VinylDeck needs
- `ReleaseMinimalInfoIO` includes `master_id`, `master_url`, `genres`, `styles`
- `PaginationIO` correctly marks all URL fields as optional
- Rate limiting via Bottleneck works reliably for throttling

### Key Files Reference

| Purpose              | Path                        |
| -------------------- | --------------------------- |
| User/Identity types  | `models/user.ts`            |
| Collection response  | `models/api.ts:82-100`      |
| Release types        | `models/release.ts:107-132` |
| Pagination           | `models/commons.ts:9-20`    |
| Rate limiter         | `src/utils/limiter.ts`      |
| Fetch/query handling | `src/utils/fetch.ts`        |
| OAuth signing        | `src/utils/auth.ts`         |
| Marketplace types    | `models/marketplace.ts`     |

### Summary

discojs collection types are well-structured and cover fields missing from @lionralfs. However, if extracting types for use in VinylDeck:

1. Query param casing would need fixing if using discojs for API calls
2. Some types (OrderMessage, user profile strictness) need adjustment
3. Rate limit metadata would need to be added if needed in responses
4. Identity type differs from VinylDeck's current definition

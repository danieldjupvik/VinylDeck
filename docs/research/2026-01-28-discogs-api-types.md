# Discogs API TypeScript Types Research

**Date:** 2026-01-28
**Status:** Research complete, decision pending
**Branch:** `feat/fully-support-offline-mode`

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

We have manually created types in `src/types/discogs.ts` (739 lines) that are more complete than the library's types.

## Goals

1. Remove or reduce manual type maintenance
2. Eliminate `as unknown as` type casts
3. Ensure type accuracy matches actual API responses
4. Not miss API features due to incomplete types

## Verified API Response Structure

Verified against real Discogs API response on 2026-01-28.

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
    master_id: number             // Present in API
    master_url: string            // Present in API
    resource_url: string
    thumb: string
    cover_image: string
    title: string
    year: number
    formats: Array<{
      name: string
      qty: string
      text?: string               // Optional, present in API
      descriptions: string[]
    }>
    labels: Array<{
      id: number
      name: string
      catno: string
      resource_url: string
      entity_type: string
      entity_type_name: string    // Present in API
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
- **Last Updated:** August 2024

**Pros:**

- Complete types (all fields present)
- Built-in rate limiting/throttling (configurable)
- Runtime validation with io-ts
- e2e test suite
- 66 GitHub stars

**Cons:**

- NO OAuth flow support - only accepts existing tokens
- Open issues:
  - #69: Build issue with Node 23+ (fix in PR #70)
  - PR #60: Stale (~1 year) - pagination/browser improvements

**Type Completeness:**
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

## Our Custom Types Assessment

**File:** `src/types/discogs.ts` (739 lines, 47 types)

**Accuracy:** Verified against real API - most complete TypeScript types available.

**One Issue Found:**

- `DiscogsBasicInformation.country?: string` - This field is NOT in the collection API response. Should be removed from `DiscogsBasicInformation` (it exists on `DiscogsRelease` for detailed release endpoint, not basic_information).

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

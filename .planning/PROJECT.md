# Discogs API Types Architecture

## What This Is

A hybrid API architecture for VinylDeck that combines @lionralfs/discogs-client (OAuth) with discojs (typed data calls). Replaces 739 lines of AI-generated unverified types with imports from a maintained library, adds proper server-side rate limiting via Bottleneck, and creates a facade layer that hides library complexity while enabling future features like aggregation and unauthenticated browsing.

## Core Value

Type-safe, maintainable Discogs API integration that scales with the app.

## Current Milestone: v1.1 Improve API Types

**Goal:** Replace custom types with discojs imports + facade architecture

**Target features:**

- Facade layer hiding @lionralfs + discojs behind single interface
- Types imported from discojs (auto-sync on dependency updates)
- Module augmentation for missing fields (avatar_url, banner_url)
- Bottleneck-based server-side throttling
- Retry-After handling for 429 errors
- Support for optional authentication (enables future unauth browsing)

## Requirements

### Validated

- ✓ Responsive changelog modal (Dialog on desktop, Drawer on mobile) — v1.0
- ✓ Manual changelog curation file (separate from release-please) — v1.0
- ✓ Version detection on app load — v1.0
- ✓ Dismissal tracking (store last-seen version) — v1.0
- ✓ Show all missed versions (latest expanded, older collapsed) — v1.0
- ✓ No modal if release has no user-facing changelog entries — v1.0
- ✓ "View Changelog" button in Settings opens the modal — v1.0
- ✓ Categories: New Features, Bug Fixes, Improvements (no emojis) — v1.0

### Active

- [ ] Facade layer with single `createDiscogsClient()` entry point
- [ ] Import types from discojs (collection, pagination, user, identity)
- [ ] Module augmentation for missing discojs fields
- [ ] OAuth types from @lionralfs (separate file)
- [ ] Bottleneck rate limiting (60/min auth, 25/min unauth)
- [ ] Retry-After handling for rate limit errors
- [ ] Update tRPC router to use facade
- [ ] Delete old custom types (src/types/discogs.ts)
- [ ] Remove `as unknown as` casts from tRPC router

### Out of Scope

- Cross-tab dismissal sync — deferred from v1.0, not this milestone
- Aggregation endpoints with progress streaming — future milestone
- Unauthenticated collection browsing UI — future milestone (architecture supports it)
- Runtime validation with io-ts — types only, no runtime overhead
- Contributing upstream to @lionralfs — maintenance burden

## Context

**Current pain:**

- 739 lines of AI-generated types in `src/types/discogs.ts` (unverified)
- `as unknown as` casts in tRPC router (lines 99-105)
- @lionralfs types missing 7+ fields (date_added, master_id, etc.)
- No proactive rate limiting (passive tracking only)

**Research completed:**

- Evaluated: @lionralfs, discojs, @crate.ai/discogs-sdk, OpenAPI specs
- discojs has best collection types, io-ts tested
- discojs lacks OAuth flow (need @lionralfs)
- Bottleneck is industry standard for rate limiting

**Tech stack additions (planned):**

- discojs (data calls + types)
- bottleneck (rate limiting)

## Constraints

- **OAuth**: Must keep @lionralfs — discojs cannot do OAuth flow
- **Rate limits**: Must expose to UI — discojs keeps internal, facade must extract
- **Types**: No io-ts runtime dependency — extract TypeScript types only
- **Compatibility**: Token format identical between libraries (OAuth 1.0a strings)

## Key Decisions

| Decision                           | Rationale                                              | Outcome   |
| ---------------------------------- | ------------------------------------------------------ | --------- |
| Hybrid @lionralfs + discojs        | Best of both: OAuth flow + proper types                | — Pending |
| Import types, don't copy           | Auto-sync on discojs updates, less maintenance         | — Pending |
| Module augmentation for extensions | Add missing fields without forking                     | — Pending |
| Facade pattern                     | Hide library complexity, easy to swap/extend           | — Pending |
| Bottleneck for throttling          | Industry standard, supports clustering, dynamic limits | — Pending |
| Option D type strictness           | Strict types + `?.` access, adjust later if needed     | — Pending |

---

_Last updated: 2026-02-03 after v1.1 milestone start_

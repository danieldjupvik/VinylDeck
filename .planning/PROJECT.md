# VinylDeck

## What This Is

A vinyl collection browser powered by the Discogs API, built as an offline-first PWA with type-safe API integration via a facade architecture that hides dual-library complexity (@lionralfs for OAuth, discojs for typed data operations).

## Core Value

Browse and manage your Discogs vinyl collection with a fast, offline-capable web app.

## Requirements

### Validated

- ✓ Responsive changelog modal (Dialog on desktop, Drawer on mobile) -- v1.0
- ✓ Manual changelog curation file (separate from release-please) -- v1.0
- ✓ Version detection on app load -- v1.0
- ✓ Dismissal tracking (store last-seen version) -- v1.0
- ✓ Show all missed versions (latest expanded, older collapsed) -- v1.0
- ✓ No modal if release has no user-facing changelog entries -- v1.0
- ✓ "View Changelog" button in Settings opens the modal -- v1.0
- ✓ Categories: New Features, Bug Fixes, Improvements (no emojis) -- v1.0
- ✓ Facade layer with single createDiscogsClient() entry point -- v1.1
- ✓ Import types from discojs (collection, pagination, user, identity) -- v1.1
- ✓ Module augmentation for missing discojs fields (banner_url) -- v1.1
- ✓ OAuth types from @lionralfs (separate file) -- v1.1
- ✓ Bottleneck rate limiting (60/min auth, 25/min unauth) -- v1.1
- ✓ Retry-After handling for rate limit errors -- v1.1
- ✓ Update tRPC routers to use facade -- v1.1
- ✓ Delete old custom types (src/types/discogs.ts) -- v1.1
- ✓ Remove `as unknown as` casts from tRPC router -- v1.1

### Active

(None -- next milestone requirements TBD via `/gsd:new-milestone`)

### Out of Scope

- Cross-tab dismissal sync -- deferred from v1.0, low priority
- Aggregation endpoints with progress streaming -- future milestone
- Unauthenticated collection browsing UI -- future milestone (architecture supports it)
- Runtime validation with io-ts -- types only, no runtime overhead
- Contributing upstream to @lionralfs -- maintenance burden

## Context

**Shipped v1.1** with 11,845 LOC TypeScript.
Tech stack: React 19, Vite 7, TanStack Router/Query, tRPC, Zustand, Tailwind 4, shadcn/ui.
API: Hybrid @lionralfs/discogs-client (OAuth) + discojs (typed data) behind facade.
Rate limiting: withRateLimitRetry (reactive) + discojs Bottleneck (proactive).
Zero tech debt from v1.1 migration.

## Constraints

- **OAuth**: Must keep @lionralfs -- discojs cannot do OAuth flow
- **Rate limits**: Must expose to UI -- discojs keeps internal, facade must extract
- **Types**: No io-ts runtime dependency -- extract TypeScript types only
- **Compatibility**: Token format identical between libraries (OAuth 1.0a strings)
- **Vercel**: `.js` extensions on relative imports, no `@/` aliases in server code
- **Strict TS**: `exactOptionalPropertyTypes: true` -- use `| undefined` for optional props

## Key Decisions

| Decision                           | Rationale                                                   | Outcome |
| ---------------------------------- | ----------------------------------------------------------- | ------- |
| Hybrid @lionralfs + discojs        | Best of both: OAuth flow + proper types                     | ✓ Good  |
| Import types via ReturnType        | Auto-sync on discojs updates, less maintenance              | ✓ Good  |
| Module augmentation for extensions | Add missing fields without forking                          | ✓ Good  |
| Facade pattern                     | Hide library complexity, easy to swap/extend                | ✓ Good  |
| Bottleneck for throttling          | Industry standard, supports clustering                      | ✓ Good  |
| Option D type strictness           | Strict types + `?.` access, caught real bugs                | ✓ Good  |
| Grouped namespaces (oauth/data)    | Clear subsystem separation in facade                        | ✓ Good  |
| Flat tRPC responses                | No wrapper objects, types flow naturally                    | ✓ Good  |
| Error mapper for facade            | Clean bridge between facade errors and tRPC error codes     | ✓ Good  |
| RATE_LIMIT co-location             | Inlined into rate-state.ts (only consumer)                  | ✓ Good  |
| Manual Error.cause for Vercel TS   | super(message) + this.cause for cross-tsconfig compat       | ✓ Good  |
| declare keyword for cause property | Vercel TS lacks Error.cause; declare adds type without emit | ✓ Good  |

---

_Last updated: 2026-02-07 after v1.1 milestone_

---
phase: 06-facade-layer
plan: 01
subsystem: api
tags: [discogs, facade, oauth, discojs, lionralfs, error-handling]

requires:
  - phase: 05-rate-limiting
    provides: withRateLimitRetry wrapper and rate state utilities
  - phase: 04-type-system
    provides: OAuthTokens type and discojs types

provides:
  - createDiscogsClient() facade factory
  - client.oauth namespace with getRequestToken/getAccessToken
  - client.data namespace with getIdentity/getCollectionReleases/getUserProfile
  - Unified error types (DiscogsApiError, DiscogsAuthError, DiscogsRateLimitError)

affects:
  - 07-router-migration (will consume facade instead of raw libraries)
  - future tRPC routers (all Discogs API calls through facade)

tech-stack:
  added: []
  patterns:
    - Factory function pattern for stateless serverless
    - Grouped namespaces (oauth/data) for subsystem separation
    - ES2022 Error.cause for error chaining

key-files:
  created:
    - src/server/discogs/errors.ts
    - src/server/discogs/oauth.ts
    - src/server/discogs/client.ts
    - src/server/discogs/index.ts
  modified: []

key-decisions:
  - 'Grouped namespaces (client.oauth.*, client.data.*) for clear library routing'
  - 'OAuth 1.0a config for discojs (consumerKey/Secret/oAuthToken/TokenSecret) - NOT userToken'
  - 'SortOptions built conditionally to satisfy exactOptionalPropertyTypes'

patterns-established:
  - 'Factory function createDiscogsClient() for per-invocation client creation'
  - 'Error wrapping with Error.cause for stack trace preservation'
  - 'Auth-required methods throw DiscogsAuthError early if no tokens'

duration: 5min
completed: 2026-02-05
---

# Phase 6 Plan 1: Facade Layer Summary

**Unified Discogs API facade with dual-library routing (@lionralfs OAuth, discojs data) and type-safe error handling**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-05T01:56:52Z
- **Completed:** 2026-02-05T02:01:39Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- createDiscogsClient() factory returning { oauth, data } namespaces
- OAuth operations via @lionralfs/discogs-client (getRequestToken, getAccessToken)
- Data operations via discojs with rate limit retry (getIdentity, getCollectionReleases, getUserProfile)
- Unified error types with ES2022 Error.cause preservation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unified errors and OAuth wrapper** - `30bf14b` (feat)
2. **Task 2: Create data client wrapper and facade entry point** - `b85a5dd` (feat)

## Files Created

- `src/server/discogs/errors.ts` - DiscogsApiError, DiscogsAuthError, DiscogsRateLimitError
- `src/server/discogs/oauth.ts` - createOAuthClient with @lionralfs wrapper
- `src/server/discogs/client.ts` - createDataClient with discojs, retry, error handling
- `src/server/discogs/index.ts` - Facade entry point re-exporting everything

## Decisions Made

- **Grouped namespaces:** `client.oauth.*` and `client.data.*` for clear routing (as planned)
- **OAuth 1.0a config:** discojs configured with consumerKey/Secret/oAuthToken/TokenSecret (NOT userToken which is for personal access tokens)
- **SortOptions handling:** Built conditionally to satisfy exactOptionalPropertyTypes (order property only included when defined)
- **Pagination handling:** Helper function buildPagination() to avoid passing undefined values to discojs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed discojs SortOptions type compatibility**

- **Found during:** Task 2 (createDataClient implementation)
- **Issue:** discojs uses `by` and `order` properties (not `sortBy`/`sortOrder`), and SortOrdersEnum type
- **Fix:** Used correct property names and UserSortEnum/SortOrdersEnum types
- **Files modified:** src/server/discogs/client.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** b85a5dd (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed exactOptionalPropertyTypes compatibility**

- **Found during:** Task 2 (createDataClient implementation)
- **Issue:** Passing undefined to discojs SortOptions.order violates strictness
- **Fix:** Created buildSortOptions() and buildPagination() helpers that conditionally include properties
- **Files modified:** src/server/discogs/client.ts
- **Verification:** TypeScript compilation passes with --noEmit
- **Committed in:** b85a5dd (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes required for TypeScript strictness. No scope creep.

## Issues Encountered

- **Pre-existing vercel build issue:** `__APP_VERSION__` constant error in src/lib/constants.ts exists on main branch - not caused by this phase (documented in Phase 5 verification)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Facade layer complete and ready for Phase 7 (Router Migration)
- All exports available from `src/server/discogs/index.ts`:
  - `createDiscogsClient()` factory
  - Error types: `DiscogsApiError`, `DiscogsAuthError`, `DiscogsRateLimitError`
  - Rate state: `getRateLimitState`, `updateRateLimitState`, `resetRateLimitState`
  - Types: `DiscogsClient`, `OAuthClient`, `DataClient`, `OAuthTokens`

---

_Phase: 06-facade-layer_
_Completed: 2026-02-05_

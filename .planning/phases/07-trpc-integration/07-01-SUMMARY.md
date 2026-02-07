---
phase: 07-trpc-integration
plan: 01
subsystem: api
tags: [trpc, facade, error-handling, oauth]

# Dependency graph
requires:
  - phase: 06-facade-layer
    provides: Facade client with error types and OAuth/data namespaces
provides:
  - Error mapper bridging facade errors to tRPC codes
  - OAuth router fully migrated to facade
  - getCollectionMetadata method for fast count checks
affects: [07-02-discogs-router, 08-app-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Facade error mapping to tRPC error codes
    - Flat response returns from facade (no wrapping)

key-files:
  created:
    - src/server/trpc/error-mapper.ts
  modified:
    - src/server/discogs/client.ts
    - src/server/trpc/routers/oauth.ts

key-decisions:
  - 'mapFacadeErrorToTRPC replaces handleDiscogsError for facade-based routers'
  - 'OAuth router migrated first as simpler proof of migration pattern'
  - 'getCollectionMetadata hides perPage=1 trick inside facade'

patterns-established:
  - 'Router imports only from facade, never from libraries directly'
  - 'Error mapper handles both RateLimitError (from lib/errors) and facade error types'
  - 'Callback URL validation stays in router (deployment security concern)'

# Metrics
duration: 4min
completed: 2026-02-06
---

# Phase 07 Plan 01: tRPC Router Migration Foundation Summary

**Error mapper established, OAuth router migrated to facade with flat responses, getCollectionMetadata added for fast sync checks**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-06T16:29:38Z
- **Completed:** 2026-02-06T16:33:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created mapFacadeErrorToTRPC to convert facade errors to tRPC error codes
- Migrated OAuth router to use facade exclusively (removed @lionralfs direct import)
- Added getCollectionMetadata to DataClient for fast count-only queries
- Proved migration pattern for remaining routers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create error mapper and add getCollectionMetadata** - `2dfbf60` (feat)
2. **Task 2: Migrate OAuth router to facade** - `5864b26` (feat)

## Files Created/Modified

- `src/server/trpc/error-mapper.ts` - Maps facade errors (DiscogsAuthError, DiscogsApiError, RateLimitError) to tRPC error codes
- `src/server/discogs/client.ts` - Added getCollectionMetadata method using perPage=1 for fast count
- `src/server/trpc/routers/oauth.ts` - Migrated to facade createDiscogsClient, removed direct library imports

## Decisions Made

- **Error mapper replaces handleDiscogsError**: New function specifically for facade error types, keeps old function for backward compatibility during migration
- **Handle both RateLimitError sources**: Import RateLimitError directly from lib/errors since that's what retry.ts throws at runtime, even though facade re-exports it
- **OAuth router first**: Simpler than Discogs router, proves the pattern before tackling data-heavy migration
- **Preserve callback validation**: Keep getAllowedCallbackOrigins and validateCallbackUrl in router (deployment-specific security)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - migration was straightforward following the established facade patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Error bridging infrastructure complete
- OAuth router migration proves pattern works
- Ready for Discogs router migration (07-02)
- getCollectionMetadata ready for use in collection sync feature

## Self-Check: PASSED

---

_Phase: 07-trpc-integration_
_Completed: 2026-02-06_

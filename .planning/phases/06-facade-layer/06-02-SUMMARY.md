---
phase: 06-facade-layer
plan: 02
subsystem: api
tags: [typescript, discojs, facade, types]

requires:
  - phase: 06-01
    provides: DataClient interface with discojs ReturnType extractions
  - phase: 04-01
    provides: Extended types barrel with User, Identity, CollectionResponse

provides:
  - DataClient interface returning extended types from src/types/discogs
  - getUserProfile returns User type with banner_url property
  - Type-safe access to extended fields through facade

affects: [07-router-migration, tRPC-routers]

tech-stack:
  added: []
  patterns:
    - Import extended types instead of ReturnType extraction for public interfaces

key-files:
  created: []
  modified:
    - src/server/discogs/client.ts

key-decisions:
  - 'Use imported types for interface, keep implementation unchanged'

patterns-established:
  - 'Public interface types from barrel, implementation uses library directly'

duration: 3min
completed: 2026-02-05
---

# Phase 6 Plan 02: Gap Closure - Extended Types Summary

**DataClient interface now returns User/Identity/CollectionResponse from types barrel, fixing UAT Test 5 banner_url access**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T02:51:58Z
- **Completed:** 2026-02-05T02:55:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- DataClient.getUserProfile now returns Promise<User> with banner_url property
- DataClient.getIdentity returns Promise<Identity> from types barrel
- DataClient.getCollectionReleases returns Promise<CollectionResponse> from types barrel
- UAT Test 5 gap closed - extended types flow through facade

## Task Commits

Each task was committed atomically:

1. **Task 1: Update DataClient interface to use extended types** - `7b696b6` (fix)

## Files Created/Modified

- `src/server/discogs/client.ts` - DataClient interface now imports and uses User, Identity, CollectionResponse types from src/types/discogs barrel

## Decisions Made

- Keep implementation unchanged - discojs methods still called directly, only interface typing updated
- Runtime values from discojs already include banner_url when present, this change makes TypeScript aware of it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Facade layer complete with extended types
- Ready for Phase 7 Router Migration - tRPC routers can now access banner_url through typed facade
- Pre-existing `__APP_VERSION__` build issue remains (on main branch, not v1.1 related)

---

_Phase: 06-facade-layer_
_Completed: 2026-02-05_

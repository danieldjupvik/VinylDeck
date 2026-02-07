---
phase: 07-trpc-integration
plan: 02
subsystem: api
tags: [trpc, discojs, facade, type-safety]

# Dependency graph
requires:
  - phase: 07-01
    provides: Error mapper and OAuth router migration pattern
  - phase: 06-02
    provides: Facade DataClient with all data operations
provides:
  - Fully migrated Discogs router using facade exclusively
  - Flat response shapes without wrapping
  - Deleted deprecated error-utils.ts and discogs-client.ts
  - Updated client-side hooks for flat responses
affects: [08-cleanup-and-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - tRPC routers return flat facade types (no wrapping)
    - Client hooks consume flat responses (no destructuring)
    - No rateLimit in tRPC responses

key-files:
  created: []
  modified:
    - src/server/trpc/routers/discogs.ts
    - src/hooks/use-user-profile.ts
    - src/hooks/use-collection.ts
    - src/providers/auth-provider.tsx
  deleted:
    - src/server/trpc/error-utils.ts
    - src/server/discogs-client.ts

key-decisions:
  - 'All tRPC routers return flat facade types without wrapping'
  - 'Remove rateLimit from all tRPC responses (server-side concern)'
  - 'Delete deprecated files in Phase 7 (clean break)'

patterns-established:
  - 'tRPC procedures: flat return await client.data.method()'
  - 'No as unknown as casts - facade types flow through naturally'
  - 'Client hooks: direct assignment without destructuring wrappers'

# Metrics
duration: 4min
completed: 2026-02-06
---

# Phase 7 Plan 02: Discogs Router Migration Summary

**All Discogs tRPC procedures migrated to facade with flat responses, deprecated files deleted, zero type casts**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-06T16:38:12Z
- **Completed:** 2026-02-06T16:42:00Z
- **Tasks:** 2
- **Files modified:** 5 (4 modified, 2 deleted)

## Accomplishments

- Migrated all 4 Discogs tRPC procedures to facade (getIdentity, getCollection, getUserProfile, getCollectionMetadata)
- Eliminated all `as unknown as` type casts from router code
- Updated client-side hooks to consume flat responses
- Deleted deprecated error-utils.ts and discogs-client.ts with zero dangling imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate Discogs router to facade** - `12170c8` (refactor)
   - Replaced old createDiscogsClient with facade version
   - All procedures use client.data.\* methods
   - Removed type casts, rateLimit handling
   - getCollectionMetadata uses facade method

2. **Task 2: Update hooks and delete deprecated files** - `d452910` (refactor)
   - use-user-profile: removed { profile } destructuring
   - use-collection: removed rateLimiter import and updateFromRateLimit call
   - Deleted error-utils.ts and discogs-client.ts

3. **Task 2 (additional): Fix auth-provider** - `5614523` (fix)
   - Updated auth-provider.tsx to handle flat getIdentity response
   - Removed .identity destructuring

## Files Created/Modified

**Modified:**

- `src/server/trpc/routers/discogs.ts` - All procedures migrated to facade with flat returns
- `src/hooks/use-user-profile.ts` - Flat profile response without destructuring
- `src/hooks/use-collection.ts` - Removed rateLimiter usage
- `src/providers/auth-provider.tsx` - Flat identity response handling

**Deleted:**

- `src/server/trpc/error-utils.ts` - Replaced by error-mapper.ts in Plan 01
- `src/server/discogs-client.ts` - Replaced by facade

## Decisions Made

None - followed plan as specified. All migration patterns established in Plan 01 were applied consistently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed auth-provider for flat getIdentity response**

- **Found during:** Task 2 verification (Vercel build)
- **Issue:** auth-provider.tsx still destructured .identity from getIdentity result after router migration
- **Fix:** Changed `identityResult.identity` to direct `identity` return
- **Files modified:** src/providers/auth-provider.tsx
- **Verification:** TypeScript compilation passes, Vercel build succeeds (except pre-existing **APP_VERSION** error)
- **Committed in:** 5614523 (additional task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary to unblock Vercel build. Pattern already documented in plan (flat responses). No scope creep.

## Issues Encountered

None - migration proceeded smoothly following established patterns from Plan 01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 8 (Cleanup and Verification):**

- All tRPC routers now use facade exclusively
- No deprecated files remain
- All type casts eliminated
- Client hooks updated for flat responses

**For verification in Phase 8:**

- Confirm no @lionralfs/discogs-client imports remain in server code
- Verify all tRPC responses use facade types
- Check for any missed rateLimit references

---

_Phase: 07-trpc-integration_
_Completed: 2026-02-06_

## Self-Check: PASSED

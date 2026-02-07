---
phase: 08-cleanup
plan: 01
subsystem: codebase-hygiene
tags: [cleanup, dead-code, dependencies, types]

requires:
  - 'Phase 4-7 (facade migration complete)'
provides:
  - 'Zero dead migration artifacts'
  - 'RATE_LIMIT constants co-located with rate-state'
  - 'Clean type barrel (no orphaned re-exports)'
  - 'Unused motion dependency removed'
affects:
  - '08-02 (stale eslint-disable cleanup if any remain)'

tech-stack:
  added: []
  removed: ['motion']
  patterns: ['co-located constants (RATE_LIMIT inlined into rate-state.ts)']

key-files:
  created: []
  modified:
    - 'src/types/discogs/index.ts'
    - 'src/lib/constants.ts'
    - 'src/server/discogs/rate-state.ts'
    - 'package.json'
    - 'bun.lock'
  deleted:
    - 'src/api/rate-limiter.ts'
    - 'src/types/discogs-legacy.ts'
    - 'src/types/discogs/augment.ts'

key-decisions:
  - id: 'RATE_LIMIT-colocation'
    decision: 'Inline RATE_LIMIT into rate-state.ts instead of keeping in constants.ts'
    reason: 'Only consumer is rate-state.ts; co-location reduces cross-module imports'

duration: '3 min'
completed: '2026-02-06'
---

# Phase 8 Plan 1: Dead Code Removal Summary

Remove deprecated files, orphaned types, and unused dependencies from the v1.1 facade migration. 964 lines of dead code eliminated, motion dependency removed.

## Performance

| Metric       | Value                               |
| ------------ | ----------------------------------- |
| Duration     | 3 min                               |
| Tasks        | 2/2                                 |
| Build passes | 3/3 (bun build, lint, vercel build) |

## Accomplishments

1. Deleted 3 dead files totaling ~964 lines (rate-limiter.ts, discogs-legacy.ts, augment.ts)
2. Moved RATE_LIMIT constants from constants.ts into rate-state.ts (co-located with its only consumer)
3. Removed unused RequestTokenResult/AccessTokenResult re-exports from type barrel
4. Removed stale eslint-disable comment referencing migration
5. Removed motion dependency (zero imports)
6. Full orphan scan confirmed: no other dead deps, no type casts in tRPC routers, no stale migration comments

## Task Commits

| Task | Name                                              | Commit  | Key Changes                       |
| ---- | ------------------------------------------------- | ------- | --------------------------------- |
| 1    | Delete dead files and move RATE_LIMIT constants   | 910fa18 | -964 lines, RATE_LIMIT inlined    |
| 2    | Remove unused dependency and run full orphan scan | e6390e4 | motion removed, orphan scan clean |

## Files Deleted

- `src/api/rate-limiter.ts` (213 lines, client-side rate limiter with zero imports)
- `src/types/discogs-legacy.ts` (738 lines, hand-written types replaced by discojs extraction)
- `src/types/discogs/augment.ts` (13 lines, dead module augmentation stub)

## Files Modified

- `src/types/discogs/index.ts` - Removed augment import, removed unused re-exports, updated doc comment
- `src/lib/constants.ts` - Removed RATE_LIMIT export (28 lines including JSDoc)
- `src/server/discogs/rate-state.ts` - Inlined RATE_LIMIT as local constant
- `package.json` - Removed motion dependency
- `bun.lock` - Regenerated

## Decisions Made

| Decision                             | Rationale                                                            |
| ------------------------------------ | -------------------------------------------------------------------- |
| Inline RATE_LIMIT into rate-state.ts | Only consumer; co-location > shared constants for server-only config |
| Keep @lionralfs/discogs-client       | Still used for OAuth flow in src/server/discogs/oauth.ts             |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing vercel build TS warnings in errors.ts (documented in STATE.md) remain unchanged.

## Next Phase Readiness

Plan 08-02 can proceed. No blockers. The codebase has zero dead migration artifacts.

## Self-Check: PASSED

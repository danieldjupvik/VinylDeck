---
phase: 08-cleanup
plan: 03
subsystem: server-errors
tags: [typescript, vercel, serverless, error-handling]
requires:
  - phase-06 facade error classes
provides:
  - vercel-build-clean errors.ts compilation
affects:
  - vercel deployment pipeline
tech-stack:
  added: []
  patterns:
    - declare property + manual assignment for cross-tsconfig compat
key-files:
  created: []
  modified:
    - src/server/discogs/errors.ts
key-decisions:
  - id: manual-cause-assignment
    decision: Use super(message) + this.cause instead of ES2022 2-arg Error constructor
    reason: Vercel serverless TS compiler targets older lib that lacks ErrorOptions
  - id: declare-cause-property
    decision: Use declare readonly cause on subclasses for type visibility
    reason: Vercel TS does not include cause in Error base type; declare adds it without JS emit
duration: 5min
completed: 2026-02-06
---

# Phase 8 Plan 3: Fix Vercel Build TS2554 in Facade Errors Summary

**Manual Error.cause assignment replaces ES2022 2-arg super() for Vercel serverless TS compat**

## Performance

- Duration: ~5 min
- Tasks: 1/1 completed
- Builds verified: bun run build + vercel build both pass clean

## Accomplishments

1. Replaced `super(message, { cause: options.cause })` with `super(message)` + `this.cause = options.cause` in both `DiscogsApiError` and `DiscogsAuthError`
2. Added `declare readonly cause?: unknown` property to both classes so Vercel's TS compiler recognizes the property
3. Updated file-level TSDoc to reflect manual cause assignment instead of ES2022 constructor
4. Verified both `bun run build` and `vercel build` pass with zero errors

## Task Commits

| Task | Name                                            | Commit  | Type |
| ---- | ----------------------------------------------- | ------- | ---- |
| 1    | Fix Error constructor to avoid 2-arg super call | a5c533e | fix  |

## Files Created/Modified

**Modified:**

- `src/server/discogs/errors.ts` - Single-arg super(), declare cause, manual assignment

## Decisions Made

1. **Manual cause assignment over ES2022 constructor**: Vercel's serverless function TS compiler does not recognize the 2-argument `Error(message, options)` constructor. Using `super(message)` + `this.cause = options.cause` achieves identical runtime behavior.
2. **`declare` keyword for cause property**: Vercel's TS lib does not include `cause` on `Error`. Using `declare readonly cause?: unknown` makes TS aware of the property without emitting redundant JS initialization.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TS2339 after initial fix required declare property**

- **Found during:** Task 1 verification
- **Issue:** After fixing TS2554 by switching to `super(message)`, Vercel TS compilation raised TS2339 (`Property 'cause' does not exist on type 'DiscogsApiError'`) because its lib target lacks `Error.cause`
- **Fix:** Added `declare readonly cause?: unknown` to both classes
- **Files modified:** src/server/discogs/errors.ts
- **Commit:** a5c533e

**2. [Rule 3 - Blocking] TS4113 override modifier not recognized**

- **Found during:** Task 1 verification (second iteration)
- **Issue:** Initially tried `override readonly cause` but Vercel TS does not see `cause` in base `Error`, so `override` fails with TS4113
- **Fix:** Switched from `override` to `declare` which adds the property type without requiring base class declaration
- **Files modified:** src/server/discogs/errors.ts
- **Commit:** a5c533e

## Issues Encountered

Three TS errors resolved iteratively in a single commit:

1. TS2554 (original): 2-arg Error constructor not recognized -> single-arg super()
2. TS2339 (surfaced): `cause` property not on Error type -> declare property
3. TS4113 (surfaced): `override` invalid when base lacks property -> `declare` keyword

All resolved before commit.

## User Setup Required

None.

## Next Phase Readiness

This was a gap closure plan. The vercel build TS2554 blocker documented in STATE.md is now resolved. The `src/server/discogs/errors.ts` file is fully compatible with both local and Vercel TypeScript compilation.

## Self-Check: PASSED

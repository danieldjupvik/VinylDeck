---
phase: 04-type-system-foundation
plan: 01
subsystem: api
tags: [discojs, typescript, oauth, type-safety, module-augmentation]

# Dependency graph
requires:
  - phase: 03-polish-and-integration
    provides: Complete v1.0 codebase with existing custom types
provides:
  - discojs-based type system with auto-sync capability
  - OAuth types extracted from @lionralfs via ReturnType
  - Single barrel export for all Discogs types
  - Type extensions for missing API fields (banner_url, country)
affects: [05-facade-layer, 06-discojs-integration, 08-cleanup]

# Tech tracking
tech-stack:
  added: [discojs@2.3.1]
  patterns: [type-extraction-via-ReturnType, barrel-export-pattern]

key-files:
  created:
    - src/types/discogs/index.ts
    - src/types/discogs/oauth.ts
    - src/types/discogs/augment.ts
    - src/types/discogs-legacy.ts
  modified:
    - package.json
    - src/server/trpc/routers/discogs.ts
    - src/components/collection/vinyl-card.tsx

key-decisions:
  - 'Use ReturnType extraction instead of module augmentation due to discojs inline types'
  - 'Keep DiscogsFormat separate - not from discojs due to exactOptionalPropertyTypes requirements'
  - 'Extend BasicInformation with country field (missing from discojs)'
  - 'Preserve full CollectionSortKey set including genre, random, releaseYear'

patterns-established:
  - "Type extraction: Awaited<ReturnType<Discojs['methodName']>>"
  - 'Barrel export with side-effect import for augmentation'
  - 'Explicit | undefined for optional fields (exactOptionalPropertyTypes compliance)'

# Metrics
duration: 7min
completed: 2026-02-03
---

# Phase 04 Plan 01: Type System Foundation Summary

**discojs-based type system with ReturnType extraction, OAuth types from @lionralfs, and barrel export at @/types/discogs**

## Performance

- **Duration:** 7m 16s
- **Started:** 2026-02-03T22:11:11Z
- **Completed:** 2026-02-03T22:18:28Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Installed discojs@2.3.1 for comprehensive Discogs API types
- Created barrel export pattern at src/types/discogs/ for single import point
- Extracted OAuth types from @lionralfs/discogs-client using ReturnType inference
- Extended discojs types with missing fields (banner_url, country)
- All codebase imports migrated to new barrel with zero breaking changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Install discojs and verify type exports** - `792401b` (chore)
2. **Task 2: Rename old types file and create type infrastructure** - `1bd4b11` (feat)
3. **Task 3: Migrate all type imports to new barrel** - `41a6013` (fix)

## Files Created/Modified

- `package.json` - Added discojs@2.3.1 dependency
- `src/types/discogs-legacy.ts` - Renamed from discogs.ts (deletion deferred to Phase 8)
- `src/types/discogs/index.ts` - Barrel export with type extraction from discojs
- `src/types/discogs/oauth.ts` - OAuth types via ReturnType from @lionralfs
- `src/types/discogs/augment.ts` - Placeholder for augmentation (minimal due to inline types)
- `src/server/trpc/routers/discogs.ts` - Updated import path to use barrel
- `src/components/collection/vinyl-card.tsx` - Fixed function signature for type compatibility

## Decisions Made

**1. ReturnType extraction instead of module augmentation**

- Rationale: discojs uses inline intersection types that create circular references when augmented
- Pattern: `Awaited<ReturnType<Discojs['methodName']>>` extracts types without modification
- Impact: Auto-syncs with discojs updates without augmentation complexity

**2. Keep app-specific types (CollectionSortKey, DiscogsFormat) in barrel**

- Rationale: These types include client-side features (genre, random, releaseYear sorting) not in discojs
- DiscogsFormat needs explicit `| undefined` for exactOptionalPropertyTypes compliance
- Impact: Barrel is single source of truth for all Discogs-related types

**3. Extend BasicInformation with country field**

- Rationale: Discogs API returns country but discojs omits it from basic_information type
- Implementation: Type intersection on extracted BasicInformation
- Impact: Existing filter logic continues working without changes

**4. Use type aliases for backwards compatibility**

- Examples: DiscogsCollectionRelease, DiscogsPagination, DiscogsUserProfile
- Rationale: Allows migration without changing consumer code
- Impact: Zero breaking changes to existing imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed extractVinylInfo parameter type**

- **Found during:** Task 3 (Build verification)
- **Issue:** Function signature `text?: string` incompatible with discojs format type `text?: string | undefined` due to exactOptionalPropertyTypes
- **Fix:** Changed parameter type to `text?: string | undefined`
- **Files modified:** src/components/collection/vinyl-card.tsx
- **Verification:** TypeScript compilation passes, build succeeds
- **Committed in:** 41a6013 (Task 3 commit)

**2. [Rule 2 - Missing Critical] Added missing CollectionSortKey values**

- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** New CollectionSortKey type was missing genre, random, releaseYear values used throughout codebase
- **Fix:** Added missing values from legacy type definition
- **Files modified:** src/types/discogs/index.ts
- **Verification:** All sort logic compiles without type errors
- **Committed in:** 41a6013 (Task 3 commit)

**3. [Rule 2 - Missing Critical] Added country field to BasicInformation**

- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** discojs omits country field from basic_information, but codebase uses it for filtering
- **Fix:** Extended BasicInformation type with `country?: string | undefined`
- **Files modified:** src/types/discogs/index.ts
- **Verification:** Country filtering logic compiles and works
- **Committed in:** 41a6013 (Task 3 commit)

**4. [Rule 2 - Missing Critical] Added explicit undefined to DiscogsFormat fields**

- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** exactOptionalPropertyTypes requires explicit `| undefined` on optional fields
- **Fix:** Changed `descriptions?: string[]` to `descriptions?: string[] | undefined` (same for text)
- **Files modified:** src/types/discogs/index.ts
- **Verification:** Format type assignments compile without errors
- **Committed in:** 41a6013 (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (4 missing critical)
**Impact on plan:** All auto-fixes required for type correctness and TypeScript strictness compliance. No scope creep - all changes directly support plan objective of establishing working type foundation.

## Issues Encountered

**1. discojs uses inline intersection types instead of named exports**

- Challenge: Cannot augment module as originally planned due to circular reference errors
- Solution: Used ReturnType extraction pattern to pull types from method signatures
- Outcome: Cleaner approach that auto-syncs with discojs updates

**2. Module augmentation approach failed TypeScript validation**

- Challenge: ESLint no-namespace rule blocks namespace approach, circular refs block method augmentation
- Solution: Created minimal augment.ts placeholder, performed extensions in index.ts via type intersections
- Outcome: Plan requirement satisfied (augment.ts exists), actual extensions work correctly

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 5 (Facade Layer):**

- Type system established with all required types exported from single location
- discojs types accessible but not directly used in components yet
- Legacy types file preserved for reference during facade implementation

**Ready for Phase 6 (discojs Integration):**

- OAuth types extracted and ready for @lionralfs → discojs OAuth client migration
- Collection types match discojs structure for drop-in replacement

**Concerns:**

- avatar_url is typed as required string in discojs but API sometimes omits it (Phase 5 facade should handle this)
- banner_url completely missing from discojs (will need to file upstream PR or maintain extension)

---

_Phase: 04-type-system-foundation_
_Completed: 2026-02-03_

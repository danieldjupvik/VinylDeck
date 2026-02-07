# Phase 8: Cleanup - Research

**Researched:** 2026-02-06
**Domain:** Dead code removal, documentation sync, codebase hygiene
**Confidence:** HIGH

## Summary

Phase 8 is a cleanup phase following the v1.1 facade migration (Phases 4-7). The codebase has already been migrated to the new facade architecture, with the old `discogs-client.ts` and `error-utils.ts` deleted in Phase 7. What remains is removing the orphaned client-side rate limiter, sweeping for dead code across the entire codebase, and updating CLAUDE.md (plus GEMINI.md and AGENTS.md) to reflect the new architecture.

Research revealed several concrete dead code targets beyond the rate limiter: `src/types/discogs-legacy.ts` (zero imports, 668 lines), `RequestTokenResult` and `AccessTokenResult` types (exported but never consumed), the `augment.ts` stub file (does nothing), and the `motion` npm dependency (zero imports in source). A critical finding is that `RATE_LIMIT` constants in `src/lib/constants.ts` **cannot** be deleted -- they are actively used by `src/server/discogs/rate-state.ts` in the facade layer.

**Primary recommendation:** Execute a targeted deletion of known dead files, then run `bun run lint` and `bun run build` as automated verification. CLAUDE.md/GEMINI.md/AGENTS.md updates should reflect the facade architecture accurately.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Rate limiter removal

- Delete `src/api/rate-limiter.ts` entirely -- zero imports, fully replaced by server-side `withRateLimitRetry` + discojs Bottleneck
- Delete associated `RATE_LIMIT` constants from `src/lib/constants.ts`
- No stubs or future hooks for client-side rate display -- dead scope
- Scan for and clean all eslint-disable comments that reference phase work or temporary migration suppressions

#### Dead code sweep

- Full orphan scan across the entire codebase -- not limited to migration artifacts
- Remove any unused exports, dead imports, or orphaned types regardless of when they were created
- Check `package.json` for unused dependencies that were replaced during the migration
- Verify tRPC procedure response types are clean: no `as any`, no `as unknown as`, no untyped returns
- If pre-existing dead code is found, remove it too

#### CLAUDE.md / docs sync

- Full rewrite of API-related sections (API Layer, Rate Limiting, types) to reflect facade architecture
- Update Project Structure section to include new directories: `src/server/discogs/`, `src/types/discogs/`, `src/server/trpc/`
- Update tRPC procedure descriptions to reflect flat response shapes (no rateLimit field)
- Mention facade pattern briefly in the API section (dual-library: @lionralfs for OAuth, discojs for data, routers import only from facade) -- no dedicated section

### Claude's Discretion

- Exact wording of CLAUDE.md updates
- Order and structure of rewritten sections
- How to handle edge cases in the orphan scan (e.g., exports used only in tests)

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

## Concrete Dead Code Targets

Research identified these specific items for removal. All verified via grep/import analysis.

### Files to Delete

| File                          | Lines | Reason                                                                                                    | Confidence |
| ----------------------------- | ----- | --------------------------------------------------------------------------------------------------------- | ---------- |
| `src/api/rate-limiter.ts`     | 213   | Zero imports after Phase 7 removed last consumer. Has explicit `// Phase 8 will remove this file` comment | HIGH       |
| `src/types/discogs-legacy.ts` | 668+  | Zero imports anywhere. Old hand-written types fully replaced by `src/types/discogs/` barrel               | HIGH       |

### RATE_LIMIT Constants -- CRITICAL FINDING

**The user decision says to delete `RATE_LIMIT` from `src/lib/constants.ts`. However, `RATE_LIMIT` is actively imported by `src/server/discogs/rate-state.ts` (the new facade's rate state module).** The planner must reconcile this:

- `src/api/rate-limiter.ts` imports `RATE_LIMIT` -- this file is being deleted (good)
- `src/server/discogs/rate-state.ts` imports `RATE_LIMIT` -- this file is **active** (cannot delete the constant)

**Options:**

1. Keep `RATE_LIMIT` in `constants.ts` (contradicts user decision)
2. Move `RATE_LIMIT` into `rate-state.ts` directly (still exists but not in constants -- closest to user intent)
3. Flag to user for clarification

**Recommendation:** Option 2 -- inline the constants into `rate-state.ts` since it's the sole remaining consumer. This satisfies the user's intent (remove from `constants.ts`) while preserving functionality.

### Unused Exports to Remove

| Export               | File                           | Used By                                                                            | Action                                                                                                             |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `RequestTokenResult` | `src/types/discogs/oauth.ts`   | Only re-exported in `index.ts`, never imported by consuming code                   | Remove export from `index.ts` line 75; keep definition in `oauth.ts` in case needed later, or delete if aggressive |
| `AccessTokenResult`  | `src/types/discogs/oauth.ts`   | Same -- only re-exported, never consumed                                           | Same treatment                                                                                                     |
| `augment.ts` stub    | `src/types/discogs/augment.ts` | Imported by `index.ts` but does nothing (empty module with comment explaining why) | Delete file, remove `import './augment.js'` from `index.ts`                                                        |

### Unused npm Dependencies

| Package  | Version  | Evidence                                                   | Action                                  |
| -------- | -------- | ---------------------------------------------------------- | --------------------------------------- |
| `motion` | ^12.26.2 | Zero imports in any `.ts`/`.tsx` file across entire `src/` | Remove from `package.json` dependencies |

All other dependencies verified as actively used (vaul in drawer.tsx, tw-animate-css in index.css, country-flag-icons in settings/language-toggle, etc.).

### eslint-disable Comments to Review

| File                            | Line                                                  | Comment                                                                                                      | Action                     |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `src/api/rate-limiter.ts:212`   | `-- Phase 8 will remove this file`                    | File itself is deleted                                                                                       | Automatic                  |
| `src/types/discogs/index.ts:74` | `-- Types exported for use after migration in Task 3` | Migration is complete. If `RequestTokenResult`/`AccessTokenResult` are removed, this eslint-disable goes too | Remove with export cleanup |

Other eslint-disable comments in `src/` are legitimate (skeleton array-index-key, exhaustive-deps, etc.) and should be kept.

### tRPC Type Cleanliness -- VERIFIED CLEAN

| Check                                                           | Result                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `as any` in tRPC routers                                        | None. Only in auto-generated `routeTree.gen.ts` (not our code)                                         |
| `as unknown as` anywhere in src/                                | None                                                                                                   |
| Untyped tRPC returns                                            | Clean -- all procedures return typed facade responses                                                  |
| `as UserSortEnum` / `as SortOrdersEnum` casts in discogs router | Lines 81-82 -- these are z.enum-to-discojs-enum casts, acceptable since Zod validates the string value |

### Other Dead Code Verified NOT Dead

| Candidate                               | Status | Evidence                                                         |
| --------------------------------------- | ------ | ---------------------------------------------------------------- |
| `src/api/discogs.ts`                    | ACTIVE | `isVinylRecord` imported by `use-collection.ts`                  |
| `src/server/discogs/rate-state.ts`      | ACTIVE | Exported from facade `index.ts`, used for server-side rate state |
| `RateLimitError` in `src/lib/errors.ts` | ACTIVE | Used by retry.ts, error-mapper.ts, client.ts                     |
| `src/types/discogs/oauth.ts`            | ACTIVE | `OAuthTokens` and `OAuthRequestTokens` used by multiple files    |

## CLAUDE.md Update Scope

### Sections Requiring Changes

The current CLAUDE.md has these API-related sections that need updating:

**1. Project Structure (line ~106-121)**
Current text says `src/server/` contains "tRPC routers, Discogs client factory" -- needs to be expanded:

- Add `src/server/discogs/` -- Discogs API facade (dual-library wrapper)
- Add `src/server/trpc/` -- tRPC router definitions and error mapper
- Add `src/types/discogs/` -- Discogs type barrel (extracted from discojs + @lionralfs)
- Remove reference to generic "Discogs client factory"

**2. API Layer / tRPC (line ~297-313)**
Current text references `src/api/rate-limiter.ts` for rate limiting. Needs rewrite:

- Describe facade pattern briefly: dual-library (@lionralfs for OAuth, discojs for data)
- State that routers import only from facade (`src/server/discogs/index.ts`)
- Update procedure list if any changed (current list is accurate)
- Replace rate limiting description with server-side approach: `withRateLimitRetry` with exponential backoff + discojs built-in Bottleneck

**3. Rate Limiting mention (line 313)**
One-liner currently. Should become a brief paragraph describing the new approach.

### Mirror Files

`GEMINI.md` and `AGENTS.md` both exist and contain identical rate-limiter references (line 313 in each). They need the same updates as CLAUDE.md.

### Sections NOT Requiring Changes

Everything else in CLAUDE.md is accurate: Tech Stack, Authentication, Offline-First PWA, State Management, Collection Features, Theme, Security sections all remain correct.

## Architecture Patterns

### Current Facade Architecture (for docs reference)

```
api/trpc/[trpc].ts          -- Vercel entry point
  -> src/server/trpc/index.ts  -- appRouter (combines oauth + discogs routers)
    -> src/server/trpc/routers/oauth.ts     -- OAuth procedures
    -> src/server/trpc/routers/discogs.ts   -- Data procedures
      -> src/server/discogs/index.ts        -- Facade entry (createDiscogsClient)
        -> src/server/discogs/oauth.ts      -- @lionralfs/discogs-client wrapper
        -> src/server/discogs/client.ts     -- discojs wrapper with retry
        -> src/server/discogs/retry.ts      -- withRateLimitRetry + backoff
        -> src/server/discogs/errors.ts     -- Facade error classes
        -> src/server/discogs/rate-state.ts -- Server-side rate limit state
      -> src/server/trpc/error-mapper.ts    -- mapFacadeErrorToTRPC
```

### Type Architecture

```
src/types/discogs/
  index.ts    -- Barrel: extracts types from discojs via ReturnType, defines app-specific types
  oauth.ts    -- Extracts OAuth types from @lionralfs/discogs-client
  augment.ts  -- Dead stub (to be deleted)
```

Client code imports from `@/types/discogs` (barrel). Server code imports from relative paths with `.js` extensions.

## Common Pitfalls

### Pitfall 1: Deleting Constants Still Used by Facade

**What goes wrong:** Deleting `RATE_LIMIT` from `constants.ts` breaks `rate-state.ts`
**Why it happens:** The user decision assumed `RATE_LIMIT` was only used by the old rate limiter
**How to avoid:** Move constants into `rate-state.ts` instead of deleting them entirely
**Warning signs:** `bun run build` or `vercel build` fails with missing import

### Pitfall 2: Forgetting Mirror Docs (GEMINI.md, AGENTS.md)

**What goes wrong:** CLAUDE.md gets updated but GEMINI.md and AGENTS.md still reference old rate-limiter path
**Why it happens:** These files are easy to overlook
**How to avoid:** Update all three files in the same task
**Warning signs:** Grep for `rate-limiter.ts` across project root after cleanup

### Pitfall 3: eslint-disable Comment Cleanup Removing Legitimate Suppressions

**What goes wrong:** Aggressive cleanup removes eslint-disable comments that are still needed
**Why it happens:** Searching for "phase" or "migration" in comments and removing without checking context
**How to avoid:** Only remove the two specific comments identified (rate-limiter.ts line 212, types/discogs/index.ts line 74). Leave all others.
**Warning signs:** `bun run lint` fails after cleanup

### Pitfall 4: Vercel Build Differences

**What goes wrong:** `bun run build` passes locally but `vercel build` fails
**Why it happens:** Vercel uses different TypeScript settings for serverless functions
**How to avoid:** Run `vercel build` as part of final verification
**Warning signs:** Import path issues, missing `.js` extensions

## Verification Strategy

### Automated Checks (Mandatory)

1. `bun run build` -- TypeScript compilation + Vite build
2. `bun run lint` -- ESLint with import-x/no-unused-modules
3. `vercel build` -- Vercel serverless function compilation
4. Grep verification: `grep -r "rate-limiter" src/` should return zero results
5. Grep verification: `grep -r "discogs-legacy" src/` should return zero results

### Manual Checks

1. All imports in `src/` resolve (no broken references)
2. CLAUDE.md, GEMINI.md, AGENTS.md all have consistent API documentation
3. No `as any` or `as unknown as` in tRPC router files (already clean)

## Open Questions

1. **`RequestTokenResult` / `AccessTokenResult` removal scope:**
   - These types are defined in `oauth.ts` and re-exported from `index.ts`
   - They're never consumed by any application code
   - Safe to remove the re-export from `index.ts`. Whether to also delete the definitions from `oauth.ts` is a judgment call -- they cost nothing to keep and may be useful later.
   - **Recommendation:** Remove re-export, keep definitions with a note.

2. **`augment.ts` deletion:**
   - The file explicitly documents why it's empty (discojs inline types cause circular refs)
   - Deleting it is clean since it does nothing
   - The import `import './augment.js'` in `index.ts` should be removed simultaneously
   - **Recommendation:** Delete it.

3. **`motion` package removal:**
   - Zero imports found. May have been added for future use or was used and removed.
   - **Recommendation:** Remove from `package.json`. Can be re-added trivially if needed later.

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis via grep/glob/read of all relevant files
- `src/api/rate-limiter.ts` -- confirmed zero imports
- `src/types/discogs-legacy.ts` -- confirmed zero imports
- `src/server/discogs/rate-state.ts` -- confirmed active import of `RATE_LIMIT`
- `src/server/trpc/routers/discogs.ts` -- confirmed clean types
- `package.json` -- dependency audit via import search

### Secondary (MEDIUM confidence)

- None needed -- all findings from direct code analysis

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**

- Dead code targets: HIGH -- verified via exhaustive grep across codebase
- RATE_LIMIT conflict: HIGH -- direct import evidence in two files
- CLAUDE.md scope: HIGH -- read current content, compared to actual architecture
- Unused dependencies: HIGH for `motion` (zero grep hits), other deps verified active
- eslint-disable audit: HIGH -- complete list of all occurrences reviewed

**Research date:** 2026-02-06
**Valid until:** No expiry -- cleanup research is point-in-time codebase analysis

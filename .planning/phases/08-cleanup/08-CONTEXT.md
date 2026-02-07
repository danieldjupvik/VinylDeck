# Phase 8: Cleanup - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove deprecated code from the v1.1 migration and update documentation to reflect the new facade-based architecture. Phase 7 already deleted `discogs-client.ts` and `error-utils.ts` — this phase handles the remaining artifacts and ensures the codebase is clean end-to-end.

</domain>

<decisions>
## Implementation Decisions

### Rate limiter removal

- Delete `src/api/rate-limiter.ts` entirely — zero imports, fully replaced by server-side `withRateLimitRetry` + discojs Bottleneck
- Delete associated `RATE_LIMIT` constants from `src/lib/constants.ts`
- No stubs or future hooks for client-side rate display — dead scope
- Scan for and clean all eslint-disable comments that reference phase work or temporary migration suppressions

### Dead code sweep

- Full orphan scan across the entire codebase — not limited to migration artifacts
- Remove any unused exports, dead imports, or orphaned types regardless of when they were created
- Check `package.json` for unused dependencies that were replaced during the migration
- Verify tRPC procedure response types are clean: no `as any`, no `as unknown as`, no untyped returns
- If pre-existing dead code is found, remove it too

### CLAUDE.md / docs sync

- Full rewrite of API-related sections (API Layer, Rate Limiting, types) to reflect facade architecture
- Update Project Structure section to include new directories: `src/server/discogs/`, `src/types/discogs/`, `src/server/trpc/`
- Update tRPC procedure descriptions to reflect flat response shapes (no rateLimit field)
- Mention facade pattern briefly in the API section (dual-library: @lionralfs for OAuth, discojs for data, routers import only from facade) — no dedicated section

### Claude's Discretion

- Exact wording of CLAUDE.md updates
- Order and structure of rewritten sections
- How to handle edge cases in the orphan scan (e.g., exports used only in tests)

</decisions>

<specifics>
## Specific Ideas

- The eslint-disable on rate-limiter.ts line 212 explicitly says "Phase 8 will remove this file" — that's the cue
- CLAUDE.md Rate Limiting section should describe the new server-side approach (withRateLimitRetry + Bottleneck) rather than being removed
- Project Structure should be accurate enough that a new contributor understands the layout

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 08-cleanup_
_Context gathered: 2026-02-06_

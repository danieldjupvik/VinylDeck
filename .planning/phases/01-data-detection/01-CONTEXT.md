# Phase 1: Data & Detection - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Infrastructure for changelog data format and version change detection. Establishes the data layer that Phase 2's modal will consume. Users don't interact with this directly — it's the foundation.

</domain>

<decisions>
## Implementation Decisions

### Changelog data format

- 3 categories: New Features, Bug Fixes, Improvements
- Text-only entries (no links or external references)
- TypeScript file at `src/data/changelog.ts` — type-safe, offline-ready, bundled with releases
- Entries ordered by category priority: New Features → Improvements → Bug Fixes
- Markdown supported in entry descriptions (bold, code, etc.)

### Version comparison logic

- Pre-release versions (beta, rc) trigger changelog modal
- Hook returns ALL missed versions (0.8 → 0.11 returns entries for 0.9, 0.10, 0.11)
- First install (no lastSeenVersion): skip modal entirely — everything is new
- Hook returns distinct states: `{ entries: [], reason: 'no-entries' | 'up-to-date' }` for debugging

### Entry filtering rules

- User-facing entries only — internal/dev changes never included
- Manual curation — entries written by hand, not auto-generated from commits
- Versions with no user-facing entries don't appear in changelog data (omitted, not empty)

### Claude's Discretion

- Exact TypeScript types and structure for changelog entries
- Version parsing implementation details
- How lastSeenVersion is initialized on first install

</decisions>

<specifics>
## Specific Ideas

- Accordion UX for missed versions already planned for Phase 2 — latest expanded, older collapsed
- This aligns with best practice to prevent info overload while keeping full history available

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 01-data-detection_
_Context gathered: 2026-01-29_

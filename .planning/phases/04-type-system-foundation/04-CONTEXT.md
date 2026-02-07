# Phase 4: Type System Foundation - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace custom Discogs types with discojs imports and establish module augmentation for missing fields. Create a single entry point for all Discogs-related types. OAuth types extracted from @lionralfs via type inference.

</domain>

<decisions>
## Implementation Decisions

### Type Organization

- Single barrel file at `src/types/discogs/index.ts` — all types accessible from one import
- Re-export discojs types with original names (no prefixes)
- All types in one barrel — no public/internal split
- Keep old `src/types/discogs.ts` for now — deletion deferred to Phase 8 (after facade layer eliminates `as unknown as` casts)

### Module Augmentation

- Separate augmentation file: `src/types/discogs/augment.ts` imported by index
- Match Discogs API reality for optionality — optional if sometimes omitted
- Include JSDoc comments explaining why each field is augmented and which endpoint returns it

### OAuth Types Extraction

- Use type inference (`ReturnType<>`, `Parameters<>`) to extract types from @lionralfs
- Create friendly aliases like `RequestTokenResult` and `AccessTokenResult`

### Migration Strategy

- Big-bang replacement — update all imports in one commit
- Install discojs as dependency in this phase
- Run `tsc --noEmit` as explicit verification before merging

### Claude's Discretion

- Whether to use module augmentation (extend discojs types in-place) or wrapper types — pick based on TypeScript best practices and downstream consumption patterns
- Where OAuth types file should live — `src/types/discogs/oauth.ts` or `src/types/auth/oauth.ts` — based on usage patterns
- Whether to include OAuthTokens (Zustand's internal structure) with OAuth API types — based on current location and usage
- Whether to remove `as unknown as` casts in this phase or defer to Phase 7 — based on whether casts can be safely removed without the facade layer

</decisions>

<specifics>
## Specific Ideas

- Types should auto-sync with discojs updates — import, don't copy
- Module augmentation allows adding missing fields without forking the library
- The barrel file should be the "one stop shop" for any Discogs type in the app

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 04-type-system-foundation_
_Context gathered: 2026-02-03_

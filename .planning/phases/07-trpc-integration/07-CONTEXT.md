# Phase 7: tRPC Integration - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewire tRPC routers to consume the facade layer. OAuth router uses `client.oauth`, Discogs router uses `client.data`. Remove direct library imports, eliminate `as unknown as` casts, get full type inference flowing from discojs through facade to client. Includes client-side hook updates to match new response shapes.

</domain>

<decisions>
## Implementation Decisions

### Error bridging

- New facade-to-tRPC error mapper replacing `handleDiscogsError`
- Clean break: delete `error-utils.ts` and its helpers (`isDiscogsError`, `isNetworkError`, etc.) in this phase, not Phase 8
- Maps `DiscogsAuthError` -> `UNAUTHORIZED`/`FORBIDDEN`, `DiscogsApiError` -> status-based codes, `RateLimitError` -> `TOO_MANY_REQUESTS`
- `RateLimitError` surfaces retry-after info in the TRPCError message string
- Callback URL validation stays in the OAuth router (deployment security, not API concern)

### Response shaping

- Flat returns: procedures return facade types directly (Identity, User, CollectionResponse)
- No wrapping in named keys (no more `{ identity: {...} }` or `{ profile: {...} }`)
- Full type pass-through from facade — routers don't cherry-pick fields
- Add `getCollectionMetadata()` to DataClient facade (hides the perPage=1 trick)
- Client-side hooks updated in this phase to match new flat response shapes

### Token handling

- Keep tokens as Zod input params per procedure (stateless, matches Vercel Serverless)
- Per-procedure facade client creation (`createDiscogsClient(tokens)` per call)
- OAuth router switches to facade: `createDiscogsClient().oauth` — no direct `@lionralfs` import
- All routers import only from the facade, never from library packages directly

### Rate limit exposure

- Drop `rateLimit` from all tRPC responses (not a Phase 7 requirement; RATE-05 satisfied by rate-state.ts)
- discojs doesn't expose per-response rate limit headers anyway (uses Bottleneck internally)
- Client-side rateLimit destructuring cleaned up in this phase alongside response shape changes
- Rate errors still surface via TOO_MANY_REQUESTS tRPC error code with retry info in message

### Claude's Discretion

- Exact structure of the new facade-to-tRPC error mapper function
- How to organize the new error mapping (same file, new file, inline)
- Order of migration (OAuth router first vs Discogs router first)

</decisions>

<specifics>
## Specific Ideas

- All Discogs calls should flow through one import: `createDiscogsClient()` from the facade. Routers should have no idea two libraries exist underneath.
- End-to-end type safety: changing a type in discojs should propagate through facade -> tRPC -> client hooks with zero manual intervention.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 07-trpc-integration_
_Context gathered: 2026-02-06_

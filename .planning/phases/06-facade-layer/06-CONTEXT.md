# Phase 6: Facade Layer - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Single entry point (`createDiscogsClient()`) hiding dual-library complexity. OAuth operations route through @lionralfs, data operations route through discojs. Query params converted to snake_case. Supports optional authentication for future unauthenticated browsing.

</domain>

<prior_decisions>

## Inherited from Phase 5

Rate limiting architecture is already decided (see 05-CONTEXT.md):

| Library        | Use For                                      | Rate Limiting?                                    |
| -------------- | -------------------------------------------- | ------------------------------------------------- |
| **@lionralfs** | OAuth ONLY (getRequestToken, getAccessToken) | NO — 2 calls per login, negligible                |
| **discojs**    | ALL data operations                          | YES — built-in Bottleneck + Phase 5 retry wrapper |

**No throttling coordination needed** — OAuth calls are too rare to matter.

</prior_decisions>

<decisions>
## Implementation Decisions

### Client Factory API

- Singleton pattern — one shared instance for entire app
- Method names match Discogs API naming (e.g., `getCollectionReleases`, `getIdentity`) — familiar to Discogs devs

### Claude's Discretion (Factory API)

- Whether to use single flat namespace or grouped namespaces (client.oauth vs client.data)
- Token injection method (constructor vs setter vs both)

### Error Surface

- Unified facade errors — callers see `DiscogsApiError`, `DiscogsAuthError`, `DiscogsRateLimitError`, not library-specific errors
- Always include original error as `cause` property for debugging (full stack traces preserved)

### Claude's Discretion (Errors)

- What RateLimitError includes beyond wait time (operation context, retry count)
- Auth error behavior (just report vs auto-clear tokens)
- Network error wrapping strategy

### Optional Auth Handling

- Public Discogs endpoints (search, public profiles, release info) should work without authentication
- No `isAuthenticated()` method — caller already knows if they passed tokens, keep facade simple

### Claude's Discretion (Auth)

- API representation for unauthenticated mode (null tokens vs separate factory)
- Behavior when auth-required method called without tokens (throw immediately vs let API reject)

</decisions>

<specifics>
## Specific Ideas

- Extend unified error pattern from Phase 5's `RateLimitError`
- Singleton should work well with tRPC context (one client per request isn't needed since Vercel functions are stateless per-invocation anyway)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 06-facade-layer_
_Context gathered: 2026-02-05_

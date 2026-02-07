# Phase 5: Rate Limiting - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Add 429 error handling and rate state exposure on top of discojs's built-in throttling. Proactive throttling is already handled by discojs via Bottleneck — this phase adds reactive recovery and observability.

</domain>

<critical>
## CRITICAL: Dual-Library Architecture

**READ THIS FIRST — applies to all v1.1 phases:**

| Library                       | Use For                                                                | Rate Limiting?                            |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| **@lionralfs/discogs-client** | OAuth ONLY (getRequestToken, getAccessToken)                           | NO — 2 calls per login, negligible        |
| **discojs**                   | ALL data operations (getCollection, getIdentity, getUserProfile, etc.) | YES — this is where rate limiting matters |

**Why two libraries:**

- @lionralfs has battle-tested OAuth 1.0a flow that works
- discojs has proper TypeScript types and built-in Bottleneck throttling
- Hybrid approach: OAuth flow from @lionralfs + typed data operations from discojs

**Rate limiting scope for Phase 5:** discojs data calls ONLY. Do not add rate limiting to OAuth calls.

</critical>

<discovery>
## Key Discovery: discojs Built-in Throttling

discojs already includes Bottleneck with these defaults:

- `requestLimit: 25` (unauthenticated)
- `requestLimitAuth: 60` (authenticated)
- `requestLimitInterval: 60000` (60 seconds)

**What discojs handles:**

- Proactive request spacing to stay under limits
- Automatic switching between auth/unauth limits based on credentials

**What discojs does NOT handle (Phase 5 scope):**

- 429 error detection and retry
- Retry-After header parsing
- Rate state exposure (remaining/reset)

</discovery>

<decisions>
## Implementation Decisions

### 429 Retry Strategy

- Throw typed `RateLimitError` after retries exhausted — includes remaining time so consumers (tRPC/UI) can handle appropriately
- Error type should carry enough context for upstream layers to display meaningful feedback

### Rate State Exposure

- Expose full state: remaining requests, total limit, reset timestamp
- Only track state from real API calls — cached responses don't update rate state
- This is infrastructure exposure only — no UI in this phase

### Claude's Discretion

- Wait time calculation (respect Retry-After exactly vs add jitter)
- Retry count (how many attempts before throwing RateLimitError)
- Exposure pattern (response metadata vs shared state object)
- Data source (parse headers ourselves vs check if discojs exposes it)

</decisions>

<specifics>
## Specific Ideas

- Research whether discojs exposes rate limit headers before adding custom parsing
- RateLimitError should be importable and typed for use in tRPC error handling

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 05-rate-limiting_
_Context gathered: 2026-02-05_

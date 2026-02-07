# Project Research Summary

**Project:** VinylDeck v1.1 - Improve Discogs API Types
**Domain:** Hybrid API client architecture migration
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

VinylDeck currently uses @lionralfs/discogs-client with 738 lines of manually maintained type definitions. Research confirms a hybrid architecture is the optimal path: retain @lionralfs for OAuth 1.0a (only mature OAuth library), add discojs for data operations (superior io-ts-derived types), and wrap both behind a facade pattern with shared Bottleneck rate limiting.

The recommended approach uses a facade pattern to hide library coordination complexity from tRPC routers. OAuth calls route to @lionralfs, data calls route to discojs, and all requests flow through a shared Bottleneck instance that enforces Discogs' 60 requests/minute limit. Module augmentation extends discojs types for missing fields like avatar_url and banner_url without forking the library.

Key risks include discojs's query parameter casing bug (camelCase not converted to snake_case), rate limit metadata loss (discojs doesn't expose headers), and module augmentation footguns (overwrites instead of merging if import is missing). Prevention strategies are well-documented in PITFALLS.md, with integration testing as the primary validation mechanism.

## Key Findings

### Recommended Stack

Research validates the hybrid approach as technically sound and battle-tested.

**Core technologies:**

- **discojs (^2.3.1)**: Discogs data client with runtime-validated io-ts types — eliminates 738 lines of manual types, reduces maintenance burden
- **@lionralfs/discogs-client (4.1.4)**: OAuth 1.0a flow — keep for getRequestToken/getAccessToken, only library with mature OAuth implementation
- **Bottleneck (^2.19.5)**: Server-side rate limiting — replaces passive tracking with proactive queueing, prevents 429 errors before they happen

**Bundle impact:**

- Server-side: ~800KB total (~600KB new) — acceptable for serverless functions (10MB limit)
- Client-side: 0 bytes — discojs used only in server code, types imported with `import type` (compile-time only)
- Cold start: ~100ms added for io-ts/fp-ts (one-time cost)

**Why not alternatives:**

- Zod instead of io-ts: Would require rewriting all type definitions, lose discojs maintenance
- Redis clustering for Bottleneck: VinylDeck is single-user per deployment, in-memory state sufficient
- disconnect library: No TypeScript support, outdated OAuth, abandoned 7 years ago

### Expected Features

Facade layer provides table stakes functionality while enabling future enhancements.

**Must have (table stakes):**

- Single client factory — hide dual-library complexity behind `createDiscogsClient()` entry point
- Automatic OAuth handoff — tokens from @lionralfs seamlessly passed to discojs
- Type-safe responses — import and re-export discojs types, eliminate `as unknown as` casts
- Error normalization — unified DiscogsApiError interface for both libraries
- Rate limit exposure — extract metadata for UI display

**Should have (competitive):**

- Proactive rate limiting — Bottleneck prevents 429 errors with queue management
- Retry-After handling — parse 429 response headers, auto-retry with exponential backoff
- Optional authentication — facade supports both authenticated and unauthenticated modes (enables future public browsing)
- Response metadata — structured wrapper with rate limit, timing, pagination info
- Transparent library swapping — facade interface isolates implementation from tRPC routers

**Defer (v2+):**

- Runtime validation with io-ts — bundle size overhead, performance cost, false security (types already validated by discojs)
- Request caching layer — wrong responsibility (TanStack Query handles caching)
- Progress streaming support — architecture enables it, implementation deferred to aggregation milestone

### Architecture Approach

Facade pattern coordinates @lionralfs (OAuth) and discojs (data) behind unified interface with shared rate limiting.

**File organization:**

```
src/server/discogs/
├── index.ts           # Facade entry point (public API)
├── oauth.ts           # @lionralfs wrapper (OAuth operations)
├── client.ts          # discojs wrapper (data operations)
├── throttle.ts        # Bottleneck configuration (shared limiter)
└── error-utils.ts     # Unified error handling

src/types/discogs/
├── index.ts           # Re-exports from discojs + extensions
├── extensions.d.ts    # Module augmentation for missing fields
└── oauth.ts           # OAuth-specific types from @lionralfs
```

**Major components:**

1. **Facade (index.ts)** — single entry point exports `discogs.getOAuthClient()` and `discogs.getDataClient()`, hides library split from consumers
2. **Shared throttle (throttle.ts)** — single Bottleneck instance (60/min reservoir pattern) imported by both oauth.ts and client.ts, ensures all API calls respect rate limit
3. **Library wrappers (oauth.ts, client.ts)** — wrap each library method with `throttleLimiter.schedule()`, normalize error shapes, validate credentials
4. **Type system (types/discogs/)** — re-export discojs types, module augmentation for gaps, separate OAuth types from data types

**Data flow:**

```
tRPC Router
    ↓
discogs.getDataClient(accessToken, accessTokenSecret)
    ↓
throttleLimiter.schedule(() => client.getCollection(...))
    ↓ (rate limited, queued if necessary)
discojs → Discogs API
    ↓
Strongly-typed response (no casting needed)
```

### Critical Pitfalls

Top pitfalls with high-confidence prevention strategies identified.

1. **Query param casing silently breaks searches** — discojs doesn't convert camelCase to snake_case for GET requests, Discogs ignores unknown params. Prevention: manually convert params until upstream fix, add integration tests that verify query strings on wire.

2. **Rate limit metadata loss** — discojs uses Bottleneck internally but doesn't expose rate limit headers in responses. Prevention: build facade that intercepts responses before discojs processes them, extract headers manually, maintain last-known rate limit state.

3. **Token handoff type mismatch** — OAuth tokens from @lionralfs may not serialize identically for discojs. Prevention: verify token format compatibility with integration test (OAuth flow via @lionralfs → API call via discojs), document token contract with explicit interface.

4. **Module augmentation overwrites instead of merging** — missing import statement causes TypeScript to replace entire interface instead of extending. Prevention: always include `import type { ... } from 'discojs'` before `declare module 'discojs'` block, add integration test that verifies both original and augmented fields exist.

5. **Browser compatibility breaking** — discojs defaults to `allowUnsafeHeaders: true`, browsers reject `Connection: 'close'` header. Prevention: set `allowUnsafeHeaders: false` for browser environments, add environment detection to client factory.

## Implications for Roadmap

Research strongly suggests incremental migration with early validation of critical integration points.

### Phase 1: Foundation (Throttling + Types)

**Rationale:** Zero-dependency additions establish foundation without touching existing code.
**Delivers:** Bottleneck instance configured for Discogs limits, type system with discojs imports and module augmentation.
**Addresses:** Core technologies from STACK.md (discojs, Bottleneck installation).
**Avoids:** Big-bang migration risk — foundation components can be tested in isolation before integration.

### Phase 2: OAuth Integration

**Rationale:** Smallest surface area for validating dual-library coordination and token handoff.
**Delivers:** @lionralfs wrapper with throttling, integration test proving token compatibility.
**Addresses:** Token handoff pitfall (Critical #3) — early validation prevents cascade failures.
**Avoids:** Building data layer before proving libraries can share tokens.

### Phase 3: Data Client Migration

**Rationale:** With OAuth proven, migrate data calls to discojs for superior types.
**Delivers:** discojs wrapper with throttled methods, facade entry point coordinating both libraries.
**Addresses:** Type-safe responses (must-have feature), eliminates `as unknown as` casts.
**Avoids:** Query param casing pitfall by documenting limitation and manual conversion strategy.

### Phase 4: tRPC Router Updates

**Rationale:** With facade complete, update consumers to use new interface.
**Delivers:** Updated oauth.ts and discogs.ts routers, error handling for both libraries.
**Addresses:** Error normalization (must-have), transparent library swapping (should-have).
**Avoids:** Custom type deletion pitfall by keeping old types until all usages migrated.

### Phase 5: Cleanup + Validation

**Rationale:** Remove deprecated code only after full verification.
**Delivers:** Deleted src/server/discogs-client.ts and src/types/discogs.ts, comprehensive testing checklist completion.
**Addresses:** Bundle size optimization, technical debt reduction.
**Avoids:** Premature deletion by grepping for all type references before removal.

### Phase Ordering Rationale

- **Phase 1 first:** Foundation components (throttle, types) have zero dependencies and can be tested in isolation — reduces risk.
- **Phase 2 before Phase 3:** OAuth integration is smallest surface area for proving token handoff works — early validation prevents cascade failures in data layer.
- **Phase 3 leverages Phase 2:** Data client migration builds on proven OAuth wrapper pattern — reuse throttling and error handling strategies.
- **Phase 4 after Phase 3:** Facade must be complete before updating consumers — prevents partial migration state.
- **Phase 5 last:** Cleanup only after full verification — avoids breaking changes from premature deletion.

**Critical path:** Phase 2 blocks Phase 3 (must prove token handoff before building data layer). All other phases can partially overlap.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3:** discojs API surface area differs from @lionralfs — need to map method signatures, verify all current operations are supported
- **Phase 5:** Rate limit metadata extraction strategy unclear — research discojs internals to determine if headers accessible before response processing

Phases with standard patterns (skip research-phase):

- **Phase 1:** Standard dependency installation and TypeScript type imports — well-documented patterns
- **Phase 2:** OAuth token passing is straightforward interface mapping — no novel integration needed
- **Phase 4:** tRPC router updates follow established facade consumption pattern — no unknowns

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                              |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | All packages verified on npm, version compatibility confirmed with TypeScript 5.9.3 and Bun                                        |
| Features     | HIGH       | Facade pattern well-established for dual-library coordination, precedents in linked sources                                        |
| Architecture | HIGH       | File organization matches VinylDeck conventions, data flow validated against existing patterns                                     |
| Pitfalls     | HIGH       | Query param bug verified in discojs source code (fetch.ts:259-268), module augmentation behavior documented in TypeScript handbook |

**Overall confidence:** HIGH

### Gaps to Address

Research resolved all critical questions. Minor gaps to validate during implementation:

- **discojs method signatures:** Verify exact API matches between @lionralfs and discojs for getIdentity, getUserProfile, getCollection — may need mapping layer if different
- **Rate limit header extraction:** Determine if discojs exposes headers before response decoding — if not, facade must intercept raw Response objects
- **Module augmentation scope:** Confirm which fields are missing from discojs types by comparing against Discogs API responses — avatar_url and banner_url known, may discover others

These gaps are implementation details, not architectural blockers. Standard testing during Phase 3 will resolve them.

## Sources

### Primary (HIGH confidence)

- [discojs GitHub](https://github.com/aknorw/discojs) — OAuth limitations documented, API surface verified
- [discojs npm](https://www.npmjs.com/package/discojs) — v2.3.1, 477KB unpacked, dependency tree analyzed
- [Bottleneck GitHub](https://github.com/SGrondin/bottleneck) — Clustering docs, event system, configuration examples
- [TypeScript Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) — Official module augmentation documentation
- [Facade in TypeScript](https://refactoring.guru/design-patterns/facade/typescript/example) — Canonical design patterns resource

### Secondary (MEDIUM confidence)

- [Prevent API Overload with Bottleneck](https://dev.to/arifszn/prevent-api-overload-a-comprehensive-guide-to-rate-limiting-with-bottleneck-c2p) — Practical Bottleneck integration patterns
- [A Guide to the Facade Design Pattern in TypeScript](https://medium.com/@robinviktorsson/a-guide-to-the-facade-design-pattern-in-typescript-and-node-js-with-practical-examples-b568a45b7dfa) — Library coordination use case
- [Module Augmentation in TypeScript](https://www.digitalocean.com/community/tutorials/typescript-module-augmentation) — Practical augmentation guide
- [VinylDeck Discogs API Types Research](docs/research/2026-01-28-discogs-api-types.md) — Project-specific investigation

### Tertiary (LOW confidence)

- [discojs Issues](https://github.com/aknorw/discojs/issues) — Community-reported bugs, query param casing issue confirmed

---

_Research completed: 2026-02-03_
_Ready for roadmap: yes_

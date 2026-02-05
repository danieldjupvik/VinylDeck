# Roadmap: VinylDeck

## Milestones

- v1.0 User-Friendly Changelog - Phases 1-3 (shipped 2026-02-03)
- v1.1 Improve API Types - Phases 4-8 (in progress)

## Phases

<details>
<summary>v1.0 User-Friendly Changelog (Phases 1-3) - SHIPPED 2026-02-03</summary>

### Phase 1: Modal UI Foundation

**Goal**: Responsive changelog modal infrastructure
**Plans**: 3 plans

Plans:

- [x] 01-01: Create ResponsiveDialog component (Dialog on desktop, Drawer on mobile)
- [x] 01-02: Design version display with expand/collapse for older versions
- [x] 01-03: Add "View Changelog" button to Settings

### Phase 2: Changelog System

**Goal**: Version detection and content management
**Plans**: 2 plans

Plans:

- [x] 02-01: Create manual changelog curation file separate from release-please
- [x] 02-02: Implement version detection and dismissal tracking with localStorage

### Phase 3: Polish and Integration

**Goal**: Production-ready changelog feature
**Plans**: 2 plans

Plans:

- [x] 03-01: Show modal on app load if new versions detected (latest expanded, older collapsed)
- [x] 03-02: Add category support (New Features, Bug Fixes, Improvements) and empty state handling

</details>

### v1.1 Improve API Types (In Progress)

**Milestone Goal:** Type-safe, maintainable Discogs API integration with facade architecture

#### Phase 4: Type System Foundation

**Goal**: Replace custom types with discojs imports and module augmentation
**Depends on**: Phase 3
**Requirements**: TYPE-01, TYPE-02, TYPE-03, TYPE-04, TYPE-05
**Success Criteria** (what must be TRUE):

1. Collection types (CollectionRelease, BasicInformation, Pagination) are imported from discojs without manual definitions
2. User types (User, Identity) are imported from discojs without manual definitions
3. Missing fields (avatar_url, banner_url) are type-safe via module augmentation
4. OAuth types (OAuthTokens, RequestTokenResult, AccessTokenResult) are extracted from @lionralfs in separate file
5. All Discogs types are accessible via single import from src/types/discogs/index.ts
   **Plans**: 1 plan

Plans:

- [x] 04-01-PLAN.md — Create discojs type system and migrate all imports

#### Phase 5: Rate Limiting

**Goal**: Reactive 429 error handling and rate state exposure (proactive throttling handled by discojs built-in Bottleneck)
**Depends on**: Phase 3
**Requirements**: RATE-01, RATE-02, RATE-03, RATE-04, RATE-05, RATE-06
**Success Criteria** (what must be TRUE):

1. 429 errors are caught and retried with exponential backoff + jitter
2. RateLimitError is thrown after retries exhausted, carrying remaining wait time
3. Rate limit state (remaining, reset time) is exposed for UI consumption
4. Retry wrapper is ready for facade layer to consume (Phase 6)
   **Plans**: 1 plan

Plans:

- [ ] 05-01-PLAN.md — Create retry infrastructure and rate state tracking

#### Phase 6: Facade Layer

**Goal**: Single entry point hiding dual-library complexity
**Depends on**: Phase 4, Phase 5
**Requirements**: FACADE-01, FACADE-02, FACADE-03, FACADE-04, FACADE-07
**Success Criteria** (what must be TRUE):

1. Single createDiscogsClient() factory creates OAuth and data clients with shared throttling
2. OAuth operations (getRequestToken, getAccessToken) route through @lionralfs wrapper
3. Data operations (getCollection, getIdentity, getUserProfile) route through discojs wrapper
4. Query parameters are converted from camelCase to snake_case for Discogs API compatibility
5. Facade accepts optional authentication (tokens parameter can be omitted for future unauthenticated browsing)
   **Plans**: TBD

Plans:

- [ ] TBD

#### Phase 7: tRPC Integration

**Goal**: tRPC routers consume facade with type-safe responses
**Depends on**: Phase 6
**Requirements**: FACADE-05, FACADE-06, TYPE-07
**Success Criteria** (what must be TRUE):

1. OAuth router (getRequestToken, getAccessToken) uses facade OAuth client
2. Discogs router (getIdentity, getUserProfile, getCollection, getCollectionMetadata) uses facade data client
3. No `as unknown as` casts remain in tRPC router code
4. Responses from tRPC endpoints have full type inference from discojs types
   **Plans**: TBD

Plans:

- [ ] TBD

#### Phase 8: Cleanup

**Goal**: Remove deprecated code and complete migration
**Depends on**: Phase 7
**Requirements**: TYPE-06, CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):

1. Old custom types file (src/types/discogs.ts) is deleted
2. Old discogs-client factory (src/server/discogs-client.ts) is deleted
3. Passive rate limiter (src/api/rate-limiter.ts) is removed if replaced by Bottleneck
4. All imports across codebase reference new type paths (src/types/discogs/)
   **Plans**: TBD

Plans:

- [ ] TBD

## Progress

**Execution Order:**
Phases 4-8 execute sequentially. Phase 4 and Phase 5 can run in parallel (no dependencies).

| Phase                     | Milestone | Plans Complete | Status      | Completed  |
| ------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Modal UI Foundation    | v1.0      | 3/3            | Complete    | 2026-02-03 |
| 2. Changelog System       | v1.0      | 2/2            | Complete    | 2026-02-03 |
| 3. Polish and Integration | v1.0      | 2/2            | Complete    | 2026-02-03 |
| 4. Type System Foundation | v1.1      | 1/1            | Complete    | 2026-02-03 |
| 5. Rate Limiting          | v1.1      | 0/1            | Not started | -          |
| 6. Facade Layer           | v1.1      | 0/TBD          | Not started | -          |
| 7. tRPC Integration       | v1.1      | 0/TBD          | Not started | -          |
| 8. Cleanup                | v1.1      | 0/TBD          | Not started | -          |

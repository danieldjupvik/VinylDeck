# Requirements: VinylDeck v1.1 API Types

**Defined:** 2026-02-03
**Core Value:** Type-safe, maintainable Discogs API integration that scales with the app

## v1.1 Requirements

Requirements for hybrid @lionralfs + discojs architecture.

### Type System

- [x] **TYPE-01**: Import collection types from discojs (CollectionRelease, BasicInformation, Pagination)
- [x] **TYPE-02**: Import user types from discojs (User, Identity)
- [x] **TYPE-03**: Create module augmentation for missing fields (avatar_url, banner_url)
- [x] **TYPE-04**: Create OAuth types file from @lionralfs (OAuthTokens, RequestTokenResult, AccessTokenResult)
- [x] **TYPE-05**: Create unified type exports (index.ts re-exporting all)
- [ ] **TYPE-06**: Delete old custom types file (src/types/discogs.ts)
- [ ] **TYPE-07**: Remove `as unknown as` casts from tRPC router

### Facade Layer

- [ ] **FACADE-01**: Create facade entry point (server/discogs/index.ts) with createDiscogsClient()
- [ ] **FACADE-02**: Create OAuth wrapper (server/discogs/oauth.ts) using @lionralfs
- [ ] **FACADE-03**: Create data client wrapper (server/discogs/client.ts) using discojs
- [ ] **FACADE-04**: Implement query param casing workaround (camelCase → snake_case)
- [ ] **FACADE-05**: Update tRPC OAuth router to use facade
- [ ] **FACADE-06**: Update tRPC discogs router to use facade
- [ ] **FACADE-07**: Support optional authentication (tokens parameter optional)

### Rate Limiting

- [ ] **RATE-01**: Create Bottleneck configuration (server/discogs/throttle.ts)
- [ ] **RATE-02**: Configure authenticated rate limit (60 req/min)
- [ ] **RATE-03**: Configure unauthenticated rate limit (25 req/min)
- [ ] **RATE-04**: Implement Retry-After handling for 429 errors
- [ ] **RATE-05**: Expose rate limit state for UI consumption
- [ ] **RATE-06**: Wrap all discojs calls with throttling

### Cleanup

- [ ] **CLEAN-01**: Remove old discogs-client.ts factory
- [ ] **CLEAN-02**: Remove passive rate limiter (src/api/rate-limiter.ts) if replaced
- [ ] **CLEAN-03**: Update imports across codebase to use new type paths

## Future Requirements (v1.2+)

Deferred to future milestones. Architecture supports these but not building now.

### Aggregation

- **AGG-01**: Async generator for fetching all collection pages
- **AGG-02**: Progress streaming via SSE
- **AGG-03**: ETA calculation based on Bottleneck queue state
- **AGG-04**: Enriched collection with release details/pricing

### Unauthenticated Browsing

- **UNAUTH-01**: Browse public collections without login
- **UNAUTH-02**: UI for entering username to browse
- **UNAUTH-03**: Clear indication of limited features

## Out of Scope

Explicitly excluded from v1.1. Documented to prevent scope creep.

| Feature                              | Reason                                  |
| ------------------------------------ | --------------------------------------- |
| Runtime validation with io-ts        | Types only, no runtime overhead needed  |
| Contributing upstream to @lionralfs  | Maintenance burden, uncertain timeline  |
| Cross-tab dismissal sync (changelog) | Different milestone, not API types      |
| Redis clustering for Bottleneck      | Single-user per deployment, unnecessary |
| Custom OAuth implementation          | Security risk, use proven library       |
| Request caching in facade            | TanStack Query's job, not API layer     |

## Traceability

| Requirement | Phase | Status   |
| ----------- | ----- | -------- |
| TYPE-01     | 4     | Complete |
| TYPE-02     | 4     | Complete |
| TYPE-03     | 4     | Complete |
| TYPE-04     | 4     | Complete |
| TYPE-05     | 4     | Complete |
| TYPE-06     | 8     | Pending  |
| TYPE-07     | 7     | Pending  |
| FACADE-01   | 6     | Pending  |
| FACADE-02   | 6     | Pending  |
| FACADE-03   | 6     | Pending  |
| FACADE-04   | 6     | Pending  |
| FACADE-05   | 7     | Pending  |
| FACADE-06   | 7     | Pending  |
| FACADE-07   | 6     | Pending  |
| RATE-01     | 5     | Pending  |
| RATE-02     | 5     | Pending  |
| RATE-03     | 5     | Pending  |
| RATE-04     | 5     | Pending  |
| RATE-05     | 5     | Pending  |
| RATE-06     | 5     | Pending  |
| CLEAN-01    | 8     | Pending  |
| CLEAN-02    | 8     | Pending  |
| CLEAN-03    | 8     | Pending  |

**Coverage:**

- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---

_Requirements defined: 2026-02-03_
_Last updated: 2026-02-03 after Phase 4 completion_

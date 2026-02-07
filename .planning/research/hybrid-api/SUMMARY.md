# Research Summary: Hybrid Discogs API Architecture

**Domain:** Stack additions for hybrid @lionralfs + discojs architecture
**Researched:** 2026-02-03
**Overall confidence:** HIGH

## Executive Summary

VinylDeck's hybrid API architecture requires three stack additions: discojs for runtime-validated types, Bottleneck for active server-side rate limiting, and TypeScript module augmentation for missing Discogs fields. All additions are server-side only with zero client bundle impact.

The architecture keeps @lionralfs/discogs-client for OAuth 1.0a flow (discojs cannot perform OAuth dance) and uses discojs for all data calls (better types via io-ts). This combination gives VinylDeck the best of both libraries while avoiding their limitations.

Bundle impact is acceptable (~600KB server-side, 0 bytes client-side). All packages are mature, well-maintained, and compatible with Vercel serverless functions.

## Key Findings

**Stack additions:**

- discojs 2.3.1 - Discogs client with io-ts runtime validation
- bottleneck 2.19.5 - Zero-dependency rate limiter with reservoir patterns
- TypeScript module augmentation (no package) - Extend discojs types

**Critical insight:** discojs brings io-ts + fp-ts as dependencies (~100KB minified combined), but this is server-side only. Client gets type safety at zero runtime cost via tRPC boundary validation.

**Rate limiting strategy:** In-memory Bottleneck is sufficient. Redis clustering unnecessary because VinylDeck is single-user per deployment with per-token rate limits.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Add Dependencies & Augmentation** - Install discojs + bottleneck, create type augmentation file
   - Addresses: Foundation for hybrid architecture
   - Avoids: No client bundle bloat (server-only packages)

2. **Create Rate Limiter** - Bottleneck instance configured for Discogs limits (60 req/min)
   - Addresses: Active rate limiting vs passive tracking
   - Avoids: 429 errors, API quota exhaustion

3. **Client Factory** - discojs client factory integrated with rate limiter
   - Addresses: Centralized client creation, rate limiter integration
   - Avoids: Scattered client instances, rate limit bypass

4. **Migrate tRPC Procedures** - One procedure at a time, starting with getIdentity
   - Addresses: Gradual migration, low risk
   - Avoids: Big-bang rewrite, OAuth breakage

5. **Cleanup** - Remove old passive rate limiter, remove manual type casts
   - Addresses: Code cleanliness, maintainability
   - Avoids: Dead code, confusion

**Phase ordering rationale:**

- Dependencies first (foundation)
- Rate limiter before client (client depends on limiter)
- Client factory before migration (migration uses factory)
- Migrate gradually (de-risk, easier rollback)
- Cleanup last (cosmetic, no functional impact)

**Research flags for phases:**

- Phase 4 (Migration): Likely needs deeper research per endpoint (io-ts codec discovery, response validation)
- Phases 1-3: Standard patterns, unlikely to need additional research

## Confidence Assessment

| Area                   | Confidence | Notes                                                           |
| ---------------------- | ---------- | --------------------------------------------------------------- |
| Stack (discojs)        | HIGH       | npm verified, GitHub docs reviewed, OAuth limitations confirmed |
| Stack (bottleneck)     | HIGH       | npm verified, 2.6M weekly downloads, zero deps confirmed        |
| Stack (augmentation)   | HIGH       | Official TypeScript docs, proven pattern                        |
| Integration            | HIGH       | VinylDeck codebase reviewed, tRPC patterns clear                |
| Bundle Impact          | HIGH       | Server-only usage verified, type-stripping confirmed            |
| Rate Limiting Strategy | HIGH       | Vercel serverless stateless nature verified, Redis unnecessary  |

## Gaps to Address

### Resolved During Research

- ✅ discojs OAuth capabilities (confirmed: can't do flow, only accepts tokens)
- ✅ Bottleneck Redis requirement (confirmed: optional, in-memory sufficient)
- ✅ Client bundle impact (confirmed: zero, server-only usage)
- ✅ io-ts dependency weight (confirmed: ~100KB, server-only)

### Open Questions for Phase-Specific Research

- **Phase 4 (Migration):** Which io-ts codecs map to which VinylDeck types? (needs per-endpoint investigation)
- **Phase 4 (Migration):** How to handle discojs pagination vs current implementation? (API response structure)
- **Phase 5 (Cleanup):** Can remove entire `src/api/rate-limiter.ts` or keep some header parsing? (depends on observability needs)

### Topics Needing Deeper Investigation

- **Module augmentation scope:** Research exact discojs type exports to augment (requires source code review)
- **Bottleneck event handling:** Best patterns for logging/observability in Vercel environment (may need Vercel Analytics integration)
- **Type import patterns:** Verify `import type` vs `import` for discojs types to ensure zero runtime cost (compile-time verification)

## Ready for Roadmap

Research complete. Stack additions are well-defined with clear versions, configuration, and integration points. Migration path is gradual and low-risk.

**Next steps:**

- Roadmap creator can structure phases based on migration path
- Phase 4 will trigger per-endpoint research (expected, acceptable)
- No blocking unknowns for initial phases

---

_Research Summary for: VinylDeck Hybrid Discogs API Architecture_
_Researched: 2026-02-03_

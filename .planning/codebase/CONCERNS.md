# Codebase Concerns

**Analysis Date:** 2026-01-29

## Large Components and Complex State Logic

**Auth Provider Size:**

- Issue: `src/providers/auth-provider.tsx` is 585 lines with deeply nested async validation logic. Handles token validation, profile fetching, offline mode, cross-tab sync, and cache clearing all in one component.
- Files: `src/providers/auth-provider.tsx`
- Impact: Difficult to test individual validation flows; adding new auth features compounds complexity; debugging cross-tab sync interactions requires reading entire file
- Fix approach: Extract validation logic into separate hook (`useTokenValidation.ts`); extract cache clearing to utility function; extract offline handling to separate hook

**Collection Hook Complexity:**

- Issue: `src/hooks/use-collection.ts` is 755 lines combining data fetching, filtering, sorting, search, pagination, and URL state sync
- Files: `src/hooks/use-collection.ts`
- Impact: Changes to any feature (adding filter, changing sort logic) require understanding entire data flow; hard to debug filter matching logic; pagination logic mixed with fetch logic
- Fix approach: Extract filtering logic to `useCollectionFilters.ts`; extract sort logic to `useCollectionSort.ts`; extract pagination to separate hook

**Sidebar Component Coupling:**

- Issue: `src/components/ui/sidebar.tsx` is 756 lines of heavily nested UI logic with cookie state management baked in (line 26: `SIDEBAR_COOKIE_NAME`)
- Files: `src/components/ui/sidebar.tsx`
- Impact: Third-party shadcn component deeply integrated; hard to update shadcn version; sidebar state logic not testable without DOM
- Fix approach: Extract cookie state logic to custom hook; create thin wrapper around shadcn sidebar

## State Management Fragmentation

**Inconsistent Cache Invalidation:**

- Issue: Collection sync detection uses `useSyncExternalStore` to watch query cache (line 51-79 in `src/hooks/use-collection-sync.ts`), but token validation clears entire cache via `queryClient.clear()` (line 159 in `src/providers/auth-provider.tsx`). Different paths, same outcome.
- Files: `src/hooks/use-collection-sync.ts`, `src/providers/auth-provider.tsx`
- Impact: If cache clearing logic needs to change (e.g., preserve some queries), must update multiple locations; risk of selective invalidation missing queries
- Fix approach: Centralize cache clearing strategy in a `useCacheManager()` hook; use consistent invalidation methods across auth provider

**Hydration Guard Timing:**

- Issue: `useHydrationGuard` gates collection query until IndexedDB hydration completes (line 211 in `src/hooks/use-collection.ts`), but metadata polling (collection-sync) doesn't use the guard and refetches immediately (line 31-46 in `src/hooks/use-collection-sync.ts`)
- Files: `src/hooks/use-collection.ts`, `src/hooks/use-collection-sync.ts`
- Impact: Metadata check may fire API request before IndexedDB cache is restored, causing unnecessary network traffic on hard reload; could mask newer data if hydration takes longer than metadata poll
- Fix approach: Apply `useHydrationGuard` to metadata query as well with shorter delay to avoid stale comparisons

## Error Handling Gaps

**Silent IndexedDB Failures:**

- Issue: `src/lib/query-persister.ts` catches all errors (lines 29-31, 36-38, 44-46) and silently continues. Users get cached data without knowing if persistence failed.
- Files: `src/lib/query-persister.ts`
- Impact: User may think data is persisted when it's only in memory; data lost on tab close if IndexedDB is unavailable (private browsing, quota exceeded); no visibility into storage problems
- Fix approach: Track persistence failures in a flag; expose in debug UI; log to console in development mode

**Incomplete Error Recovery in Token Validation:**

- Issue: When token validation fails with transient error (5xx, network), code trusts cached profile if available (lines 263-284 in `src/providers/auth-provider.tsx`). But metadata check still fires and may return stale count vs cached data.
- Files: `src/providers/auth-provider.tsx`, `src/hooks/use-collection-sync.ts`
- Impact: User may see "5 new items" banner even though API is failing; refresh button would fail silently or show cached data; confusing user experience during API outages
- Fix approach: Expose connection status to sync banner; disable metadata polling during known API failures; show "offline" state instead of potential mismatch

**Malformed Filter URL Handling:**

- Issue: `src/lib/url-state.ts` has regex validation for year range (line 19) but filters (genres, styles, labels) are parsed directly from URL via `params.getAll()` (line 9) with no sanitization
- Files: `src/lib/url-state.ts`, `src/hooks/use-collection.ts`
- Impact: Shared URL with malicious filter values (e.g., `/collection?genre=<script>`) would not be sanitized; filter displays would render user-controlled strings
- Fix approach: Validate filter values against known options in `CollectionFilterOptions`; reject unknown values; sanitize before URL generation

## Type Safety Issues

**Incomplete Discogs Type Casting:**

- Issue: `src/server/trpc/routers/discogs.ts` line 99 comments "Type cast required: @lionralfs/discogs-client types are incomplete"
- Files: `src/server/trpc/routers/discogs.ts`
- Impact: TypeScript type checking can't catch field additions/removals in Discogs API response; future API changes could break silently; runtime errors possible
- Fix approach: Generate types from Discogs OpenAPI spec; add runtime validation via Zod for critical response fields

**Loose Storage Key Constants:**

- Issue: Theme/language keys in `public/theme-init.js` (line 7: `'vinyldeck-theme'`) must match `src/lib/constants.ts` THEME.STORAGE_KEY and `next-themes` configuration
- Files: `public/theme-init.js`, `src/lib/constants.ts`, `src/providers/theme-provider.tsx`
- Impact: If storage key is updated in one place but not another, users get FOUC or lose preference; no compile-time check
- Fix approach: Generate `public/theme-init.js` from constants at build time, or use single source of truth with build injection

## Performance Concerns

**Batched Collection Fetching Inefficiency:**

- Issue: `src/hooks/use-collection.ts` lines 337-347 fetch remaining pages in batches of 3 sequentially. But after first page, total pages count is known; could queue all remaining in parallel with rate limiter.
- Files: `src/hooks/use-collection.ts`
- Impact: For 100-page collection, fetches take minutes instead of seconds; user waits longer for full data; synchronous batch loop blocks React rendering
- Fix approach: Use rate limiter to queue all remaining pages immediately; collect responses as they complete; update UI incrementally

**Filter Option Recomputation:**

- Issue: `src/hooks/use-collection.ts` lines 395-497 recomputes filter options from entire vinyl-only collection on every mount when filters change. Full Map iteration for 1000+ records.
- Files: `src/hooks/use-collection.ts`
- Impact: Every filter selection causes full re-sort of all release metadata; janky UI on large collections; Collection page gets sluggish after 500+ vinyls
- Fix approach: Pre-compute filter options server-side; cache aggressively; debounce filter updates

**Intl.NumberFormat Caching Strategy:**

- Issue: `src/routes/_authenticated/collection.tsx` lines 95-102 create new NumberFormat instances per locale/unit combination, cached in Map. But locale from i18n can change at runtime.
- Files: `src/routes/_authenticated/collection.tsx`
- Impact: If user changes language, old formatters still in cache; cache grows unbounded if units vary; number formatting may not reflect current locale
- Fix approach: Clear cache when i18n language changes; limit cache size; use `useMemo` dependency on `i18n.language`

**Collection Interval Polling:**

- Issue: `src/routes/_authenticated/collection.tsx` lines 77-84 set `setInterval` to update `now` every 30 seconds for relative time display, persists across page navigations
- Files: `src/routes/_authenticated/collection.tsx`
- Impact: Interval fires even when user is on Settings page or inactive tab; wastes CPU/battery; no cleanup if component unmounts before effect cleanup runs
- Fix approach: Use shorter debounce or stop polling when tab is not visible

## Security Considerations

**Cross-Origin Image Source Whitelist:**

- Issue: `vercel.json` CSP allows `img-src` from `discogs`, `gravatar`, `gravatar.com`, and `secure.gravatar.com` (line ~95 in vite.config.ts). But Discogs image URLs might change without notice.
- Files: `vite.config.ts`
- Impact: If attacker compromises Discogs or Gravatar CDN, could serve malicious content; no SRI for images; no framing protection on media
- Fix approach: Add SRI to image responses where possible; add `X-Frame-Options: DENY` for image responses; implement image proxy to validate before serving

**OAuth Token Exposure via URL:**

- Issue: OAuth request token is stored in sessionStorage (referenced in CLAUDE.md: `vinyldeck-oauth-request`), accessible via `window.sessionStorage`. If XSS occurs, tokens exposed.
- Files: Implicit in auth flow via `src/lib/oauth-session.ts`
- Impact: XSS vulnerability would leak OAuth request token; attacker could start OAuth flow on behalf of user; tokens stored in memory only (no protection)
- Fix approach: Use `httpOnly` cookie for request token instead of sessionStorage; store temporary tokens server-side with CSRF token; rotate token on each request

**Metadata Polling Leaks Username:**

- Issue: `src/hooks/use-collection-sync.ts` line 32-39 fires metadata query with `username` parameter even if user is offline. Query key includes username.
- Files: `src/hooks/use-collection-sync.ts`
- Impact: Even offline, could leak username in IndexedDB cache keys; if cache is inspected (e.g., via DevTools), user can identify cached profiles
- Fix approach: Use stable cache key that doesn't include username; fetch metadata requires online status first

## Testing Gaps

**No Unit Tests for Core Auth Logic:**

- Issue: Auth provider validation flow (token validation, profile fetch, cache clearing, offline handling) has no tests. Complex state machine with many edge cases.
- Files: `src/providers/auth-provider.tsx`
- Impact: Refactoring auth logic risky; edge cases like "token changed without disconnect" (line 114-126) not verified; cross-tab sync behavior untested
- Fix approach: Add unit tests for `validateTokens()`, `performAuthValidation()`, `clearAllCaches()` with mocked API responses; test offline state transitions

**No Tests for Collection Filtering:**

- Issue: Filter matching logic in `src/hooks/use-collection.ts` lines 525-580 has no coverage. Complex condition tree with multiple edge cases (empty filters, countries without data, year bounds).
- Files: `src/hooks/use-collection.ts`
- Impact: Adding new filter types risky; boundary conditions untested (e.g., year range spanning invalid years); regressions possible
- Fix approach: Snapshot test filter results with sample collection data; test edge cases explicitly

**Rate Limiter Not Fully Tested:**

- Issue: `src/api/rate-limiter.ts` has complex shared-promise logic (lines 172-191) but no tests for edge cases like concurrent requests approaching limit.
- Files: `src/api/rate-limiter.ts`
- Impact: Race conditions possible during burst requests; window reset timing might not work in practice; thundering herd not verified
- Fix approach: Add integration test with mock timers; test concurrent request scenarios

## Fragile Areas

**URL State Sync Breakage:**

- Issue: Collection route depends on URL params for filters (line 217-225 in `src/hooks/use-collection.ts` popstate handler). Browser back/forward must match state. Multiple points of updates: `updateSearchParams()` in multiple places, manual `window.history` calls.
- Files: `src/hooks/use-collection.ts`, `src/lib/url-state.ts`, `src/components/collection/collection-filters.tsx`
- Impact: Browser back button could miss state synchronization; page reload loses transient filter state if URL not updated; race conditions if multiple filter updates fire together
- Fix approach: Centralize URL state updates in single location; use TanStack Router's built-in search params instead of manual URL manipulation; test back/forward thoroughly

**Cache Persistence Race Condition:**

- Issue: `src/lib/query-persister.ts` async operations (`set()`, `get()`, `del()`) from idb-keyval have no ordering guarantees. Multiple writes could race.
- Files: `src/lib/query-persister.ts`
- Impact: If user logs in, fetches collection, then quickly logs out, IndexedDB might persist the new collection under old username; cache could corrupt
- Fix approach: Queue persistence operations; ensure restore completes before allowing mutations; add version number to cached objects

**Sidebar State Cookie Timing:**

- Issue: `src/components/ui/sidebar.tsx` uses cookie to persist sidebar state (line 26). Cookie read/write timing not coordinated with React hydration.
- Files: `src/components/ui/sidebar.tsx`
- Impact: During SSR/hydration, sidebar might collapse/expand due to timing mismatch; user sees layout shift
- Fix approach: Use same FOUC prevention strategy as theme; read sidebar state before React loads

## Dependencies at Risk

**@lionralfs/discogs-client Type Coverage:**

- Risk: Discogs client library has incomplete TypeScript types (acknowledged in code). If library is abandoned or stops updating types, maintainability suffers.
- Impact: Every new Discogs API response field requires manual type casting
- Migration plan: Switch to official Discogs API client if released; or maintain local type definitions with Zod validation

**idb-keyval Maintenance:**

- Risk: Small dependency with minimal maintenance history. If IndexedDB API changes or spec updates incompletibly, could break.
- Impact: Collection cache would fail silently; app would fall back to in-memory cache only
- Migration plan: Monitor IndexedDB compatibility; use Dexie.js as heavier but more maintained alternative if needed

## Missing Critical Features

**No Conflict Resolution for Offline Changes:**

- Issue: App supports offline view of cached collection but no way to sync local changes (e.g., adding to wishlist) offline.
- Files: All collection/sync related
- Impact: User expects offline functionality but can't modify anything offline; confusing UX
- Fix approach: Implement optimistic local cache updates; queue changes; merge on reconnect

**No Rate Limit Visibility to User:**

- Issue: Rate limiter tracks Discogs API limits internally but doesn't expose to UI or user notifications.
- Files: `src/api/rate-limiter.ts`
- Impact: User won't know why collection refresh is slow; no feedback during rate limit waits; could think app is broken
- Fix approach: Expose rate limit state in debug UI; show estimated wait time in banner; store limits in context for global access

**No Duplication Detection:**

- Issue: Collection display doesn't detect or highlight duplicate releases.
- Files: Collection components
- Impact: Users with duplicate entries (test pressing, reissues) can't identify them; unclear which are real duplicates vs different pressings
- Fix approach: Add Catno-based duplication detection; highlight variants; show count

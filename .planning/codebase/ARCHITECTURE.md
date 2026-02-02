# Architecture

**Analysis Date:** 2026-01-29

## Pattern Overview

**Overall:** Client-Server SPA with Offline-First PWA Capabilities

**Key Characteristics:**

- React 19 frontend with file-based routing (TanStack Router)
- Serverless backend via Vercel Functions (tRPC)
- OAuth 1.0a authentication with two-tier session management
- Optimistic authentication - immediate UI with background validation
- Offline-first PWA with IndexedDB persistence and service worker
- Hybrid state management: Zustand (auth/preferences) + TanStack Query (server state)

## Layers

**Presentation Layer:**

- Purpose: Render UI components, handle user interactions, manage view state
- Location: `src/routes/`, `src/components/`
- Contains: Route pages (TanStack Router), UI components (shadcn/ui), collection views, layout components
- Depends on: Hooks layer, providers, stores, tRPC client
- Used by: Browser/PWA runtime

**API/Service Layer:**

- Purpose: Type-safe RPC communication with server, rate limiting
- Location: `src/lib/trpc.ts`, `api/trpc/[trpc].ts`
- Contains: tRPC React client instantiation, batch link configuration, fetch request handler adapter
- Depends on: Server router (appRouter)
- Used by: Hooks, components, server procedures

**Server/Backend Layer:**

- Purpose: Handle OAuth flows, proxy authenticated Discogs API calls, enforce security
- Location: `src/server/trpc/`, `api/trpc/[trpc].ts`
- Contains: tRPC routers (oauth, discogs), Discogs client factory, error handling
- Depends on: @lionralfs/discogs-client, OAuth library, Zod validation
- Used by: tRPC client, Vercel Serverless Functions

**Persistence Layer:**

- Purpose: Cache server state and user preferences across sessions
- Location: `src/lib/query-persister.ts`, Zustand stores, service worker caches
- Contains: IndexedDB persister for TanStack Query, localStorage (Zustand + theme), browser Cache API (images/API responses)
- Depends on: TanStack Query, Zustand, vite-plugin-pwa
- Used by: Query provider, auth provider, service worker

**State Management Layer:**

- Purpose: Centralize application state
- Location: `src/stores/`, `src/providers/`, `src/hooks/`
- Contains: Zustand stores (auth, preferences), TanStack Query cache, React context providers
- Depends on: Storage layers, tRPC client
- Used by: Components, hooks, auth provider

## Data Flow

**Authentication Flow (OAuth 1.0a):**

1. User navigates to `/login`
2. Client calls `oauth.getRequestToken` → server generates request token with Consumer Secret
3. Server returns request token + authorization URL
4. Client redirects user to Discogs authorization page with request token
5. User authorizes, Discogs redirects to `oauth-callback` with verifier code
6. Client calls `oauth.getAccessToken(verifier)` → server exchanges for access token
7. Access token stored in Zustand auth store (localStorage)
8. Auth provider validates tokens and fetches user profile from `discogs.getIdentity`
9. Profile cached in TanStack Query (IndexedDB)
10. Session marked active, user redirected to `/collection`

**Collection Data Flow:**

1. `/collection` route mounts, `useCollection` hook initializes
2. Hook checks `useHydrationGuard` - waits for IndexedDB cache restore
3. Queries `discogs.getCollection` via tRPC (sends OAuth tokens in POST body)
4. Server creates Discogs client with tokens, calls Discogs API
5. Response cached in TanStack Query with default `staleTime: Infinity`
6. IndexedDB persister saves to browser storage
7. Components read from cache and render
8. On collection sync banner click, `refetch()` triggers fresh fetch
9. Rate limiter updates from response headers
10. If offline: reads from IndexedDB cache (survives page refresh)

**Offline Handling:**

1. Service worker intercepts API requests with NetworkFirst strategy (1-hour cache)
2. When offline, cached responses served if available
3. On app startup offline:
   - Zustand hydrates tokens from localStorage synchronously
   - Auth provider waits for IndexedDB hydration (`isRestoring`)
   - If cached profile exists: authenticate immediately (show collection)
   - If no cached profile: throw `OfflineNoCacheError`, show "Welcome back" flow
4. When coming back online: background validation re-checks tokens (doesn't show loader)

**Cross-Tab Sync:**

1. User disconnects in tab A
2. Auth provider calls `disconnectStore()` which clears Zustand state
3. Zustand persist middleware fires storage event
4. `useCrossTabAuthSync` hook in tab B detects event
5. Tab B clears TanStack Query cache, browser Cache API, disconnects user

**State Management:**

- **Zustand Stores** (localStorage): OAuth tokens, session active flag, user preferences (view mode, gravatar email)
- **TanStack Query** (IndexedDB): User profile, collection releases - default `staleTime: Infinity` (manual refresh)
- **React Context**: Auth state (isAuthenticated, isLoading, isOnline), hydration status
- **URL State**: Collection filters (genre, style, label, type, size, country, year) - enables shareable filtered views and back/forward navigation
- **Session Storage**: Temporary OAuth request token, post-login redirect URL

## Key Abstractions

**Authentication Context (`src/providers/auth-provider.tsx`):**

- Purpose: Orchestrate OAuth token validation, session management, offline-first behavior
- Examples: `validateTokens()`, `establishSession()`, `validateTokensInBackground()`
- Pattern: Complex state machine with optimistic auth - immediate UI before validation completes

**useCollection Hook (`src/hooks/use-collection.ts`):**

- Purpose: Unified API for collection querying, filtering, sorting, pagination
- Examples: Manages genres, styles, labels, vinyl types/sizes filters; client-side random sort; URL state sync
- Pattern: Coordinates TanStack Query with filter logic, memoized computations for performance

**tRPC Routers (`src/server/trpc/routers/`):**

- Purpose: Type-safe procedures for OAuth and Discogs operations
- Examples: `oauth.getRequestToken`, `oauth.getAccessToken`, `discogs.getIdentity`, `discogs.getCollection`
- Pattern: Input validation with Zod, error handling via `handleDiscogsError`, rate limiter updates

**Query Persister (`src/lib/query-persister.ts`):**

- Purpose: Serialize/deserialize TanStack Query cache to/from IndexedDB
- Examples: Saves collection and profile queries across sessions
- Pattern: IDBPersister plugin - survives page refresh and offline access

**Rate Limiter (`src/api/rate-limiter.ts`):**

- Purpose: Track Discogs API rate limits (60 req/min) from response headers
- Examples: Updates from query response headers, prevents thundering herd with shared wait promises
- Pattern: Moving window algorithm, exported singleton instance

**Redirect Utilities (`src/lib/redirect-utils.ts`):**

- Purpose: Validate redirects to prevent open redirect attacks
- Examples: `isValidRedirectUrl()` checks protocol/path, blocks external redirects
- Pattern: Security-first validation using URL constructors

## Entry Points

**Vercel Serverless Function (`api/trpc/[trpc].ts`):**

- Location: `api/trpc/[trpc].ts`
- Triggers: HTTP requests to `/api/trpc/*`
- Responsibilities: Convert Vercel request to Web Request, invoke tRPC handler, convert response back

**Root Route (`src/routes/__root.tsx`):**

- Location: `src/routes/__root.tsx`
- Triggers: App startup
- Responsibilities: Establish global providers, render error boundary, toaster, speed insights

**Index Route (`src/routes/index.tsx`):**

- Location: `src/routes/index.tsx`
- Triggers: Navigation to `/`
- Responsibilities: Redirect authenticated users to `/collection`, unauthenticated to `/login` after loading completes

**App Bootstrap (`src/main.tsx`):**

- Location: `src/main.tsx`
- Triggers: Vite entry point
- Responsibilities: Mount React app with all providers (theme, i18n, query, tRPC, auth, hydration, preferences)

## Error Handling

**Strategy:** Layered approach with custom error types and error boundaries

**Patterns:**

1. **Auth Errors (401/403):**
   - Caught in `auth-provider.tsx` `validateTokens()` or `performAuthValidation()`
   - Disconnects user, clears all caches, throws error
   - In background validation mode, silently ignores transient errors

2. **Transient Errors (5xx, network):**
   - Caught but not retried automatically (except on offline→online transition)
   - If offline with cached profile: use cached data, ignore error
   - If online: keep authenticated, show error toast

3. **Offline Errors:**
   - No network: service worker serves cached responses if available
   - Online but no cached data: throw `OfflineNoCacheError`, trigger "Welcome back" flow

4. **Component-Level:**
   - `AppErrorBoundary` catches render errors
   - TanStack Query `isError` flag used to show fallback UI
   - tRPC error codes checked with `isAuthError()`, `isNonRetryableError()`

5. **Discogs API Errors:**
   - Handled via `handleDiscogsError()` in `src/server/trpc/error-utils.ts`
   - Maps Discogs errors to tRPC errors (UNAUTHORIZED, FORBIDDEN, etc.)

## Cross-Cutting Concerns

**Logging:** Console warnings for transient token validation failures, profile fetch fallbacks. Production errors handled by Vercel error tracking.

**Validation:**

- Zod schemas on all tRPC procedures (`src/server/trpc/routers/`)
- Redirect URL validation with protocol/origin checks
- OAuth callback URL allowlist validation
- URL search params parsing/validation via `src/lib/url-state.ts`

**Authentication:**

- OAuth 1.0a via `@lionralfs/discogs-client`
- Tokens sent in request body (POST with methodOverride: 'POST')
- Consumer Secret never exposed to client (server-side only)
- Two-tier: sessionActive flag controls "welcome back" flow

**Security:**

- CSP headers restrict scripts, whitelist Discogs/Gravatar images
- Cross-tab sync prevents stale sessions
- Redirect validation blocks open redirect attacks
- Rate limiting prevents API abuse
- Tokens excluded from query keys (won't persist in IndexedDB)

**Performance:**

- Chunked collection fetching: batch size 3 pages per request
- Memoized filter options recalculated only when releases change
- Client-side sorting (genre, random) fetches all pages upfront
- Placeholder data keeps previous collection visible during refetch
- Image caching: 30-day CacheFirst for Discogs/Gravatar images

---

_Architecture analysis: 2026-01-29_

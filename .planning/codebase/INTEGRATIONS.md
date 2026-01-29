# External Integrations

**Analysis Date:** 2026-01-29

## APIs & External Services

**Discogs:**

- Purpose: Vinyl record collection data, user authentication, profile information
- OAuth 1.0a authentication for accessing private user data
- SDK/Client: `@lionralfs/discogs-client` (v4.1.4)
- Endpoints:
  - `/oauth/request_token` - OAuth flow step 1
  - `/oauth/authorize` - User authorization redirect
  - `/oauth/access_token` - OAuth flow step 2
  - `/users/{username}/collection/folders/{folder_id}/releases` - Fetch collection
  - `/users/{username}/profile` - Get user profile (avatar, email)
  - `/user/identity` - Validate authenticated user
- Rate Limiting: 60 requests/minute for authenticated requests (tracked via X-Discogs-Ratelimit headers)
- User Agent: `VinylDeck/{APP_VERSION}` sent with all requests
- Implements rate limiter in `src/api/rate-limiter.ts` with moving window tracking

**Gravatar:**

- Purpose: Optional user avatar provider as alternative to Discogs avatars
- API: Gravatar API v1 using MD5-hashed email addresses
- Endpoints:
  - `https://www.gravatar.com/avatar/{email_hash}` - Avatar image (CacheFirst strategy, 30-day cache)
  - `https://secure.gravatar.com/avatar/{email_hash}` - HTTPS variant
- Implementation: `src/lib/gravatar.ts` builds URLs, `src/providers/preferences-provider.tsx` manages email preference
- Storage: Email stored in preferences-store with localStorage persistence
- Caching: Browser Cache API with 30-day TTL for avatar images

**Vercel Analytics:**

- Service: @vercel/speed-insights
- Purpose: Web performance monitoring and Core Web Vitals tracking
- Implementation: Integrated in production builds only

## Data Storage

**Databases:**

- Not applicable - This is a client-side Discogs browser with no backend database

**File Storage:**

- Local only: Images cached in Browser Cache API via service worker
- No cloud file storage integration

**Client-Side Storage:**

| Storage Type          | Location       | Contents                                        | Size Limit      | Persistence     |
| --------------------- | -------------- | ----------------------------------------------- | --------------- | --------------- |
| **localStorage**      | Browser        | Auth tokens, preferences, theme, language       | ~5MB            | Across sessions |
| **sessionStorage**    | Browser        | OAuth request state, post-login redirect URLs   | ~5MB            | Session only    |
| **IndexedDB**         | Browser        | TanStack Query cache (collection, profile data) | Quota-dependent | Across sessions |
| **Browser Cache API** | Service Worker | Discogs/Gravatar images, API responses          | Quota-dependent | Across sessions |

**Caching:**

| Cache Name            | Strategy     | Content                                            | TTL     | Max Entries |
| --------------------- | ------------ | -------------------------------------------------- | ------- | ----------- |
| discogs-api-cache     | NetworkFirst | `/api.discogs.com/*` responses                     | 1 hour  | 100         |
| discogs-images-cache  | CacheFirst   | `/i.discogs.com/*` and `/img.discogs.com/*` images | 30 days | 500         |
| gravatar-images-cache | CacheFirst   | `/gravatar.com/avatar/*` images                    | 30 days | 200         |

Cache names defined in `src/lib/constants.ts` (`CACHE_NAMES`) and configured in `vite.config.ts` service worker rules.

## Authentication & Identity

**Auth Provider:**

- Discogs OAuth 1.0a
- No alternative auth methods (Discogs-only)

**Implementation:**

- Location: `src/server/trpc/routers/oauth.ts` (server-side for secret security)
- Consumer Key: `VITE_DISCOGS_CONSUMER_KEY` (exposed to client)
- Consumer Secret: `DISCOGS_CONSUMER_SECRET` (server-side only, never exposed)
- Flow:
  1. Client calls `oauth.getRequestToken` with callback URL
  2. Client redirects user to Discogs authorization
  3. Discogs redirects back with verifier code
  4. Client calls `oauth.getAccessToken` with verifier
  5. Tokens stored in Zustand `auth-store` with localStorage persistence

**Token Storage:**

- OAuth tokens stored in Zustand store (`src/stores/auth-store.ts`)
- Persisted to localStorage key: `vinyldeck-auth`
- Contains: `accessToken`, `accessTokenSecret`, `sessionActive` flag
- Encrypted: No - relies on same-origin policy and HTTPOnly not applicable for localStorage

**Session Management:**

- `sessionActive` flag in auth store distinguishes between "signed in" and "welcome back" states
- Sign Out: Clears session flag, keeps tokens (enables "welcome back" flow)
- Disconnect: Clears tokens and session flag, clears all caches
- Cross-tab sync: Uses Zustand storage events to propagate logout/disconnect across tabs

**Offline Support:**

- With cached profile: Authenticate immediately using cached data
- Without cached profile: `OfflineNoCacheError` thrown (`src/lib/errors.ts`), shows "Welcome back" flow

## Monitoring & Observability

**Error Tracking:**

- None implemented - Error handling delegated to application-level error handling

**Logs:**

- console.log/warn/error only (no external service)
- Client-side errors not centrally tracked

## CI/CD & Deployment

**Hosting:**

- Vercel (serverless platform)
- Automatic deployments via release-please on `main` branch

**CI Pipeline:**

- GitHub Actions via Vercel (automatically runs on PR and merge)
- Vercel ignore script: `scripts/vercel-ignore-build.sh` (skips build on non-main branches)
- Preview deployments on every PR

**Deployment Strategy:**

- Preview builds: All PR branches (via Vercel auto-deploy)
- Production builds: Only on release-please merge to `main`
- API: Vercel Serverless Functions (`api/trpc/[trpc].ts`)
- Frontend: Static SPA served by Vercel CDN

## Environment Configuration

**Required Environment Variables:**

| Variable                    | Side   | Required | Purpose                                                                       |
| --------------------------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `VITE_DISCOGS_CONSUMER_KEY` | Client | Yes      | Discogs OAuth consumer key (exposed via Vite)                                 |
| `DISCOGS_CONSUMER_SECRET`   | Server | Yes      | Discogs OAuth consumer secret (never exposed)                                 |
| `ALLOWED_CALLBACK_ORIGINS`  | Server | No       | Comma-separated OAuth callback origins (defaults to localhost and VERCEL_URL) |
| `VERCEL_URL`                | Server | Auto-set | Vercel deployment URL (auto-populated in Vercel)                              |

**Development Setup:**

- Copy `.env.example` to `.env`
- Create separate Discogs OAuth apps at https://www.discogs.com/settings/developers for local and production
- Configure `VITE_DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET`

**Secrets Location:**

- Production: Vercel Environment Variables (encrypted in Vercel dashboard)
- Development: `.env` file (git-ignored)
- Never committed to repository

## Webhooks & Callbacks

**Incoming:**

- OAuth callback: Discogs redirects to app after user authorization
- Callback URL validation: `src/server/trpc/routers/oauth.ts` validates origin against allowlist to prevent open redirect attacks
- Allowed origins: Configurable via `ALLOWED_CALLBACK_ORIGINS` or default to localhost/VERCEL_URL

**Outgoing:**

- None - VinylDeck is read-only for Discogs data (does not write/modify collections)

## API Communication

**tRPC Procedures:**

| Router    | Procedure               | Type     | Purpose                                            |
| --------- | ----------------------- | -------- | -------------------------------------------------- |
| `oauth`   | `getRequestToken`       | Mutation | Get OAuth request token and authorization URL      |
| `oauth`   | `getAccessToken`        | Mutation | Exchange request token + verifier for access token |
| `discogs` | `getIdentity`           | Query    | Validate tokens and get authenticated user info    |
| `discogs` | `getCollection`         | Query    | Fetch user's collection with pagination/sorting    |
| `discogs` | `getUserProfile`        | Query    | Get user profile (avatar, email, collection count) |
| `discogs` | `getCollectionMetadata` | Query    | Get only collection count for change detection     |

**Request Method:**

- All requests sent as POST (even queries) via `methodOverride: 'POST'` in `src/lib/trpc.ts`
- Reason: OAuth tokens in request body instead of URL to prevent token leakage in logs/referrer headers

**Error Handling:**

- Centralized in `src/server/trpc/error-utils.ts` with `handleDiscogsError`
- Distinguishes between auth errors (401/403 → disconnect) and transient errors (5xx → retry)
- Auth errors trigger Zustand store clear and UI redirect to login

## Rate Limiting Implementation

**Rate Limiter:** `src/api/rate-limiter.ts`

- Tracks rate limit headers from Discogs responses (X-Discogs-Ratelimit-\*)
- Moving window strategy over 60-second window
- Prevents thundering herd with shared wait promises
- When remaining < 5 requests: Client-side wait mechanism prevents additional requests

---

_Integration audit: 2026-01-29_

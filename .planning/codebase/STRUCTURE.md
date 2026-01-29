# Codebase Structure

**Analysis Date:** 2026-01-29

## Directory Layout

```
VinylDeck/
├── api/                        # Vercel Serverless Functions
│   └── trpc/
│       └── [trpc].ts          # tRPC request handler
├── src/
│   ├── components/            # React UI components
│   │   ├── ui/               # shadcn/ui components (generated)
│   │   ├── layout/           # Header, sidebar, layout components
│   │   ├── collection/       # Collection view components
│   │   └── error-boundary.tsx
│   ├── hooks/                # Custom React hooks
│   ├── providers/            # React providers and contexts
│   ├── routes/               # TanStack Router file-based routes
│   ├── server/               # Backend code (tRPC routers, Discogs client)
│   │   └── trpc/
│   │       ├── routers/      # OAuth, Discogs routers
│   │       └── init.ts       # tRPC initialization
│   ├── stores/               # Zustand state stores
│   ├── types/                # TypeScript type definitions
│   ├── lib/                  # Utilities and helpers
│   ├── locales/              # i18next translation files
│   ├── api/                  # Client API utilities
│   ├── main.tsx             # App entry point
│   ├── index.css            # Global styles + Tailwind
│   └── vite-env.d.ts        # Vite environment types
├── public/                   # Static assets (icons, manifest)
├── .github/workflows/        # CI/CD pipelines
├── .planning/codebase/       # GSD planning documents
├── vite.config.ts           # Vite build config
├── tsconfig.app.json        # TypeScript config (app)
├── tsconfig.server.json     # TypeScript config (server)
├── vercel.json              # Vercel deployment config
├── eslint.config.js         # ESLint config
└── package.json             # Dependencies, scripts
```

## Directory Purposes

**`api/trpc/`:**

- Purpose: Vercel Serverless Function handler for tRPC requests
- Contains: `[trpc].ts` - converts Vercel request to Web Request, invokes tRPC handler
- Key files: `api/trpc/[trpc].ts`

**`src/components/ui/`:**

- Purpose: shadcn/ui components for consistent design system
- Contains: Button, Input, Dialog, Sheet, Select, Checkbox, etc.
- Key files: All are generated via `bunx shadcn add <component>`

**`src/components/layout/`:**

- Purpose: App-wide layout components
- Contains: Brand mark, sidebar, navigation, toggles, gradients
- Key files: `brand-mark.tsx`, layout wrappers

**`src/components/collection/`:**

- Purpose: Collection view-specific components
- Contains: Vinyl card, grid/table layouts, filters, sync banner, skeletons
- Key files: `vinyl-grid.tsx`, `vinyl-card.tsx`, `collection-sync-banner.tsx`, `view-toggle.tsx`

**`src/hooks/`:**

- Purpose: Custom React hooks for business logic
- Contains: Authentication, collection, user profile, preferences, online status, hydration
- Key files:
  - `use-auth.ts` - Auth context consumer
  - `use-collection.ts` - Collection query + filtering
  - `use-user-profile.ts` - User profile query
  - `use-online-status.ts` - Network status tracking
  - `use-hydration-guard.ts` - IndexedDB hydration wait
  - `use-cross-tab-auth-sync.ts` - Cross-tab sync listener

**`src/providers/`:**

- Purpose: React context providers that wrap the app
- Contains: Auth, theme, query, tRPC, i18n, hydration, preferences
- Key files:
  - `auth-provider.tsx` - OAuth token validation, session management
  - `query-provider.tsx` - TanStack Query setup with IndexedDB persistence
  - `theme-provider.tsx` - next-themes dark mode
  - `i18n-provider.tsx` - i18next initialization
  - `hydration-provider.tsx` - IndexedDB restoration tracking

**`src/routes/`:**

- Purpose: TanStack Router file-based routes
- Contains: Page components for each route
- Key files:
  - `__root.tsx` - Root layout
  - `index.tsx` - Redirect logic based on auth state
  - `login.tsx` - Discogs OAuth flow
  - `oauth-callback.tsx` - OAuth verifier handling
  - `_authenticated.tsx` - Auth guard layout
  - `_authenticated/collection.tsx` - Collection view page
  - `_authenticated/settings.tsx` - User settings page

**`src/server/trpc/`:**

- Purpose: Backend tRPC router definitions
- Contains: OAuth and Discogs API procedures
- Key files:
  - `init.ts` - tRPC instance setup
  - `routers/oauth.ts` - getRequestToken, getAccessToken procedures
  - `routers/discogs.ts` - getIdentity, getCollection procedures
  - `error-utils.ts` - Error handling utilities
  - `../discogs-client.ts` - Discogs client factory with OAuth signing

**`src/stores/`:**

- Purpose: Zustand state stores with localStorage persistence
- Contains: Auth tokens and session, user preferences
- Key files:
  - `auth-store.ts` - OAuth tokens, sessionActive flag, signOut/disconnect actions
  - `preferences-store.ts` - View mode, avatar source, gravatar email

**`src/lib/`:**

- Purpose: Shared utilities and constants
- Contains:
  - `trpc.ts` - tRPC React client instance and setup
  - `errors.ts` - Custom error types (OfflineNoCacheError, isAuthError)
  - `constants.ts` - App constants (collections names, cache names, API limits)
  - `url-state.ts` - Collection filter URL parameter parsing
  - `storage-keys.ts` - localStorage key constants
  - `redirect-utils.ts` - Redirect validation utilities
  - `query-persister.ts` - IndexedDB persister for TanStack Query
  - `cross-tab-sync.ts` - Cross-tab event coordination
  - `oauth-session.ts` - OAuth request token session management
  - `gravatar.ts` - Gravatar URL generation
  - `utils.ts` - General utilities (cn, formatters)
  - `formatters.ts` - Data formatting functions

**`src/api/`:**

- Purpose: Discogs API client utilities
- Contains:
  - `discogs.ts` - Vinyl format detection, API utilities
  - `rate-limiter.ts` - Discogs rate limit tracking (60 req/min)

**`src/types/`:**

- Purpose: Shared TypeScript types
- Key files:
  - `discogs.ts` - Discogs API types (Release, Collection, Pagination)
  - `preferences.ts` - User preference types

**`src/locales/`:**

- Purpose: i18next translation files by language
- Contains: `en/` and `no/` subdirectories with JSON translation files

## Key File Locations

**Entry Points:**

- `src/main.tsx` - React app bootstrap with providers
- `src/routes/__root.tsx` - Root layout and error boundary
- `api/trpc/[trpc].ts` - Vercel Serverless Function handler
- `vite.config.ts` - Vite dev server and build config

**Configuration:**

- `tsconfig.app.json` - TypeScript compiler options (app)
- `tsconfig.server.json` - TypeScript compiler options (server)
- `vite.config.ts` - Vite bundler, Tailwind, PWA plugin config
- `vercel.json` - Vercel deployment settings, CSP headers
- `eslint.config.js` - ESLint rules and plugins

**Core Business Logic:**

- `src/providers/auth-provider.tsx` - Authentication orchestration
- `src/hooks/use-collection.ts` - Collection filtering and sorting
- `src/server/trpc/routers/oauth.ts` - OAuth token exchange
- `src/server/trpc/routers/discogs.ts` - Discogs API proxying

**State Management:**

- `src/stores/auth-store.ts` - OAuth tokens + session persistence
- `src/stores/preferences-store.ts` - User preferences persistence
- `src/providers/query-provider.tsx` - TanStack Query with IndexedDB

**Testing:**

- `src/components/error-boundary.tsx` - Error boundary component
- `src/lib/errors.ts` - Error type definitions and checkers

## Naming Conventions

**Files:**

- Components: `PascalCase.tsx` (e.g., `VinylCard.tsx`, `CollectionSyncBanner.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-auth.ts`, `use-collection-sync.ts`)
- Utilities: `kebab-case.ts` (e.g., `redirect-utils.ts`, `query-persister.ts`)
- Types: Included inline in component/hook files or in `src/types/`
- Routes: File-based routing uses TanStack Router conventions:
  - `__root.tsx` - Root layout
  - `_authenticated.tsx` - Auth guard prefix
  - `_authenticated/collection.tsx` - Nested route

**Directories:**

- Feature directories: `kebab-case` (e.g., `layout`, `collection`)
- Index pattern: Barrel files (`index.ts`) NOT used; import directly from files
- Nested providers: Grouped in `src/providers/`

## Where to Add New Code

**New Feature (e.g., wishlist):**

- Primary code: `src/routes/_authenticated/wishlist.tsx` (new route file)
- Hook for data: `src/hooks/use-wishlist.ts`
- Components: `src/components/wishlist/` (new subdirectory)
- Tests: Co-located with component files (`.test.tsx` files)
- Server procedure: `src/server/trpc/routers/discogs.ts` (add new procedure)

**New Component/Module:**

- Implementation: `src/components/` or `src/components/<feature>/`
- If shadcn: Use `bunx shadcn add <component-name>`
- If custom: Create `.tsx` file directly

**Utilities:**

- Shared helpers: `src/lib/` (e.g., `src/lib/my-utility.ts`)
- Feature-specific: Co-locate in feature folder if only used there
- Constants: `src/lib/constants.ts` or `src/api/` for API constants

**Server Procedures:**

- OAuth: `src/server/trpc/routers/oauth.ts`
- Discogs API: `src/server/trpc/routers/discogs.ts`
- New domain: Create new file in `src/server/trpc/routers/`

**Tests:**

- Unit tests: Same directory as source (e.g., `src/lib/my-utility.test.ts`)
- Integration tests: Separate `tests/` directory if needed

## Special Directories

**`public/`:**

- Purpose: Static assets served at root
- Generated: No
- Committed: Yes
- Contains: App icons, manifest files

**`.vercel/output/`:**

- Purpose: Vercel build output (production bundles, function handlers)
- Generated: Yes (from `vercel build`)
- Committed: No (.gitignore)

**`dist/`:**

- Purpose: Vite production bundle output
- Generated: Yes (from `bun run build`)
- Committed: No (.gitignore)

**`node_modules/`:**

- Purpose: Installed dependencies (Bun)
- Generated: Yes (from `bun install`)
- Committed: No (.gitignore)

**`.planning/codebase/`:**

- Purpose: GSD analysis documents
- Generated: No (created manually by agents)
- Committed: Yes (for team reference)

**`src/routeTree.gen.ts`:**

- Purpose: Auto-generated route tree from TanStack Router
- Generated: Yes (from `vite` dev server or build)
- Committed: Yes (for type safety)

---

_Structure analysis: 2026-01-29_

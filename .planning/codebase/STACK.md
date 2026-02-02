# Technology Stack

**Analysis Date:** 2026-01-29

## Languages

**Primary:**

- TypeScript 5.9 - Type-safe development for frontend, server, and serverless functions
- JavaScript (React 19) - UI component framework

**Secondary:**

- Bash - Development and build scripts

## Runtime

**Environment:**

- Node.js (via Bun) - Development and API execution

**Package Manager:**

- Bun 1.x - Fast JavaScript runtime and package manager
- Lockfile: `bun.lock` (present)

## Frameworks

**Core:**

- React 19 with React Compiler - UI framework with babel-plugin-react-compiler for optimizations
- Vite 7 - Build tool and dev server with HMR
- TanStack Router 1.150 - File-based routing in `src/routes/`

**State Management:**

- Zustand 5.0 - Client state for auth tokens and preferences (localStorage)
- TanStack Query 5.90 - Server state with IndexedDB persistence via @tanstack/react-query-persist-client
- next-themes 0.4 - Theme provider with FOUC prevention

**API/Backend:**

- tRPC 11.8 - Type-safe RPC framework (@trpc/client, @trpc/react-query, @trpc/server)
- Hono 4.11 - Lightweight web framework for dev API server
- @hono/node-server 1.19 - Node.js adapter for Hono

**Styling & Components:**

- Tailwind CSS 4.1 via @tailwindcss/vite - Utility-first CSS framework with bundler integration
- shadcn/ui (new-york style) - Accessible component library built on Radix UI
- Radix UI 1.x - Unstyled accessible components (@radix-ui/\*)
- Lucide React 0.563 - SVG icon library
- Motion 12.26 - Animation library

**Internationalization:**

- i18next 25.7 - Translation framework
- react-i18next 16.5 - React binding for i18next

**Progressive Web App (PWA):**

- vite-plugin-pwa 1.2 - PWA manifest and service worker generation
- workbox-window 7.4 - Service worker communication library

**Form & Validation:**

- Zod 4.3 - TypeScript-first schema validation

**Utilities:**

- clsx 2.1 - Conditional class names
- tailwind-merge 3.4 - Merge Tailwind classes intelligently
- class-variance-authority 0.7 - Component variant API
- idb-keyval 6.2 - Simple IndexedDB abstraction for cache persistence
- blueimp-md5 2.19 - MD5 hashing for Gravatar avatar URLs
- country-flag-icons 1.6 - Country flag emoji data

**Analytics:**

- @vercel/speed-insights 1.3 - Performance monitoring

**Discogs API Client:**

- @lionralfs/discogs-client 4.1 - OAuth 1.0a authentication and API communication

## Testing & Quality

**Build & Verification:**

- TypeScript (tsc -b) - Multi-project build with incremental compilation
- ESLint 9.39 - Linting with flat config mode
- Prettier 3.8 - Code formatting

**Linting Plugins:**

- @eslint/js
- eslint-plugin-react 7.37
- eslint-plugin-react-hooks 7.0
- eslint-plugin-react-refresh 0.4
- eslint-plugin-jsx-a11y 6.10 - Accessibility rules
- eslint-plugin-i18next 6.1 - i18n best practices
- eslint-plugin-import-x 4.16 - Module import validation
- typescript-eslint 8.46 - TypeScript linting

**Build Plugins:**

- @vitejs/plugin-react 5.1 - React Fast Refresh for Vite
- @tanstack/router-plugin 1.150 - Auto-generate route types from file structure

**Development:**

- concurrently 9.2 - Run parallel tasks (Vite + dev API server)
- lint-staged 16.2 - Run linters on staged files
- Husky 9.1 - Git hooks for pre-commit linting

## Key Dependencies

**Critical:**

- @lionralfs/discogs-client - OAuth 1.0a client required for Discogs API integration
- @tanstack/react-query - Server state management (queries must persist across page refreshes for offline support)
- Zustand - Client state for auth tokens and preferences (must be persistent)
- tRPC - Type-safe API communication between frontend and serverless functions

**Infrastructure:**

- @vercel/node 5.5 - Vercel Serverless Function runtime type definitions
- @vercel/speed-insights - Performance metrics in production
- idb-keyval - Persistent IndexedDB storage for query cache (avoids 5MB localStorage limit)

## Configuration

**Environment:**

- `.env.example` - Template for required environment variables
- Environment variables:
  - `DISCOGS_CONSUMER_KEY` (client-side via `VITE_` prefix)
  - `DISCOGS_CONSUMER_SECRET` (server-side only)
  - `ALLOWED_CALLBACK_ORIGINS` (optional, defaults to localhost and VERCEL_URL)

**Build:**

- `tsconfig.json` - Base TypeScript configuration with path aliases
- `tsconfig.app.json` - Frontend app build settings (ES2022, DOM APIs, bundler mode)
- `tsconfig.server.json` - Server-side build settings (api/_, src/server/_, scripts/dev-server.ts)
- `vite.config.ts` - Vite build configuration with React, Tailwind, Router, and PWA plugins
- `vercel.json` - Serverless function rewrites and CSP headers

**Code Quality:**

- `.eslintrc.cjs` - Empty workaround for import-x plugin compatibility (actual config in eslint.config.js)
- `.prettierrc` - Prettier configuration (single quotes, no semicolons, Tailwind class sorting)
- `components.json` - shadcn/ui component configuration

## Platform Requirements

**Development:**

- Bun 1.x
- Node.js 18+ (for TypeScript compilation and build tools)
- TypeScript 5.9

**Production:**

- Vercel Serverless Functions for tRPC API endpoints (`api/trpc/[trpc].ts`)
- Vite build output (static SPA with index.html fallback for client routing)
- Browser with:
  - ES2022 JavaScript support
  - Service Worker API (for PWA/offline support)
  - IndexedDB (for query cache persistence)
  - localStorage (for auth tokens and preferences)

## Build & Deployment

**Development Commands:**

- `bun dev` - Start Vite dev server (port 5173) + API server (port 3001) concurrently
- `bun run dev:vite` - Vite only
- `bun run dev:api` - API server only (Hono on port 3001)

**Build:**

- `bun run build` - TypeScript compile check + Vite production build
- Output: `dist/` directory with static assets + service worker

**Preview:**

- `bun run preview` - Preview production build locally
- `bun run preview:offline` - Build + preview with local API server for PWA testing

**Verification (Before Pushing):**

- `vercel build` - Test full Vercel build locally (catches TypeScript errors unique to serverless compiler)

---

_Stack analysis: 2026-01-29_

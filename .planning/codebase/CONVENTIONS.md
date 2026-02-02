# Coding Conventions

**Analysis Date:** 2026-01-29

## Naming Patterns

**Files:**

- Kebab-case for all files: `use-online-status.ts`, `auth-store.ts`, `vinyl-card.tsx`
- Descriptive suffixes for utility: `-store.ts` for Zustand stores, `-utils.ts` for helpers, `-context.ts` for React Context
- Component files named after their primary export: `error-boundary.tsx` exports `AppErrorBoundary`

**Functions:**

- camelCase for all functions: `useOnlineStatus()`, `fetchProfile()`, `setTokens()`
- Hooks follow React convention: `useX()` prefix required
- Handler functions use `handle` prefix: `handleOnline()`, `handleReset()`
- Selectors/getters can use verb prefixes: `getTRPCErrorCode()`

**Variables:**

- camelCase for local variables and state: `authTokens`, `sessionActive`, `isOnline`
- UPPER_SNAKE_CASE for constants: `USER_PROFILE_QUERY_KEY`, `STORAGE_KEYS`, `CACHE_NAMES`
- Boolean variables prefixed with `is` or `has`: `isAuthenticated`, `hasHydrated`, `hasError`
- Ref variables suffixed with `Ref`: `prevTokensRef`, `isOnlineRef`, `latestGravatarEmailRef`

**Types:**

- PascalCase for all types/interfaces: `AuthTokens`, `AuthStore`, `ErrorBoundaryProps`
- Suffix with `-Props` for component prop interfaces: `AuthProviderProps`, `VinylCardProps`
- Suffix with `-State` for state shape interfaces: `ErrorBoundaryState`, `AuthState`
- Readonly arrays in const data: `Array<{ keywords: string[], styles: { bg: string; ... } }>`

## Code Style

**Formatting:**

- Tool: Prettier 3.8.0
- Single quotes (no double quotes)
- No semicolons
- No trailing commas
- Tailwind classes auto-sorted via `prettier-plugin-tailwindcss`

**Linting:**

- Tool: ESLint with TypeScript 8.46.4
- Config: `eslint.config.js` (ESLint flat config)
- strictTypeChecked mode enabled for TypeScript checking
- Import ordering enforced: builtin → external → internal → parent → sibling → index → object → type

**ESLint Disable Directives:**
Always provide reasoning with `-- reason` syntax:

```typescript
// eslint-disable-next-line react/no-array-index-key -- Skeleton items have no stable ID
<VinylCardSkeleton key={`skeleton-${i}`} />
```

## Import Organization

**Order:**

1. React imports: `import { useState } from 'react'`
2. Third-party libraries: `import { useQuery } from '@tanstack/react-query'`
3. Internal imports from `@/`: `import { useAuth } from '@/hooks/use-auth'`
4. Type-only imports: `import type { UserProfile } from '@/types/...'`

**Path Aliases:**

- Use `@/` to import from `src/`: `import { cn } from '@/lib/utils'`
- Exception: Server-side code in `api/` and `src/server/` must use relative paths with `.js` extensions (Vercel Serverless Functions constraint)

**Barrel Files:**

- Avoid circular dependencies via `import-x/no-cycle` ESLint rule
- Provider components exported from their files directly, not via barrels

## Error Handling

**Custom Errors:**

- Create custom Error subclasses with descriptive messages
- Set `this.name` property for clarity: `this.name = 'OfflineNoCacheError'`
- Example: `src/lib/errors.ts` defines `OfflineNoCacheError`

**Error Detection Functions:**

- Utility functions check error types: `isAuthError()`, `isNonRetryableError()`
- tRPC error codes extracted via `getTRPCErrorCode()` helper
- Auth errors (401, 403) handled separately from transient errors (5xx, network)

**Error Boundaries:**

- Class components via `Component` base class
- Implement `getDerivedStateFromError()` for error capture
- Implement `componentDidCatch()` for side effects (logging, monitoring)
- Reset mechanism via `QueryErrorResetBoundary` integration

## Logging

**Framework:** `console` (no dedicated logging library)

**Patterns:**

- Error logging in error boundary: `console.error('React Error Boundary caught an error:', error, errorInfo)`
- Comments note production considerations for error tracking services
- No debug logging; reserved for error scenarios only

## Comments

**When to Comment:**

- Explain non-obvious behavior: "Using indexOf instead of includes for IE11 compatibility"
- Clarify complex state transitions: "Sign out: clear session, keep tokens for 'welcome back'"
- Document API constraints: "Uses query (not mutation) but sent as POST via methodOverride for security"
- Explain why, not what: "Prevents cross-account data leakage" vs "Calls resetAvatarSettings()"

**JSDoc/TSDoc:**
**REQUIRED** on all exported functions, hooks, utilities, and providers.

**Required tags:**

- `@param` - For each parameter (include type context if not obvious)
- `@returns` - What the function returns (omit for void functions)
- `@throws` - If the function throws specific errors
- `@example` - For complex utilities (optional but helpful)

**Format:**

```typescript
/**
 * Brief description of what the function does.
 *
 * @param redirectUrl - The URL to validate
 * @param defaultPath - Default path if validation fails
 * @returns The sanitized URL or default path
 * @throws {OfflineNoCacheError} When offline with no cached data
 */
export function getSafeRedirectUrl(
  redirectUrl: string | null,
  defaultPath: string
): string { ... }
```

**Hook example:**

```typescript
/**
 * Tracks online/offline status with event listener cleanup.
 *
 * @returns Current online status from navigator.onLine
 */
export function useOnlineStatus(): boolean { ... }
```

**Provider example:**

````typescript
/**
 * Provides authentication state and methods to the app.
 * Handles OAuth token validation, session management, and cross-tab sync.
 *
 * @param props - Component props
 * @param props.children - The app component tree
 * @returns Provider wrapper with auth context
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element { ... }
````

## Function Design

**Size:** Prefer functions under 50 lines; complex logic extracted into named helpers

**Parameters:**

- Single object parameter for 2+ args: `({ username, tokens })` over `(username, tokens)`
- Required params in object: `z.object({ accessToken: z.string() })`
- Optional params with `.optional().default()`: `z.number().optional().default(50)`

**Return Values:**

- Explicit return types required on exported functions (ESLint `explicit-module-boundary-types`)
- JSX return typed as `React.JSX.Element`
- Async functions return `Promise<T>`

## Module Design

**Exports:**

- Named exports preferred: `export function useOnlineStatus()` over default exports
- Exception: React Router route files export default Route object
- Private functions without `export` keyword

**File Organization:**

- Type definitions at top: `interface AuthTokens { ... }`
- Exported functions follow types
- Helper functions/constants at bottom
- Comments explaining non-obvious patterns

**Examples from codebase:**

`src/stores/auth-store.ts`:

1. Interface definitions (`AuthTokens`, `AuthStore`)
2. JSDoc for the store
3. `create()` with `persist()` middleware
4. Actions defined inline in reducer

`src/lib/errors.ts`:

1. Custom error class definition
2. Helper function to extract codes
3. Utility functions checking error types

`src/hooks/use-online-status.ts`:

1. Imports
2. JSDoc
3. Function with inline effect handlers
4. Event listener cleanup in return

## React Patterns

**Component Structure:**

- Functional components with hooks (no class components except Error Boundary)
- Props typed via interfaces with `Props` suffix
- Components export directly without wrappers

**Hooks:**

- All hooks exported from `src/hooks/` directory
- Custom hooks use `use` prefix
- Hooks manage their own state/effects without external wrappers

**React Compiler:**

- Enabled via `babel-plugin-react-compiler` in vite.config.ts
- Supports automatic memoization and optimization

## TypeScript Configuration

**Strict Mode:** Fully enabled

- `strict: true`
- `exactOptionalPropertyTypes: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `useUnknownInCatchVariables: true`

**Module Resolution:** `bundler` (supports `@/` aliases)

**Type Safety:**

- All parameters must have explicit types
- No implicit `any`
- Exhaustive union type checking via eslint-plugin-typescript-eslint

## Accessibility

**Mapping shadcn/ui components to HTML elements:**
Defined in `eslint.config.js` for jsx-a11y checks:

```javascript
components: {
  Button: 'button',
  Input: 'input',
  Label: 'label',
  Checkbox: 'input',
  Select: 'select',
  Slider: 'input',
  AvatarImage: 'img'
}
```

## Specific Rule Enforcements

**Import Rules:**

- `import-x/no-unused-modules` - Detects unused exports (with ignored entry points)
- `import-x/no-cycle` - Prevents circular dependencies
- `import-x/no-nodejs-modules` - Prevents Node.js builtins in browser code (relaxed for `/api` and `/src/server`)

**React Rules:**

- `react/no-unstable-nested-components` - Prevents component definitions inside renders
- `react/jsx-no-constructed-context-values` - Prevents new objects in context value
- `react/jsx-no-leaked-render` - Prevents rendering "0" when count is 0
- `react/no-object-type-as-default-prop` - Prevents object defaults creating new references
- `react/checked-requires-onchange-or-readonly` - Enforces controlled inputs
- `react/jsx-no-script-url` - Security: prevents `javascript:` URLs
- `react/no-array-index-key` - Prevents array index as key (causes bugs on reorder)

**Template Literals:**

- `@typescript-eslint/restrict-template-expressions` allows numbers and booleans (safe coercion)

---

_Convention analysis: 2026-01-29_

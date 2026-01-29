# Testing Patterns

**Analysis Date:** 2026-01-29

## Test Framework

**Status:** No testing framework configured

**Runner:** Not detected

**Assertion Library:** Not detected

**Configuration Files:** None found (no `vitest.config.ts`, `jest.config.js`, etc.)

**Run Commands:** Not available

## Current State

The codebase has:

- No test files (`.test.ts`, `.spec.ts` extensions not found)
- No test runner installed (Vitest, Jest)
- No testing dependencies in `package.json`
- No test configuration files in project root

## Code Patterns for Testing Readiness

While formal testing is not currently implemented, the codebase is designed with testability in mind:

### Separation of Concerns

**Custom Hooks** (`src/hooks/`):

- `useOnlineStatus()` - Pure hook tracking browser online status via `navigator.onLine`
- `useHydrationGuard()` - Simple gating logic combining two state values
- `useUserProfile()` - Returns object with profile, isFetching, error, and action methods

Hooks are structured to be independently testable:

```typescript
// Example: useOnlineStatus hook
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  useEffect(() => { ... }, [])
  return isOnline
}
```

**Error Utilities** (`src/lib/errors.ts`):

- `isAuthError(error)` - Pure function checking tRPC error code
- `isNonRetryableError(error)` - Pure function returning boolean
- `getTRPCErrorCode(error)` - Pure function extracting code with type guards

All testable as standalone unit tests:

```typescript
export function isAuthError(error: unknown): boolean {
  const code = getTRPCErrorCode(error)
  return code === 'UNAUTHORIZED' || code === 'FORBIDDEN'
}
```

**Store Actions** (`src/stores/auth-store.ts`, `src/stores/preferences-store.ts`):

- Zustand stores with discrete action methods
- Selectable state and actions via hooks
- Persist middleware for localStorage

```typescript
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      tokens: null,
      sessionActive: false,
      setTokens: (tokens) => set({ tokens }),
      setSessionActive: (active) => set({ sessionActive: active }),
      signOut: () => set({ sessionActive: false }),
      disconnect: () => { ... }
    }),
    { name: STORAGE_KEYS.AUTH }
  )
)
```

### Type Safety

**Zod Validation** (`src/server/trpc/routers/discogs.ts`):

- Input schemas validated via Zod: `z.object({ accessToken: z.string() })`
- Type-safe tRPC procedures with input constraints
- Rate limiting checks: `z.number().max(100)` for per-page limits

**TypeScript Strict Mode:**

- `exactOptionalPropertyTypes` enforces explicit optional handling
- `noUnusedParameters` catches uncaught test variables
- Type-only interfaces enable compile-time validation

### Error Boundaries

**Class Component** (`src/components/error-boundary.tsx`):

- `getDerivedStateFromError()` for deterministic error capture
- `componentDidCatch()` for side effects
- Error fallback UI with reset mechanism

```typescript
class ErrorBoundaryInner extends Component<Props, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }
}
```

### Integration Points

**tRPC Client** (`src/lib/trpc.ts`):

- Type-safe API client generated from server routers
- Can be mocked at procedure level via TanStack Query test utilities

**TanStack Query** (`src/hooks/use-collection.ts`, `src/hooks/use-user-profile.ts`):

- Query keys exported as constants: `USER_PROFILE_QUERY_KEY`
- Can be tested with `QueryClient.setQueryData()`
- Enabled/disabled queries for conditional fetching

```typescript
export const USER_PROFILE_QUERY_KEY = ['userProfile'] as const

const { data: profileData } = useQuery<UserProfile | null>({
  queryKey: USER_PROFILE_QUERY_KEY,
  queryFn: () =>
    queryClient.getQueryData<UserProfile>(USER_PROFILE_QUERY_KEY) ?? null,
  enabled: false
})
```

## Recommended Testing Setup

### For Adding Tests

**Suggested Framework:** Vitest

- Familiar Jest-like API
- Faster execution
- ESM native support
- Better TypeScript integration

**Installation:**

```bash
bun add -d vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom happy-dom
```

**Configuration Structure:**

- `vitest.config.ts` - Main config
- `src/test/setup.ts` - Vitest setup file
- `src/**/*.test.ts` - Co-located with source files

### Test Patterns to Follow

**Unit Tests (Utilities):**

```typescript
// src/lib/errors.test.ts
import { describe, it, expect } from 'vitest'
import { isAuthError, isNonRetryableError } from '@/lib/errors'

describe('isAuthError', () => {
  it('returns true for UNAUTHORIZED error code', () => {
    const error = new Error()
    // Mock tRPC error with 401
    expect(isAuthError(mockUnauthorizedError)).toBe(true)
  })
})
```

**Hook Tests:**

```typescript
// src/hooks/use-online-status.test.ts
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from '@/hooks/use-online-status'

describe('useOnlineStatus', () => {
  it('returns navigator.onLine status', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(typeof result.current).toBe('boolean')
  })
})
```

**Store Tests (Zustand):**

```typescript
// src/stores/auth-store.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth-store'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ tokens: null, sessionActive: false })
  })

  it('sets tokens', () => {
    const { result } = renderHook(() => useAuthStore((s) => s.setTokens))
    act(() => {
      result.current({ accessToken: 'test', accessTokenSecret: 'secret' })
    })
    const tokens = useAuthStore((s) => s.tokens)
    expect(tokens).toEqual({ accessToken: 'test', accessTokenSecret: 'secret' })
  })
})
```

**Component Tests:**

```typescript
// src/components/error-boundary.test.tsx
import { render, screen } from '@testing-library/react'
import { AppErrorBoundary } from '@/components/error-boundary'

const ThrowError = () => {
  throw new Error('Test error')
}

describe('AppErrorBoundary', () => {
  it('catches errors and displays fallback UI', () => {
    render(
      <AppErrorBoundary>
        <ThrowError />
      </AppErrorBoundary>
    )
    expect(screen.getByText(/oopsTitle/i)).toBeInTheDocument()
  })
})
```

**Mocking tRPC:**

```typescript
// src/hooks/use-user-profile.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUserProfile } from '@/hooks/use-user-profile'
import * as trpc from '@/lib/trpc'

vi.mock('@/lib/trpc')

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.mocked(trpc.useUtils).mockReturnValue({
      client: {
        discogs: {
          getUserProfile: {
            query: vi.fn().mockResolvedValue({
              profile: { id: 1, username: 'test' }
            })
          }
        }
      }
    })
  })

  it('fetches and caches profile', async () => {
    // Test implementation
  })
})
```

## Mocking Patterns

**What to Mock:**

- External API calls (tRPC procedures)
- Browser APIs (localStorage, navigator.onLine)
- Zustand store state (via `setState`)
- TanStack Query cache (via `QueryClient.setQueryData()`)

**What NOT to Mock:**

- Internal utility functions (test real logic)
- React hooks behavior (use real hooks when possible)
- Store action logic (test actual store behavior)
- Component render output (verify actual UI)

## Coverage Targets

**Current:** No coverage tracking

**Recommendations:**

- Utilities/helpers: 90%+ coverage
- Hooks: 80%+ coverage (harder to test complex lifecycle)
- Components: 70%+ coverage (integration tests cover more than unit)
- Stores: 85%+ coverage
- Pages/Routes: 60%+ coverage (mostly integration tested)

## Testing Dependencies

**Recommended:**

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@vitest/ui": "^1.0.0",
    "happy-dom": "^12.0.0"
  }
}
```

**Optional:**

- `msw` (Mock Service Worker) - For API mocking at network level
- `@vitest/coverage-v8` - Coverage reporting
- `vitest-browser-runner` - Browser-based tests

## CI/CD Considerations

**GitHub Actions:**

- Run tests on PR via `.github/workflows/test.yml`
- Run linting and build before tests
- Coverage reporting (optional)

**Pre-commit Hooks:**

- Husky already configured (`src/.husky`)
- Could add test command to lint-staged for changed files

---

_Testing analysis: 2026-01-29_

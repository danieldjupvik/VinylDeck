# Phase 3: Integration - Research

**Researched:** 2026-01-29
**Domain:** Modal triggering, app lifecycle, hydration gating, cross-tab sync
**Confidence:** HIGH

## Summary

Phase 3 integrates the changelog modal (from Phase 2) with the app's lifecycle using the detection logic (from Phase 1). The core challenge is timing: the modal must trigger after hydration completes, after authentication resolves, but not during OAuth callback flows or loading states.

The codebase already has the infrastructure needed: `HydrationProvider` with `hasHydrated` state, `useAuth` hook with `isAuthenticated` and `isLoading`, route-level layout components (`_authenticated.tsx`) that gate content behind auth, and cross-tab sync patterns via Zustand storage events. The `useLocation` hook provides pathname for OAuth callback detection.

**Primary recommendation:** Create a `useChangelogTrigger` hook that coordinates all conditions (hydration complete, authenticated, not loading, not on OAuth callback route, has new entries). The hook fires once per session using a ref guard, triggers modal open after a 750ms delay, and calls `setLastSeenVersion` immediately when modal appears.

## Standard Stack

### Core (Already Available)

| Pattern/Hook          | Location                      | Purpose                                 |
| --------------------- | ----------------------------- | --------------------------------------- |
| `useHydrationState`   | `providers/hydration-context` | Tracks IndexedDB hydration              |
| `useAuth`             | `hooks/use-auth`              | Auth state (isAuthenticated, isLoading) |
| `useLocation`         | `@tanstack/react-router`      | Current pathname for route detection    |
| `usePreferencesStore` | `stores/preferences-store`    | Will hold `lastSeenVersion` (Phase 1)   |
| `useChangelog`        | `hooks/use-changelog`         | Returns entries (Phase 1)               |

### Phase 1/2 Deliverables (Dependencies)

| Component            | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `useChangelog`       | Returns `hasEntries` and `versions` array |
| `setLastSeenVersion` | Action to mark version as seen            |
| `ResponsiveModal`    | Dialog/Drawer wrapper with `open` prop    |
| `ChangelogContent`   | Modal body content                        |

### Browser APIs

| API                 | Purpose                | Support                      |
| ------------------- | ---------------------- | ---------------------------- |
| `navigator.vibrate` | Mobile haptic feedback | Android Chrome, Firefox only |

**Notes on Vibration API:**

- Not supported on iOS Safari (silently fails)
- Requires user interaction to have occurred ("sticky activation")
- Pattern: `navigator.vibrate(10)` for subtle tap
- Feature detect: `if ("vibrate" in navigator) { ... }`

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   └── use-changelog-trigger.ts   # Coordinates all trigger conditions
├── components/
│   └── changelog/
│       └── changelog-auto-trigger.tsx  # Component that renders modal
└── routes/
    └── _authenticated.tsx         # Integration point for auto-trigger
```

### Pattern 1: Trigger Hook with Multiple Gates

**What:** A hook that coordinates hydration, auth, route, and version detection before triggering modal.
**When to use:** Complex trigger conditions that span multiple providers/contexts.
**Example:**

```typescript
// src/hooks/use-changelog-trigger.ts
import { useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'

import { useAuth } from '@/hooks/use-auth'
import { useChangelog } from '@/hooks/use-changelog'
import { useHydrationState } from '@/providers/hydration-context'
import { usePreferencesStore } from '@/stores/preferences-store'
import { APP_VERSION } from '@/lib/constants'

const TRIGGER_DELAY_MS = 750

export function useChangelogTrigger() {
  const { hasHydrated } = useHydrationState()
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const changelog = useChangelog()
  const setLastSeenVersion = usePreferencesStore((s) => s.setLastSeenVersion)

  const [isOpen, setIsOpen] = useState(false)
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    // Gate 1: Already triggered this session
    if (hasTriggeredRef.current) return

    // Gate 2: Hydration not complete
    if (!hasHydrated) return

    // Gate 3: Auth not resolved or not authenticated
    if (isLoading || !isAuthenticated) return

    // Gate 4: On OAuth callback route
    if (location.pathname === '/oauth-callback') return

    // Gate 5: No new entries to show
    if (!changelog.hasEntries) return

    // All gates passed - schedule trigger
    hasTriggeredRef.current = true

    const timer = setTimeout(() => {
      setIsOpen(true)
      setLastSeenVersion(APP_VERSION)

      // Haptic feedback on mobile (silent fail on iOS)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }, TRIGGER_DELAY_MS)

    return () => clearTimeout(timer)
  }, [
    hasHydrated,
    isLoading,
    isAuthenticated,
    location.pathname,
    changelog.hasEntries,
    setLastSeenVersion
  ])

  return { isOpen, setIsOpen }
}
```

### Pattern 2: Auto-Trigger Component in Layout

**What:** A component that uses the trigger hook and renders the modal.
**When to use:** Keep trigger logic separate from modal UI.
**Example:**

```typescript
// src/components/changelog/changelog-auto-trigger.tsx
import { useChangelogTrigger } from '@/hooks/use-changelog-trigger'
import { useChangelog } from '@/hooks/use-changelog'
import { ChangelogModal } from '@/components/changelog/changelog-modal'

export function ChangelogAutoTrigger() {
  const { isOpen, setIsOpen } = useChangelogTrigger()
  const changelog = useChangelog()

  if (!changelog.hasEntries) return null

  return (
    <ChangelogModal
      open={isOpen}
      onOpenChange={setIsOpen}
      versions={changelog.versions}
    />
  )
}
```

### Pattern 3: Settings Manual Trigger

**What:** Replace "Coming soon" placeholder with working link.
**When to use:** Manual access to changelog from settings.
**Example:**

```typescript
// In settings.tsx, replace disabled button:
import { useState } from 'react'
import { ChangelogModal } from '@/components/changelog/changelog-modal'
import { changelog } from '@/data/changelog'

function SettingsPage() {
  const [changelogOpen, setChangelogOpen] = useState(false)

  return (
    <>
      {/* In About section */}
      <button
        type="button"
        onClick={() => setChangelogOpen(true)}
        className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors"
      >
        <FileText className="text-muted-foreground size-4" />
        <span className="text-sm">{t('settings.about.whatsNew')}</span>
      </button>

      <ChangelogModal
        open={changelogOpen}
        onOpenChange={setChangelogOpen}
        versions={changelog}  // Show all versions for manual access
      />
    </>
  )
}
```

### Pattern 4: Cross-Tab Sync for lastSeenVersion

**What:** When user dismisses modal in one tab, other tabs update via storage event.
**When to use:** Prevent modal from re-triggering in other open tabs.
**Example:**

```typescript
// The existing Zustand persist middleware handles this automatically.
// When setLastSeenVersion is called, localStorage updates.
// Other tabs receive storage event and Zustand rehydrates.
// The hasTriggeredRef guard prevents immediate re-trigger in same tab.
// The changelog.hasEntries check will return false after rehydration
// because lastSeenVersion now matches APP_VERSION.
```

### Anti-Patterns to Avoid

- **Triggering before hydration:** Modal would check stale lastSeenVersion from default state
- **Not gating behind auth:** Modal flashes before redirect to login
- **Showing during OAuth callback:** Interrupts critical flow, confusing UX
- **Using window.onload:** Fires before React hydration completes
- **Marking version on dismiss:** User might close tab before dismiss, never seeing content
- **Multiple trigger refs across components:** Use single source of truth hook

## Don't Hand-Roll

| Problem             | Don't Build                | Use Instead            | Why                                      |
| ------------------- | -------------------------- | ---------------------- | ---------------------------------------- |
| Hydration detection | Custom localStorage check  | `useHydrationState`    | Already integrated with QueryProvider    |
| Auth state          | Manual token parsing       | `useAuth`              | Handles all edge cases, cross-tab sync   |
| Route detection     | `window.location.pathname` | `useLocation` hook     | React-integrated, updates on navigation  |
| Cross-tab sync      | Manual storage listener    | Zustand persist        | Automatic rehydration on storage events  |
| Delayed execution   | Custom debounce            | `setTimeout` in effect | Simple, cleanup handled by effect return |

**Key insight:** The codebase already solves all the hard problems. Integration is about composing existing hooks with correct gating logic.

## Common Pitfalls

### Pitfall 1: Modal Triggers on Every Route Change

**What goes wrong:** Modal re-opens when navigating between authenticated routes.
**Why it happens:** Effect runs without session-scoped guard.
**How to avoid:** Use `hasTriggeredRef` that persists across re-renders but resets on page reload.
**Warning signs:** Modal appears when clicking between Collection and Settings.

### Pitfall 2: Modal Triggers During Page Load Spinner

**What goes wrong:** Modal opens over the loading spinner, then both disappear.
**Why it happens:** Not waiting for auth `isLoading` to become false.
**How to avoid:** Gate: `if (isLoading) return` in effect.
**Warning signs:** Brief modal flash during app initialization.

### Pitfall 3: Hydration Race Condition

**What goes wrong:** Modal checks lastSeenVersion before IndexedDB restores preferences.
**Why it happens:** Effect runs on mount before hydration completes.
**How to avoid:** Gate: `if (!hasHydrated) return` as first check.
**Warning signs:** Existing users see modal for versions they already saw.

### Pitfall 4: OAuth Callback Interruption

**What goes wrong:** Modal appears over the "Completing login..." screen.
**Why it happens:** User is technically authenticated before redirect completes.
**How to avoid:** Explicitly check `location.pathname !== '/oauth-callback'`.
**Warning signs:** Users see changelog during OAuth flow.

### Pitfall 5: Strict Mode Double Trigger

**What goes wrong:** Modal opens, closes, opens again in development.
**Why it happens:** React.StrictMode double-invokes effects.
**How to avoid:** The `hasTriggeredRef` pattern handles this naturally.
**Warning signs:** Double trigger in dev mode only.

### Pitfall 6: Vibration Fails Silently on iOS

**What goes wrong:** No haptic feedback for iOS users.
**Why it happens:** Safari doesn't support Vibration API.
**How to avoid:** Accept this as expected behavior. Feature detect but don't show error.
**Warning signs:** None (silent failure is intentional).

## Code Examples

### Complete Trigger Hook

```typescript
// src/hooks/use-changelog-trigger.ts
import { useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'

import { useAuth } from '@/hooks/use-auth'
import { useChangelog } from '@/hooks/use-changelog'
import { useHydrationState } from '@/providers/hydration-context'
import { usePreferencesStore } from '@/stores/preferences-store'
import { APP_VERSION } from '@/lib/constants'

const TRIGGER_DELAY_MS = 750

/**
 * Coordinates changelog modal auto-trigger with all required gates:
 * hydration, auth, route, and version detection.
 *
 * @returns Modal open state and setter for controlled modal
 */
export function useChangelogTrigger() {
  const { hasHydrated } = useHydrationState()
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const changelog = useChangelog()
  const setLastSeenVersion = usePreferencesStore((s) => s.setLastSeenVersion)

  const [isOpen, setIsOpen] = useState(false)
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    // All gates must pass before triggering
    const shouldTrigger =
      !hasTriggeredRef.current &&
      hasHydrated &&
      !isLoading &&
      isAuthenticated &&
      location.pathname !== '/oauth-callback' &&
      changelog.hasEntries

    if (!shouldTrigger) return

    hasTriggeredRef.current = true

    const timer = setTimeout(() => {
      setIsOpen(true)
      setLastSeenVersion(APP_VERSION)

      // Subtle haptic on mobile (no-op on iOS Safari)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }, TRIGGER_DELAY_MS)

    return () => clearTimeout(timer)
  }, [
    hasHydrated,
    isLoading,
    isAuthenticated,
    location.pathname,
    changelog,
    setLastSeenVersion
  ])

  return { isOpen, setIsOpen }
}
```

### Integration in Authenticated Layout

```typescript
// In _authenticated.tsx, after auth checks pass:
function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  // ... existing code ...

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative">
        {/* ... existing layout ... */}
        <ChangelogAutoTrigger />
      </SidebarInset>
    </SidebarProvider>
  )
}
```

### Settings Page Integration

```typescript
// In settings.tsx About section:
function AboutSection() {
  const { t } = useTranslation()
  const [changelogOpen, setChangelogOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.about.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setChangelogOpen(true)}
            className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors"
          >
            <FileText className="text-muted-foreground size-4" />
            <span className="text-sm">{t('settings.about.whatsNew')}</span>
          </button>
          {/* ... other buttons ... */}
        </div>

        <ChangelogModal
          open={changelogOpen}
          onOpenChange={setChangelogOpen}
          versions={changelog}
        />
      </CardContent>
    </Card>
  )
}
```

## State of the Art

| Old Approach                | Current Approach                 | When Changed | Impact                           |
| --------------------------- | -------------------------------- | ------------ | -------------------------------- |
| ComponentDidMount           | useEffect with deps array        | React 16.8   | Declarative, cleanup handled     |
| window.onload               | React hydration state            | Standard     | Correct timing in SSR/CSR hybrid |
| Manual localStorage parsing | Zustand persist + storage events | Standard     | Automatic cross-tab sync         |
| Custom modal state          | Controlled component pattern     | Standard     | Single source of truth           |

**Current best practices:**

- Gate effects behind state conditions, not manual checks
- Use refs for session-scoped persistence (survives re-renders, resets on reload)
- Trust library-provided hooks over manual implementations
- Feature detect optional APIs, fail silently

## Open Questions

1. **Exact delay value**
   - What we know: Decision says 500ms-1s range
   - Recommendation: 750ms provides breathing room without feeling sluggish
   - Validation: Test on slow 3G to ensure modal doesn't feel "late"

2. **Cross-tab modal state**
   - What we know: lastSeenVersion syncs via Zustand
   - What's unclear: Should open modal in Tab A close if Tab B updates lastSeenVersion?
   - Recommendation: No - keep modal open, it's already showing. Only prevents NEW triggers.

3. **Hot reload behavior in development**
   - What we know: HMR can cause effect re-runs
   - What's unclear: Will hasTriggeredRef survive HMR?
   - Recommendation: Accept modal may re-trigger on HMR - dev-only issue

## Sources

### Primary (HIGH confidence)

- Existing codebase: `hydration-provider.tsx`, `auth-provider.tsx`, `_authenticated.tsx`, `cross-tab-sync.ts`, `use-mobile.ts`
- [TanStack Router useLocation](https://tanstack.com/router/latest/docs/framework/react/api/router/useLocationHook) - Route detection
- [Zustand persist middleware](https://zustand.docs.pmnd.rs/middlewares/persist) - Cross-tab sync pattern
- Phase 1/2 research documents

### Secondary (MEDIUM confidence)

- [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) - Browser support, usage
- [Can I Use Vibration API](https://caniuse.com/vibration) - Compatibility tables

### Tertiary (LOW confidence)

- WebSearch for "react modal auto trigger hydration" - General patterns, no specific library

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All patterns exist in codebase
- Architecture: HIGH - Direct extension of existing hooks/providers
- Pitfalls: HIGH - Based on codebase patterns and documented edge cases
- Cross-tab sync: MEDIUM - Zustand handles it, but modal state interaction is implicit

**Research date:** 2026-01-29
**Valid until:** 60 days (stable patterns, no external dependencies)

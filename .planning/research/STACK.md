# Stack Research: User-Friendly Changelog Modal

**Domain:** Responsive modal UI for changelog display in React PWA
**Researched:** 2026-01-29
**Confidence:** HIGH

## Recommended Stack

### Core Components (Already Available)

| Component  | Source                                    | Purpose                          | Why Recommended                                    |
| ---------- | ----------------------------------------- | -------------------------------- | -------------------------------------------------- |
| Dialog     | `@radix-ui/react-dialog` (installed)      | Desktop modal                    | Already in project, accessible, keyboard-navigable |
| ScrollArea | `@radix-ui/react-scroll-area` (installed) | Scrollable changelog content     | Handles long changelogs gracefully                 |
| Badge      | shadcn/ui (installed)                     | Category labels (New, Fix, etc.) | Consistent with existing UI patterns               |

### New Components Required

| Component | Package | Version | Purpose             | Why Recommended                                                      |
| --------- | ------- | ------- | ------------------- | -------------------------------------------------------------------- |
| Drawer    | `vaul`  | ^1.1.2  | Mobile bottom sheet | shadcn's official drawer component, built on Radix Dialog primitives |

**Installation:**

```bash
bunx shadcn@latest add drawer
```

This installs `vaul` and `@radix-ui/react-dialog` (dialog already present) plus the styled drawer component.

### Mobile Detection (Already Available)

| Hook          | Location                  | Purpose                 | Notes                                                 |
| ------------- | ------------------------- | ----------------------- | ----------------------------------------------------- |
| `useIsMobile` | `src/hooks/use-mobile.ts` | Detect viewport < 768px | Already exists, uses `matchMedia` with proper cleanup |

**No new hook needed.** The existing `useIsMobile` hook matches the shadcn drawer-dialog pattern's 768px breakpoint exactly.

### Version Comparison

| Approach                 | Recommendation | Why                                                                                     |
| ------------------------ | -------------- | --------------------------------------------------------------------------------------- |
| Native string comparison | **Use this**   | App versions follow strict `X.Y.Z` format, no pre-release tags in user-facing changelog |
| `compare-versions`       | Not needed     | Adds dependency for simple case                                                         |
| `semver`                 | Overkill       | Full npm semver parser, 50KB+                                                           |

**Version comparison logic:**

```typescript
// Simple comparison for X.Y.Z versions
const isNewVersion = (current: string, lastSeen: string | null): boolean => {
  if (!lastSeen) return true
  return current !== lastSeen
}
```

If pre-release versions need comparison later, add `compare-versions@6.1.1` (no dependencies, ~1KB).

### Dismissal Tracking

| Approach                      | Storage                            | Why                                          |
| ----------------------------- | ---------------------------------- | -------------------------------------------- |
| Add to existing Zustand store | localStorage via `vinyldeck-prefs` | Consistent with existing preferences pattern |

**Add to preferences-store.ts:**

```typescript
interface PreferencesState {
  // ... existing
  lastSeenVersion: string | null
  setLastSeenVersion: (version: string) => void
}
```

### Changelog Data Format

| Format            | Recommendation         | Why                                           |
| ----------------- | ---------------------- | --------------------------------------------- |
| TypeScript object | **Use this**           | Type-safe, tree-shakeable, no runtime parsing |
| JSON file         | Acceptable alternative | Requires import assertion or fetch            |
| YAML              | Avoid                  | Needs parser dependency                       |
| Markdown          | Avoid                  | Needs parser, loses structure                 |

**Recommended structure:**

```typescript
// src/lib/changelog.ts
export interface ChangelogEntry {
  version: string
  date: string
  categories: {
    features?: string[]
    fixes?: string[]
    improvements?: string[]
  }
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.3.1',
    date: '2026-01-28',
    categories: {
      features: ['Added offline mode support'],
      fixes: ['Fixed collection sync timing']
    }
  }
]
```

## Installation Commands

```bash
# Add drawer component (includes vaul dependency)
bunx shadcn@latest add drawer
```

No other dependencies required.

## Alternatives Considered

| Recommended        | Alternative           | When to Use Alternative                                                |
| ------------------ | --------------------- | ---------------------------------------------------------------------- |
| Drawer (vaul)      | Sheet (existing)      | Sheet is side-panel, not bottom drawer - wrong UX for mobile changelog |
| `useIsMobile` hook | CSS-only approach     | CSS can't conditionally render different component trees               |
| Zustand store      | Separate localStorage | Would fragment storage pattern                                         |
| TypeScript object  | JSON import           | If changelog needs to be fetched/updated without rebuild               |

## What NOT to Use

| Avoid                        | Why                                               | Use Instead                                    |
| ---------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `semver` package             | 50KB+ for simple version check                    | Native string comparison or `compare-versions` |
| react-modal                  | Not Radix-based, inconsistent with stack          | shadcn Dialog                                  |
| Custom drawer implementation | Vaul handles gestures, snap points, accessibility | shadcn Drawer                                  |
| YAML changelog               | Requires `js-yaml` parser (~30KB)                 | TypeScript object                              |
| Markdown changelog           | Requires parser, loses type safety                | TypeScript object                              |
| `react-markdown`             | Overkill for curated content                      | Static JSX or mapped arrays                    |

## Component Architecture

```
ChangelogModal (responsive wrapper)
├── Desktop: Dialog
│   └── DialogContent
│       ├── DialogHeader (title, version badge)
│       └── ScrollArea (changelog entries)
└── Mobile: Drawer
    └── DrawerContent
        ├── DrawerHeader (title, version badge)
        └── ScrollArea (changelog entries)

ChangelogContent (shared)
├── VersionSection (per version)
│   ├── VersionHeader (version + date)
│   └── CategoryList
│       ├── Features (with Badge)
│       ├── Fixes (with Badge)
│       └── Improvements (with Badge)
```

## Trigger Pattern

Auto-show on version change:

```typescript
// In root layout or app component
const { lastSeenVersion, setLastSeenVersion } = usePreferencesStore()
const [showChangelog, setShowChangelog] = useState(false)

useEffect(() => {
  const currentVersion = APP_VERSION // from package.json or constants
  if (currentVersion !== lastSeenVersion) {
    setShowChangelog(true)
  }
}, [lastSeenVersion])

const handleDismiss = () => {
  setLastSeenVersion(APP_VERSION)
  setShowChangelog(false)
}
```

## Version Compatibility

| Package                       | Compatible With           | Notes                       |
| ----------------------------- | ------------------------- | --------------------------- |
| vaul@1.1.2                    | React 18/19, Radix Dialog | Peer deps fixed in 1.1.2    |
| @radix-ui/react-dialog@1.1.15 | Already installed         | Drawer uses same primitives |

## Sources

- [shadcn/ui Drawer Documentation](https://ui.shadcn.com/docs/components/drawer) - HIGH confidence
- [Vaul GitHub Releases](https://github.com/emilkowalski/vaul/releases) - v1.1.2 (Dec 14, 2024) - HIGH confidence
- [shadcn/ui Drawer-Dialog Example](https://ui.shadcn.com/docs/components/drawer) - Responsive pattern - HIGH confidence
- [compare-versions npm](https://www.npmjs.com/package/compare-versions) - v6.1.1 if needed - MEDIUM confidence
- Context7 `/websites/ui_shadcn` - Component API verification - HIGH confidence
- Context7 `/websites/vaul_emilkowal_ski` - Drawer API verification - HIGH confidence

---

_Stack research for: User-Friendly Changelog Modal_
_Researched: 2026-01-29_

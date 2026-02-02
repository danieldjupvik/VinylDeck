# Architecture Research: User-Friendly Changelog

**Domain:** In-app changelog system for PWA
**Researched:** 2026-01-29
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐                                                    │
│  │  changelog.json     │  Static curated data file                          │
│  │  (src/data/)        │  Imported at build time, tree-shaken               │
│  └─────────────────────┘                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                           State Layer                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐                           │
│  │  preferences-store  │  │  APP_VERSION        │                           │
│  │  (Zustand)          │  │  (constants.ts)     │                           │
│  │  lastSeenVersion    │  │  from package.json  │                           │
│  └─────────────────────┘  └─────────────────────┘                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Logic Layer                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  useChangelog hook                                           │            │
│  │  - Version comparison logic (semver)                         │            │
│  │  - Filters entries newer than lastSeenVersion                │            │
│  │  - markAsSeen() action                                       │            │
│  └─────────────────────────────────────────────────────────────┘            │
├─────────────────────────────────────────────────────────────────────────────┤
│                           UI Layer                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐            │
│  │ ChangelogModal│  │ ChangelogList │  │ ChangelogEntryCard    │            │
│  │ (Dialog)      │→ │ (ScrollArea)  │→ │ (version, date, items)│            │
│  └───────────────┘  └───────────────┘  └───────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component            | Responsibility                              | Typical Implementation                       |
| -------------------- | ------------------------------------------- | -------------------------------------------- |
| `changelog.json`     | Store curated release notes data            | Static JSON in `src/data/`                   |
| `preferences-store`  | Persist `lastSeenVersion`                   | Zustand with localStorage (existing pattern) |
| `useChangelog`       | Version detection, filtering, dismiss logic | Custom hook in `src/hooks/`                  |
| `ChangelogModal`     | Controlled Dialog wrapper                   | shadcn Dialog component                      |
| `ChangelogList`      | Scrollable list of entries                  | ScrollArea + mapping                         |
| `ChangelogEntryCard` | Single version's changes                    | Card with badges/icons                       |

## Recommended Project Structure

```
src/
├── data/
│   └── changelog.json          # Curated changelog data
├── hooks/
│   └── use-changelog.ts        # Version detection + filtering logic
├── components/
│   └── changelog/
│       ├── changelog-modal.tsx # Dialog wrapper with trigger
│       ├── changelog-list.tsx  # Scrollable entry list
│       └── changelog-entry.tsx # Single version card
├── stores/
│   └── preferences-store.ts    # Add lastSeenVersion field
├── lib/
│   └── version-utils.ts        # Semver comparison helpers
└── locales/
    ├── en/translation.json     # Add changelog.* keys
    └── no/translation.json     # Norwegian translations
```

### Structure Rationale

- **`src/data/`:** New folder for static data files. JSON chosen over alternatives (see Data Format section).
- **`src/components/changelog/`:** Isolated feature folder. Modal + list + entry mirrors existing patterns (collection/).
- **`src/hooks/use-changelog.ts`:** Single hook encapsulates all changelog logic. Matches `use-online-status.ts` pattern.
- **Extends `preferences-store`:** Adds `lastSeenVersion` field to existing store rather than new store.

## Architectural Patterns

### Pattern 1: Curated JSON Data File

**What:** Static JSON file imported at build time
**When to use:** Manual curation required, data changes infrequently
**Trade-offs:**

- PRO: Type-safe imports, tree-shaking, no runtime fetch
- PRO: Human-readable, easy to edit
- PRO: Supports translations via i18n keys
- CON: Requires rebuild to update

**Why JSON over alternatives:**

| Format                      | Verdict     | Reasoning                                      |
| --------------------------- | ----------- | ---------------------------------------------- |
| JSON                        | RECOMMENDED | Native TS import, type-safe, existing tooling  |
| YAML                        | Rejected    | Requires parser dependency, no type inference  |
| Markdown                    | Rejected    | Parsing complexity, harder to structure for UI |
| release-please CHANGELOG.md | Rejected    | Machine-generated format not user-friendly     |

**Data structure:**

```typescript
// src/data/changelog.json
{
  "versions": [
    {
      "version": "0.4.0-beta.1",
      "date": "2026-01-28",
      "highlights": ["changelog.highlights.040_1"],  // i18n keys
      "changes": {
        "features": [
          {
            "title": "changelog.features.user_changelog",
            "description": "changelog.features.user_changelog_desc"
          }
        ],
        "fixes": [],
        "improvements": []
      }
    }
  ]
}
```

**Type definition:**

```typescript
// src/types/changelog.ts
export interface ChangelogEntry {
  version: string
  date: string
  highlights?: string[] // i18n keys for TL;DR bullets
  changes: {
    features: ChangeItem[]
    fixes: ChangeItem[]
    improvements: ChangeItem[]
  }
}

export interface ChangeItem {
  title: string // i18n key
  description?: string // i18n key
  icon?: string // lucide icon name
}

export interface Changelog {
  versions: ChangelogEntry[]
}
```

### Pattern 2: Version Detection via Zustand Store

**What:** Store lastSeenVersion in existing preferences-store
**When to use:** Simple persistence needs matching existing patterns
**Trade-offs:**

- PRO: Consistent with existing auth-store, preferences-store patterns
- PRO: Automatic localStorage persistence via Zustand middleware
- PRO: Cross-tab sync built-in
- CON: None significant

**Implementation:**

```typescript
// Extend preferences-store.ts
interface PreferencesStore {
  // Existing fields...
  viewMode: ViewMode
  avatarSource: AvatarSource
  gravatarEmail: string

  // NEW: Changelog tracking
  lastSeenVersion: string | null

  // Existing actions...
  setViewMode: (mode: ViewMode) => void

  // NEW: Changelog action
  setLastSeenVersion: (version: string) => void
}
```

**Storage key:** Uses existing `STORAGE_KEYS.PREFERENCES` (`vinyldeck-prefs`)

### Pattern 3: Semver Comparison Without Library

**What:** Simple version comparison using native string/number parsing
**When to use:** Beta versions with predictable format (X.Y.Z-beta.N)
**Trade-offs:**

- PRO: Zero dependencies
- PRO: Handles VinylDeck's specific version format
- CON: Not full semver spec compliance (acceptable for this use case)

**Implementation:**

```typescript
// src/lib/version-utils.ts
/**
 * Parses version string into comparable parts.
 * Format: "0.4.0-beta.1" → { major: 0, minor: 4, patch: 0, prerelease: 1 }
 */
export function parseVersion(version: string): VersionParts {
  const [main, prerelease] = version.split('-')
  const [major, minor, patch] = main.split('.').map(Number)
  const prereleaseNum = prerelease?.match(/\d+$/)?.[0]

  return {
    major,
    minor,
    patch,
    prerelease: prereleaseNum ? Number(prereleaseNum) : Infinity
  }
}

/**
 * Returns true if versionA is newer than versionB.
 */
export function isNewerVersion(versionA: string, versionB: string): boolean {
  const a = parseVersion(versionA)
  const b = parseVersion(versionB)

  if (a.major !== b.major) return a.major > b.major
  if (a.minor !== b.minor) return a.minor > b.minor
  if (a.patch !== b.patch) return a.patch > b.patch
  return a.prerelease > b.prerelease
}
```

### Pattern 4: Hook-Based Detection Logic

**What:** Custom hook encapsulating all changelog logic
**When to use:** Feature-specific logic shared across components
**Trade-offs:**

- PRO: Single source of truth for changelog state
- PRO: Testable in isolation
- PRO: Matches existing hook patterns (use-online-status, use-preferences)

**Implementation:**

```typescript
// src/hooks/use-changelog.ts
export function useChangelog() {
  const currentVersion = APP_VERSION
  const lastSeenVersion = usePreferencesStore((s) => s.lastSeenVersion)
  const setLastSeenVersion = usePreferencesStore((s) => s.setLastSeenVersion)

  // Filter versions newer than lastSeenVersion
  const unseenVersions = useMemo(() => {
    if (!lastSeenVersion) {
      // First-time user: show current version only (or none)
      return changelog.versions.filter((v) => v.version === currentVersion)
    }
    return changelog.versions.filter((v) =>
      isNewerVersion(v.version, lastSeenVersion)
    )
  }, [lastSeenVersion, currentVersion])

  const hasUnseenChanges = unseenVersions.length > 0

  const markAsSeen = useCallback(() => {
    setLastSeenVersion(currentVersion)
  }, [currentVersion, setLastSeenVersion])

  return {
    currentVersion,
    lastSeenVersion,
    unseenVersions,
    allVersions: changelog.versions,
    hasUnseenChanges,
    markAsSeen
  }
}
```

## Data Flow

### Version Detection Flow

```
[App Load]
    ↓
[useChangelog hook initializes]
    ↓
[Read lastSeenVersion from preferences-store (localStorage)]
    ↓
[Compare with APP_VERSION from package.json]
    ↓
[Filter changelog.json for newer versions]
    ↓
[Return hasUnseenChanges boolean + unseenVersions array]
```

### Modal Trigger Flow

```
[Settings Page / About Section]
    ↓
[User clicks "Changelog" or "What's New"]
    ↓
[ChangelogModal opens]
    ↓
[On close: markAsSeen() writes APP_VERSION to preferences-store]
    ↓
[hasUnseenChanges → false, badge disappears]
```

### Key Data Flows

1. **First-time user:** `lastSeenVersion` is null → show minimal/no badge → on first view, set to current version
2. **Returning user (same version):** `lastSeenVersion === APP_VERSION` → no badge, can still view history
3. **Returning user (new version):** `lastSeenVersion < APP_VERSION` → show badge → on dismiss, update `lastSeenVersion`

## Integration Points

### Settings Page Integration

Replace disabled "Changelog" button with working modal trigger:

```tsx
// In settings.tsx About section
<ChangelogModal>
  <button className="hover:bg-accent/50 gap-3... flex w-full items-center">
    <FileText className="size-4" />
    <span>{t('settings.about.changelog')}</span>
    {hasUnseenChanges && (
      <Badge variant="secondary" className="ml-auto">
        {t('changelog.new')}
      </Badge>
    )}
  </button>
</ChangelogModal>
```

### Translation Keys

```json
{
  "changelog": {
    "title": "What's New",
    "new": "New",
    "version": "Version {{version}}",
    "features": "Features",
    "fixes": "Bug Fixes",
    "improvements": "Improvements",
    "noChanges": "You're up to date!",
    "viewAll": "View all changes",
    "highlights": {
      "040_1": "User-friendly changelog"
    },
    "features": {
      "user_changelog": "In-app changelog",
      "user_changelog_desc": "See what's new directly in the app"
    }
  }
}
```

## Anti-Patterns

### Anti-Pattern 1: Using release-please CHANGELOG.md Directly

**What people do:** Parse the auto-generated CHANGELOG.md
**Why it's wrong:**

- Machine-generated format with commit hashes, PR links not user-friendly
- Parsing markdown adds complexity
- No i18n support
- Tightly coupled to release-please format changes
  **Do this instead:** Maintain curated JSON with user-friendly descriptions

### Anti-Pattern 2: Storing Full Changelog in LocalStorage

**What people do:** Cache entire changelog in localStorage
**Why it's wrong:**

- Unnecessary duplication (data is in bundle)
- Storage quota concerns
- Stale data on version update
  **Do this instead:** Only store `lastSeenVersion` string in preferences-store

### Anti-Pattern 3: Provider/Context for Changelog

**What people do:** Create ChangelogProvider wrapping the app
**Why it's wrong:**

- Over-engineering for simple feature
- Changelog is not app-wide state
- Hook pattern is sufficient
  **Do this instead:** Single `useChangelog` hook, no context needed

### Anti-Pattern 4: Auto-Opening Modal on Update

**What people do:** Automatically show modal when new version detected
**Why it's wrong:**

- Interrupts user flow
- Annoying on every update
- Poor UX for frequent visitors
  **Do this instead:** Badge indicator + user-initiated modal

## Build Order Implications

### Phase Dependencies

```
Phase 1: Data & Types (no dependencies)
├── Create src/types/changelog.ts
├── Create src/data/changelog.json
└── Create src/lib/version-utils.ts

Phase 2: State (depends on Phase 1)
├── Extend preferences-store with lastSeenVersion
└── Add STORAGE_KEYS entry if needed (uses existing key)

Phase 3: Logic (depends on Phase 1, 2)
└── Create src/hooks/use-changelog.ts

Phase 4: UI Components (depends on Phase 3)
├── Create src/components/changelog/changelog-entry.tsx
├── Create src/components/changelog/changelog-list.tsx
└── Create src/components/changelog/changelog-modal.tsx

Phase 5: Integration (depends on Phase 4)
├── Update settings.tsx to use ChangelogModal
└── Add translation keys to en/no locales
```

### Build Considerations

- **No new dependencies:** Uses existing shadcn Dialog, existing Zustand patterns
- **Bundle impact:** changelog.json is small, inlined at build time
- **Type safety:** Full TypeScript throughout, types defined before implementation

## Component Design Notes

### ChangelogModal

- Uses shadcn Dialog (needs to add via `bunx shadcn add dialog`)
- Controlled open state for programmatic close
- Calls `markAsSeen()` on close (not on open - user might close without reading)
- Mobile: Full-width with max-height scroll
- Desktop: Centered modal, ~600px max-width

### ChangelogList

- ScrollArea for long histories
- Groups by version (accordion optional, simple list recommended for MVP)
- Shows date formatted via i18n
- "Current" badge on APP_VERSION entry

### ChangelogEntry

- Version + date header
- Highlights section (optional TL;DR bullets)
- Categorized changes with icons:
  - Features: `Sparkles` icon
  - Fixes: `Bug` icon
  - Improvements: `Zap` icon
- Descriptions expandable on click (optional, simple list for MVP)

## Sources

- VinylDeck codebase analysis (HIGH confidence)
- shadcn/ui Dialog component patterns (HIGH confidence)
- Zustand persist middleware documentation (HIGH confidence)

---

_Architecture research for: VinylDeck changelog feature_
_Researched: 2026-01-29_

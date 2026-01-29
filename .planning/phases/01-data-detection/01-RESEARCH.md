# Phase 1: Data & Detection - Research

**Researched:** 2026-01-29
**Domain:** Version comparison, changelog data structures, Zustand persistence
**Confidence:** HIGH

## Summary

Phase 1 establishes the data layer for the changelog system: a TypeScript file with typed changelog entries and a hook that detects version changes and returns relevant entries. The technical decisions are straightforward with well-established patterns.

The codebase already has the infrastructure needed: `APP_VERSION` constant from Vite config, Zustand persistence patterns in `preferences-store.ts`, and i18n via translation JSON files. The main work is defining the changelog data types, implementing semver-aware version comparison, and extending the preferences store with `lastSeenVersion`.

**Primary recommendation:** Use `compare-versions` library (2.6KB gzipped) for semver comparison including prerelease support. Define changelog data as a TypeScript file at `src/data/changelog.ts` with discriminated union types for categories.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library          | Version | Purpose           | Why Standard                                                                    |
| ---------------- | ------- | ----------------- | ------------------------------------------------------------------------------- |
| compare-versions | ^6.1.1  | Semver comparison | Lightweight (no deps), handles prereleases, full semver spec, TypeScript native |
| zustand          | ^5.0.10 | State persistence | Already in use via preferences-store                                            |

### Supporting

No additional libraries needed. The existing stack covers all requirements:

- TypeScript for type-safe data definitions
- i18next for translation key resolution (existing)
- Zustand persist middleware (existing)

### Alternatives Considered

| Instead of           | Could Use                    | Tradeoff                                                                               |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| compare-versions     | Hand-rolled tuple comparison | Only handles simple X.Y.Z; fails on prereleases (alpha, beta, rc) which VinylDeck uses |
| compare-versions     | npm/node-semver              | Much larger (46KB vs 2.6KB), heavier API surface, designed for Node.js range queries   |
| TypeScript data file | JSON file                    | Loses type safety, no IDE autocomplete, harder to maintain                             |

**Installation:**

```bash
bun add compare-versions
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── data/
│   └── changelog.ts        # Changelog entries (typed, versioned)
├── hooks/
│   └── use-changelog.ts    # Hook returning entries newer than lastSeenVersion
├── stores/
│   └── preferences-store.ts # Extended with lastSeenVersion field
├── types/
│   └── changelog.ts        # Type definitions for changelog entries
└── lib/
    └── version.ts          # Version comparison utilities
```

### Pattern 1: Discriminated Union for Entry Categories

**What:** Use a discriminated union type for changelog categories to ensure type safety and exhaustive handling.

**When to use:** When categories have different behaviors or when you want compile-time guarantees.

**Example:**

```typescript
// src/types/changelog.ts
export type ChangelogCategory = 'features' | 'improvements' | 'fixes'

export interface ChangelogEntry {
  /** Translation key for the entry text (supports markdown) */
  key: string
}

export interface ChangelogVersion {
  /** Semver version string (e.g., "0.3.0-beta") */
  version: string
  /** Release date in ISO format */
  date: string
  /** Entries grouped by category */
  features?: ChangelogEntry[]
  improvements?: ChangelogEntry[]
  fixes?: ChangelogEntry[]
}

/** Ordered array of changelog versions, newest first */
export type ChangelogData = ChangelogVersion[]
```

### Pattern 2: Hook Return Shape with Discriminated Status

**What:** Return object with explicit reason codes for empty results.

**When to use:** When debugging/testing requires knowing why no entries were returned.

**Example:**

```typescript
// src/hooks/use-changelog.ts
export type ChangelogResult =
  | { hasEntries: true; versions: ChangelogVersion[] }
  | {
      hasEntries: false
      reason: 'first-install' | 'up-to-date' | 'no-user-entries'
    }
```

### Pattern 3: Zustand Persistence with Version Migration

**What:** Extend existing store with version field and migration function.

**When to use:** When adding new persisted fields to existing store.

**Example:**

```typescript
// Pattern for extending preferences-store.ts
export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      // ...existing fields...
      lastSeenVersion: null as string | null,
      setLastSeenVersion: (version: string) => set({ lastSeenVersion: version })
    }),
    {
      name: STORAGE_KEYS.PREFERENCES,
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        if (version === 0) {
          // Existing users without lastSeenVersion: set to null (triggers first-install logic)
          return { ...(persisted as object), lastSeenVersion: null }
        }
        return persisted as PreferencesStore
      }
    }
  )
)
```

### Anti-Patterns to Avoid

- **String comparison for versions:** `"0.9" > "0.10"` is true lexicographically. Always use numeric tuple comparison.
- **Auto-generating from commits:** CHANGELOG.md format is for developers. Manual curation required for user-facing text.
- **Storing full changelog in state:** Only store `lastSeenVersion` string. Changelog data is static, imported directly.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem              | Don't Build                | Use Instead              | Why                                                     |
| -------------------- | -------------------------- | ------------------------ | ------------------------------------------------------- |
| Version comparison   | Custom split/compare logic | compare-versions         | Prereleases (alpha/beta/rc), build metadata, edge cases |
| i18n text resolution | Custom key lookup          | Existing i18next `t()`   | Already integrated, handles fallbacks, interpolation    |
| State persistence    | Manual localStorage        | Existing Zustand persist | Migration support, serialization, cross-tab sync        |

**Key insight:** The only new code needed is the data structure definition and a thin hook. Everything else leverages existing infrastructure.

## Common Pitfalls

### Pitfall 1: String-Based Version Comparison

**What goes wrong:** `"0.9" > "0.10"` evaluates to `true` (lexicographic comparison).
**Why it happens:** JavaScript compares strings character-by-character.
**How to avoid:** Always use compare-versions library: `compareVersions('0.10', '0.9') === 1`
**Warning signs:** Tests pass with simple versions but fail with `0.9 vs 0.10`.

### Pitfall 2: First-Install Modal Spam

**What goes wrong:** New users see changelog for every version ever released.
**Why it happens:** `lastSeenVersion: undefined` treated same as "never seen anything".
**How to avoid:** Explicit `null` value means first install, skip modal entirely.
**Warning signs:** New users report overwhelming first-run experience.

### Pitfall 3: Prerelease Version Ordering

**What goes wrong:** `0.3.0-beta` shown as newer than `0.3.0` (release).
**Why it happens:** Incorrect assumption that prereleases come after releases.
**How to avoid:** Per semver spec: `0.3.0-beta < 0.3.0`. compare-versions handles this correctly.
**Warning signs:** Users on release see beta changelog entries.

### Pitfall 4: Missing Translation Keys

**What goes wrong:** Raw keys shown to users (`changelog.0_3_0.feature_1`).
**Why it happens:** Changelog entry added without corresponding translation.
**How to avoid:** TypeScript types won't catch this. Establish process: add translation first, then changelog entry.
**Warning signs:** QA or users report cryptic text in changelog modal.

### Pitfall 5: Zustand Migration Not Triggered

**What goes wrong:** Existing users don't get the new `lastSeenVersion` field.
**Why it happens:** Forgot to increment `version` number in persist config.
**How to avoid:** Always increment version when adding/changing persisted fields.
**Warning signs:** `lastSeenVersion` undefined for existing users after update.

## Code Examples

Verified patterns from official sources and existing codebase:

### compare-versions Usage

```typescript
// Source: https://github.com/omichelsen/compare-versions
import { compareVersions, compare } from 'compare-versions'

// Basic comparison
compareVersions('0.10.0', '0.9.0') // 1 (first is greater)
compareVersions('0.9.0', '0.10.0') // -1 (second is greater)
compareVersions('1.0.0', '1.0.0') // 0 (equal)

// Prerelease handling (per semver spec)
compareVersions('0.3.0', '0.3.0-beta') // 1 (release > prerelease)
compareVersions('0.3.0-beta.2', '0.3.0-beta.1') // 1

// Human-readable operators
compare('0.10.0', '0.9.0', '>') // true
compare('0.3.0', '0.3.0-beta', '>') // true
```

### Extending Zustand Store (Existing Pattern)

```typescript
// Source: Existing preferences-store.ts pattern
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PreferencesStore {
  // ...existing...
  lastSeenVersion: string | null
  setLastSeenVersion: (version: string) => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      // ...existing fields...
      lastSeenVersion: null,
      setLastSeenVersion: (version) => set({ lastSeenVersion: version })
    }),
    {
      name: STORAGE_KEYS.PREFERENCES,
      version: 1, // Increment from 0 (implicit default)
      migrate: (persisted, version) => {
        if (version === 0) {
          return { ...(persisted as object), lastSeenVersion: null }
        }
        return persisted as PreferencesStore
      }
    }
  )
)
```

### Changelog Data File Pattern

```typescript
// src/data/changelog.ts
import type { ChangelogData } from '@/types/changelog'

export const changelog: ChangelogData = [
  {
    version: '0.4.0-beta',
    date: '2026-01-30',
    features: [{ key: 'changelog.0_4_0.feature_wantlist' }],
    improvements: [{ key: 'changelog.0_4_0.improvement_performance' }]
  },
  {
    version: '0.3.0-beta',
    date: '2026-01-15',
    features: [
      { key: 'changelog.0_3_0.feature_filters' },
      { key: 'changelog.0_3_0.feature_search' }
    ],
    fixes: [{ key: 'changelog.0_3_0.fix_offline_sync' }]
  }
]
```

### useChangelog Hook Pattern

```typescript
// src/hooks/use-changelog.ts
import { useMemo } from 'react'
import { compare } from 'compare-versions'

import { APP_VERSION } from '@/lib/constants'
import { changelog } from '@/data/changelog'
import { usePreferencesStore } from '@/stores/preferences-store'
import type { ChangelogVersion } from '@/types/changelog'

export type ChangelogResult =
  | { hasEntries: true; versions: ChangelogVersion[] }
  | {
      hasEntries: false
      reason: 'first-install' | 'up-to-date' | 'no-user-entries'
    }

export function useChangelog(): ChangelogResult {
  const lastSeenVersion = usePreferencesStore((state) => state.lastSeenVersion)

  return useMemo(() => {
    // First install: no previous version stored
    if (lastSeenVersion === null) {
      return { hasEntries: false, reason: 'first-install' }
    }

    // Filter to versions newer than lastSeenVersion
    const newVersions = changelog.filter((entry) =>
      compare(entry.version, lastSeenVersion, '>')
    )

    if (newVersions.length === 0) {
      return { hasEntries: false, reason: 'up-to-date' }
    }

    // Check if any version has user-facing entries
    const hasUserEntries = newVersions.some(
      (v) => v.features?.length || v.improvements?.length || v.fixes?.length
    )

    if (!hasUserEntries) {
      return { hasEntries: false, reason: 'no-user-entries' }
    }

    return { hasEntries: true, versions: newVersions }
  }, [lastSeenVersion])
}
```

## State of the Art

| Old Approach          | Current Approach         | When Changed      | Impact                                              |
| --------------------- | ------------------------ | ----------------- | --------------------------------------------------- |
| Manual semver parsing | compare-versions library | Stable since 2020 | Reliable prerelease handling                        |
| Zustand v4 persist    | Zustand v5 persist       | Late 2024         | No auto-store of initial state; explicit migrations |

**Notes on Zustand v5:**

- The project uses Zustand 5.0.10
- v5 removed automatic storage of initial state during store creation
- Migration functions are strongly typed with `unknown` persisted state
- Must explicitly cast in migrate function

## Open Questions

Things that couldn't be fully resolved:

1. **Translation key naming convention**
   - What we know: i18next keys use dot notation (e.g., `settings.about.changelog`)
   - What's unclear: Best pattern for version-specific keys (dots vs underscores in version numbers)
   - Recommendation: Use underscores for versions: `changelog.0_3_0_beta.feature_name` (dots within version would create deep nesting)

2. **Markdown rendering in entries**
   - What we know: Decision says "Markdown supported in entry descriptions"
   - What's unclear: Which markdown features? Full markdown or limited subset?
   - Recommendation: Phase 2 concern (modal rendering). For Phase 1, just store strings with markdown syntax.

## Sources

### Primary (HIGH confidence)

- Existing codebase: `preferences-store.ts`, `constants.ts`, `storage-keys.ts`, `i18n-provider.tsx`
- [compare-versions GitHub](https://github.com/omichelsen/compare-versions) - API, TypeScript support, prerelease handling
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/middlewares/persist) - Version migration patterns

### Secondary (MEDIUM confidence)

- [Semantic Versioning 2.0.0](https://semver.org/) - Prerelease ordering specification (alpha < beta < rc < release)
- [npm semver docs](https://docs.npmjs.com/cli/v6/using-npm/semver/) - Prerelease precedence rules

### Tertiary (LOW confidence)

- WebSearch for TypeScript data patterns - general best practices, nothing specific

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - compare-versions is well-established, Zustand patterns already in codebase
- Architecture: HIGH - straightforward extension of existing patterns
- Pitfalls: HIGH - semver gotchas well-documented, first-install edge case from context decisions

**Research date:** 2026-01-29
**Valid until:** 60 days (stable domain, no fast-moving dependencies)

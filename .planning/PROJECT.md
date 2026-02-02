# User-Friendly Changelog

## What This Is

A changelog system for VinylDeck that presents version updates in a user-friendly format. When users open the app after a new release, they see a responsive modal (Dialog on desktop, Drawer on mobile) with what changed — written in plain language, not commit messages. The modal supports multiple missed versions in an accordion view and can be revisited from Settings.

## Core Value

Users know what's new without deciphering technical changelogs.

## Requirements

### Validated

- ✓ Responsive changelog modal (Dialog on desktop, Drawer on mobile) — v1.0
- ✓ Manual changelog curation file (separate from release-please) — v1.0
- ✓ Version detection on app load — v1.0
- ✓ Dismissal tracking (store last-seen version) — v1.0
- ✓ Show all missed versions (latest expanded, older collapsed) — v1.0
- ✓ No modal if release has no user-facing changelog entries — v1.0
- ✓ "View Changelog" button in Settings opens the modal — v1.0
- ✓ Categories: New Features, Bug Fixes, Improvements (no emojis) — v1.0

### Active

- [ ] Cross-tab dismissal sync (dismiss in one tab updates all tabs) — deferred from v1.0

### Out of Scope

- AI-generated changelog — deferred, manual curation for now
- Push notifications for new versions — not requested
- Changelog search/filter — overkill for this use case
- Auto-dismiss timer — hostile UX
- Blocking modal (no backdrop click) — 43% abandonment rate

## Context

Shipped v1.0 with ~1,400 LOC TypeScript across 17 source files.

Tech stack additions:

- compare-versions ^6.1.1 for semver comparison
- vaul (Drawer component via shadcn)
- @radix-ui/react-accordion

Integration points:

- Zustand preferences-store with lastSeenVersion persistence
- Authenticated layout with ChangelogAutoTrigger
- Settings page with "What's New" button

## Constraints

- **UI Pattern**: Uses responsive Dialog/Drawer pattern from shadcn
- **Storage**: Uses existing Zustand patterns with localStorage persistence
- **Styling**: No emojis in categories, matches existing VinylDeck design
- **i18n**: All user-facing text translatable (EN + NO complete)

## Key Decisions

| Decision                          | Rationale                                                | Outcome |
| --------------------------------- | -------------------------------------------------------- | ------- |
| Manual curation over AI-generated | Simpler to start, full control over messaging            | ✓ Good  |
| Collapsed missed versions         | Prevents overwhelming users who missed multiple releases | ✓ Good  |
| Responsive Dialog/Drawer          | shadcn best practice for mobile UX                       | ✓ Good  |
| 750ms delay before modal          | Allows UI to settle after auth completes                 | ✓ Good  |
| Ref guard before timer            | Prevents StrictMode double-trigger                       | ✓ Good  |
| buildEntries helper               | TypeScript exactOptionalPropertyTypes compliance         | ✓ Good  |
| lastSeenVersion null for first    | Distinguishes first-install from "saw version X"         | ✓ Good  |

---

_Last updated: 2026-01-29 after v1.0 milestone_

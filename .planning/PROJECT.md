# User-Friendly Changelog

## What This Is

A changelog system for VinylDeck that presents version updates in a user-friendly format. When users open the app after a new release, they see a modal with what changed — written in plain language, not commit messages. The modal is responsive (Dialog on desktop, Drawer on mobile) and can be revisited from Settings.

## Core Value

Users know what's new without deciphering technical changelogs.

## Requirements

### Validated

- VinylDeck PWA with offline-first architecture — existing
- Settings page with About section — existing
- APP_VERSION constant from package.json — existing
- Zustand stores with localStorage persistence — existing
- shadcn/ui component library — existing

### Active

- [ ] Responsive changelog modal (Dialog on desktop, Drawer on mobile)
- [ ] Manual changelog curation file (separate from release-please)
- [ ] Version detection on app load
- [ ] Dismissal tracking (store last-seen version)
- [ ] Show all missed versions (latest expanded, older collapsed)
- [ ] No modal if release has no user-facing changelog entries
- [ ] "View Changelog" button in Settings opens the modal
- [ ] Categories: New Features, Bug Fixes, Improvements (no emojis)

### Out of Scope

- AI-generated changelog — deferred, manual curation for now
- Hybrid commit syntax — unnecessary complexity for v1
- Push notifications for new versions — not requested
- Changelog search/filter — overkill for this use case

## Context

VinylDeck is a vinyl collection manager PWA that syncs with Discogs. The existing codebase uses:

- React 19 with TanStack Router (file-based routing)
- shadcn/ui (new-york style) for UI components
- Zustand for client state (auth-store, preferences-store)
- TanStack Query for server state
- i18next for internationalization

The Settings page already has a disabled changelog placeholder in the About section. The `APP_VERSION` constant is already exported from `src/lib/constants.ts`.

release-please generates `CHANGELOG.md` with conventional commit format — too technical for end users.

## Constraints

- **UI Pattern**: Must use responsive Dialog/Drawer pattern from shadcn (Dialog on desktop, Drawer on mobile)
- **Storage**: Use existing Zustand patterns with localStorage persistence
- **Styling**: No emojis in categories, match existing VinylDeck design
- **i18n**: All user-facing text must be translatable

## Key Decisions

| Decision                          | Rationale                                                | Outcome   |
| --------------------------------- | -------------------------------------------------------- | --------- |
| Manual curation over AI-generated | Simpler to start, full control over messaging            | — Pending |
| Collapsed missed versions         | Prevents overwhelming users who missed multiple releases | — Pending |
| Responsive Dialog/Drawer          | shadcn best practice for mobile UX                       | — Pending |

---

_Last updated: 2026-01-29 after initialization_

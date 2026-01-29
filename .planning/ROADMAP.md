# Roadmap: User-Friendly Changelog

## Overview

Three-phase delivery: establish data format and version detection infrastructure, build responsive modal UI components, then integrate triggers into app flow. Each phase delivers a complete, testable capability. Research indicates all patterns are established in the codebase (HIGH confidence).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data & Detection** - Changelog data format, version comparison, preferences store extension
- [ ] **Phase 2: Modal Components** - Responsive Dialog/Drawer, content display with categories and animations
- [ ] **Phase 3: Integration** - Auto-trigger on version change, settings access, hydration gating

## Phase Details

### Phase 1: Data & Detection

**Goal**: Infrastructure for changelog data and version change detection
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, VERS-01, VERS-02, VERS-03, VERS-04
**Success Criteria** (what must be TRUE):

1. Curated changelog data file exists with typed entries (version, date, categorized items)
2. Version comparison correctly orders 0.9 < 0.10 (numeric tuple parsing)
3. preferences-store has lastSeenVersion field persisted to localStorage
4. useChangelog hook returns entries newer than lastSeenVersion
5. Hook returns empty array when no user-facing entries exist for new version

**Plans:** 2 plans

Plans:

- [ ] 01-01-PLAN.md - Types, data file, and compare-versions library
- [ ] 01-02-PLAN.md - Preferences store extension and useChangelog hook

### Phase 2: Modal Components

**Goal**: Responsive changelog modal with categorized content display
**Depends on**: Phase 1
**Requirements**: MODAL-01, MODAL-02, MODAL-03, MODAL-04, MODAL-05, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05
**Success Criteria** (what must be TRUE):

1. Modal renders as Dialog on desktop (>=768px) and Drawer on mobile (<768px)
2. Modal dismisses via X button, Escape key, and backdrop click
3. Current version number displays in modal header
4. Entries grouped by category (New Features, Bug Fixes, Improvements) with visual badges
5. Multiple missed versions appear in accordion (latest expanded, older collapsed)

**Plans:** 3 plans

Plans:

- [ ] 02-01-PLAN.md - Install shadcn components, Badge variants, date formatter
- [ ] 02-02-PLAN.md - Responsive modal wrapper and content components
- [ ] 02-03-PLAN.md - Multi-version accordion and i18n translations

### Phase 3: Integration

**Goal**: Modal triggers correctly in app flow and is accessible from settings
**Depends on**: Phase 2
**Requirements**: TRIG-01, TRIG-02, TRIG-03
**Success Criteria** (what must be TRUE):

1. Modal appears automatically on app load when new version has entries
2. "View Changelog" button in Settings > About opens modal manually
3. Modal never triggers during hydration, OAuth flow, or loading states
4. After dismissal, lastSeenVersion updates and modal does not reappear

**Plans:** 2 plans

Plans:

- [ ] 03-01-PLAN.md - Auto-trigger hook and layout integration
- [ ] 03-02-PLAN.md - Settings "What's New" button and i18n

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase               | Plans Complete | Status      | Completed |
| ------------------- | -------------- | ----------- | --------- |
| 1. Data & Detection | 0/2            | Not started | -         |
| 2. Modal Components | 0/3            | Not started | -         |
| 3. Integration      | 0/2            | Not started | -         |

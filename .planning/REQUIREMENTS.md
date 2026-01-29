# Requirements: User-Friendly Changelog

**Defined:** 2026-01-29
**Core Value:** Users know what's new without deciphering technical changelogs

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Modal Component

- [x] **MODAL-01**: Responsive modal renders Dialog on desktop, Drawer on mobile
- [x] **MODAL-02**: Modal can be dismissed via X button
- [x] **MODAL-03**: Modal can be dismissed via Escape key
- [x] **MODAL-04**: Modal can be dismissed via backdrop/outside click
- [x] **MODAL-05**: Modal displays current version number in header

### Content Display

- [x] **CONT-01**: Changelog entries grouped by category (New Features, Bug Fixes, Improvements)
- [x] **CONT-02**: Entries ordered chronologically (newest first)
- [x] **CONT-03**: Categories display visual badges (no emojis)
- [x] **CONT-04**: Multiple missed versions shown in accordion (latest expanded, older collapsed)
- [x] **CONT-05**: Smooth entry animations on modal open

### Version Detection

- [x] **VERS-01**: App detects version change on load by comparing current vs last-seen
- [x] **VERS-02**: Last-seen version persisted to localStorage via preferences store
- [x] **VERS-03**: Modal only triggers if new version has user-facing changelog entries
- [x] **VERS-04**: Version comparison handles semver correctly (0.9 < 0.10)

### Triggers & Access

- [x] **TRIG-01**: Modal appears automatically on app load when new version with entries detected
- [x] **TRIG-02**: Changelog button in Settings > About opens modal manually
- [x] **TRIG-03**: Modal gated behind hydration to prevent false triggers on refresh

### Data & Infrastructure

- [x] **DATA-01**: Curated changelog data stored in TypeScript/JSON format
- [x] **DATA-02**: Changelog entries support i18n via translation keys
- [x] **DATA-03**: Data structure supports version, date, and categorized entries

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Sync

- **SYNC-01**: Cross-tab dismissal sync (dismiss in one tab updates all tabs)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                            | Reason                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| AI-generated changelog             | Deferred - manual curation for now, full control over messaging |
| Auto-dismiss timer                 | Hostile UX - let users read at their own pace                   |
| Blocking modal (no backdrop click) | 43% abandonment rate - always allow exit                        |
| Full changelog inline              | Overwhelming - link to GitHub releases if needed                |
| Toast for changelog                | Not suitable for multi-version detailed content                 |
| Forced acknowledgment button       | Adds friction, hostile UX                                       |
| Real-time update notification      | PWA handles this separately via service worker                  |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status   |
| ----------- | ----- | -------- |
| DATA-01     | 1     | Complete |
| DATA-02     | 1     | Complete |
| DATA-03     | 1     | Complete |
| VERS-01     | 1     | Complete |
| VERS-02     | 1     | Complete |
| VERS-03     | 1     | Complete |
| VERS-04     | 1     | Complete |
| MODAL-01    | 2     | Complete |
| MODAL-02    | 2     | Complete |
| MODAL-03    | 2     | Complete |
| MODAL-04    | 2     | Complete |
| MODAL-05    | 2     | Complete |
| CONT-01     | 2     | Complete |
| CONT-02     | 2     | Complete |
| CONT-03     | 2     | Complete |
| CONT-04     | 2     | Complete |
| CONT-05     | 2     | Complete |
| TRIG-01     | 3     | Complete |
| TRIG-02     | 3     | Complete |
| TRIG-03     | 3     | Complete |

**Coverage:**

- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---

_Requirements defined: 2026-01-29_
_Last updated: 2026-01-29 after Phase 3 completion_

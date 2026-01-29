# Requirements: User-Friendly Changelog

**Defined:** 2026-01-29
**Core Value:** Users know what's new without deciphering technical changelogs

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Modal Component

- [ ] **MODAL-01**: Responsive modal renders Dialog on desktop, Drawer on mobile
- [ ] **MODAL-02**: Modal can be dismissed via X button
- [ ] **MODAL-03**: Modal can be dismissed via Escape key
- [ ] **MODAL-04**: Modal can be dismissed via backdrop/outside click
- [ ] **MODAL-05**: Modal displays current version number in header

### Content Display

- [ ] **CONT-01**: Changelog entries grouped by category (New Features, Bug Fixes, Improvements)
- [ ] **CONT-02**: Entries ordered chronologically (newest first)
- [ ] **CONT-03**: Categories display visual badges (no emojis)
- [ ] **CONT-04**: Multiple missed versions shown in accordion (latest expanded, older collapsed)
- [ ] **CONT-05**: Smooth entry animations on modal open

### Version Detection

- [ ] **VERS-01**: App detects version change on load by comparing current vs last-seen
- [ ] **VERS-02**: Last-seen version persisted to localStorage via preferences store
- [ ] **VERS-03**: Modal only triggers if new version has user-facing changelog entries
- [ ] **VERS-04**: Version comparison handles semver correctly (0.9 < 0.10)

### Triggers & Access

- [ ] **TRIG-01**: Modal appears automatically on app load when new version with entries detected
- [ ] **TRIG-02**: Changelog button in Settings > About opens modal manually
- [ ] **TRIG-03**: Modal gated behind hydration to prevent false triggers on refresh

### Data & Infrastructure

- [ ] **DATA-01**: Curated changelog data stored in TypeScript/JSON format
- [ ] **DATA-02**: Changelog entries support i18n via translation keys
- [ ] **DATA-03**: Data structure supports version, date, and categorized entries

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

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| MODAL-01    | TBD   | Pending |
| MODAL-02    | TBD   | Pending |
| MODAL-03    | TBD   | Pending |
| MODAL-04    | TBD   | Pending |
| MODAL-05    | TBD   | Pending |
| CONT-01     | TBD   | Pending |
| CONT-02     | TBD   | Pending |
| CONT-03     | TBD   | Pending |
| CONT-04     | TBD   | Pending |
| CONT-05     | TBD   | Pending |
| VERS-01     | TBD   | Pending |
| VERS-02     | TBD   | Pending |
| VERS-03     | TBD   | Pending |
| VERS-04     | TBD   | Pending |
| TRIG-01     | TBD   | Pending |
| TRIG-02     | TBD   | Pending |
| TRIG-03     | TBD   | Pending |
| DATA-01     | TBD   | Pending |
| DATA-02     | TBD   | Pending |
| DATA-03     | TBD   | Pending |

**Coverage:**

- v1 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20

---

_Requirements defined: 2026-01-29_
_Last updated: 2026-01-29 after initial definition_

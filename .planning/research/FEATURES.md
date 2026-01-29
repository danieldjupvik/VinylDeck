# Feature Research: Changelog UI

**Domain:** User-facing changelog / "What's New" modal for PWA
**Researched:** 2026-01-29
**Confidence:** HIGH (based on established UX patterns and industry best practices)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature                | Why Expected                                                      | Complexity | Notes                                             |
| ---------------------- | ----------------------------------------------------------------- | ---------- | ------------------------------------------------- |
| Dismiss button (X)     | 43% of users abandon apps when they can't easily dismiss overlays | LOW        | Must be visible, keyboard accessible (Escape key) |
| Version number display | Users need to confirm they're on latest version                   | LOW        | Already have `APP_VERSION` constant               |
| Categorized entries    | Users scan for specific types (fixes vs features)                 | LOW        | Use: New Features, Bug Fixes, Improvements        |
| Chronological ordering | Users expect newest first                                         | LOW        | Reverse chronological (latest at top)             |
| Clear exit path        | Users need control over dismissal                                 | LOW        | Both X button and CTA should close modal          |
| Persist dismissal      | Users don't want to see same changelog repeatedly                 | LOW        | Store `lastSeenVersion` in localStorage           |
| Settings page access   | Users want to revisit changelog later                             | LOW        | Placeholder already exists in settings            |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature                         | Value Proposition                                                  | Complexity | Notes                                                                          |
| ------------------------------- | ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------ |
| Accordion for multiple versions | Shows missed versions without overwhelming                         | MEDIUM     | Latest expanded, older collapsed. Use multi-expand pattern per NN/G guidelines |
| Visual category indicators      | Color-coded badges help scanning                                   | LOW        | Icons or colored tags per category                                             |
| Silent skip for empty releases  | Respects user attention by not showing modal for dev-only releases | MEDIUM     | Check if release has any user-facing entries                                   |
| Smooth entry animation          | Feels polished, not jarring                                        | LOW        | Use existing `animate-in` patterns from codebase                               |
| Cross-tab sync                  | Dismissing in one tab dismisses in all                             | MEDIUM     | Already have cross-tab patterns via Zustand storage events                     |
| Reduced motion support          | Accessibility for users with vestibular disorders                  | LOW        | Already configured in codebase CSS                                             |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature                            | Why Requested                   | Why Problematic                                            | Alternative                                             |
| ---------------------------------- | ------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| Auto-dismiss timer                 | "Users will read it eventually" | Rushed reading, accessibility issues, frustrating          | Let users dismiss when ready                            |
| "Don't show again" checkbox        | "Reduce annoyance"              | Users miss important updates, complicates version tracking | Show modal only for unseen versions, always dismissable |
| Blocking modal (no backdrop click) | "Ensure users read"             | Hostile UX, 43% abandonment rate                           | Non-blocking with clear exit options                    |
| Full changelog inline              | "Complete transparency"         | Overwhelming, kills engagement                             | Link to external full changelog (GitHub releases)       |
| Toast notification                 | "Less intrusive"                | Not suitable for multi-version or detailed content         | Use modal for changelog, toasts for single-line alerts  |
| Forced acknowledgment button       | "Confirm they saw it"           | Hostile, adds friction                                     | Allow any exit (X, Escape, outside click)               |
| Real-time update notification      | "Keep users current"            | PWA already handles this via service worker                | Separate "New version available" toast pattern          |

## Feature Dependencies

```
[Version Comparison Logic]
    └──requires──> [APP_VERSION constant] (exists)
                       └──requires──> [Build-time injection] (exists)

[Modal Component]
    └──requires──> [shadcn Dialog] (exists)
    └──requires──> [Changelog Data] (needs generation)

[Settings Page Link]
    └──enhances──> [Modal Component]
    └──requires──> [Placeholder removal] (exists, disabled)

[Multi-version Accordion]
    └──requires──> [Version Comparison Logic]
    └──requires──> [Changelog Data]
    └──requires──> [shadcn Accordion] (exists)

[Cross-tab Sync]
    └──requires──> [Zustand store with lastSeenVersion]
    └──enhances──> [Modal dismissal]

[Silent Skip Logic]
    └──requires──> [Changelog Data with category flags]
    └──enhances──> [Modal trigger logic]
```

### Dependency Notes

- **Modal requires Dialog**: shadcn/ui Dialog component already available
- **Version comparison**: Can use simple string comparison for semver-style versions, or use lightweight semver library
- **Changelog data generation**: release-please already generates CHANGELOG.md, needs transformation to JSON for runtime use
- **Cross-tab sync uses existing patterns**: Same approach as auth store already uses

## MVP Definition

### Launch With (v1)

Minimum viable product - what's needed to validate the concept.

- [x] Modal appears on app load when new version detected
- [x] Shows entries for latest version (single version view)
- [x] Categorized entries: New Features, Bug Fixes, Improvements
- [x] Dismiss button (X) and outside click to close
- [x] Store lastSeenVersion in localStorage
- [x] Settings page link to reopen changelog
- [x] No modal if release has no user-facing entries

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Multi-version accordion (show missed versions) - when users report missing updates
- [ ] Cross-tab dismissal sync - when multi-tab usage is confirmed common
- [ ] Visual polish: icons per category, subtle animations - when MVP feels stable

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] External link to GitHub releases - low priority, power user feature
- [ ] Analytics on changelog engagement - premature optimization

## Feature Prioritization Matrix

| Feature                    | User Value | Implementation Cost | Priority |
| -------------------------- | ---------- | ------------------- | -------- |
| Dismiss button + persist   | HIGH       | LOW                 | P1       |
| Categorized entries        | HIGH       | LOW                 | P1       |
| Version detection          | HIGH       | LOW                 | P1       |
| Settings page access       | MEDIUM     | LOW                 | P1       |
| Silent skip empty releases | MEDIUM     | MEDIUM              | P1       |
| Multi-version accordion    | MEDIUM     | MEDIUM              | P2       |
| Visual category indicators | LOW        | LOW                 | P2       |
| Cross-tab sync             | LOW        | MEDIUM              | P3       |
| Smooth animations          | LOW        | LOW                 | P2       |

**Priority key:**

- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature             | GitHub             | Notion        | Linear       | Our Approach                 |
| ------------------- | ------------------ | ------------- | ------------ | ---------------------------- |
| Modal on update     | No (releases page) | Yes, slideout | Yes, modal   | Modal with dismiss           |
| Categories          | Yes (headings)     | No (prose)    | Yes (badges) | Badges + icons               |
| Multi-version       | No                 | No            | No           | Accordion (differentiator)   |
| Dismiss persistence | N/A                | Yes           | Yes          | localStorage lastSeenVersion |
| Settings access     | N/A                | No            | Settings     | Settings > About             |
| Empty release skip  | N/A                | Unknown       | Unknown      | Yes (differentiator)         |

## Implementation Considerations

### Changelog Data Pipeline

1. release-please generates `CHANGELOG.md` at release time
2. Build script parses CHANGELOG.md into JSON structure
3. JSON bundled with app or fetched at runtime
4. Format needed:

```typescript
interface ChangelogVersion {
  version: string
  date: string
  entries: ChangelogEntry[]
}

interface ChangelogEntry {
  category: 'feature' | 'fix' | 'improvement'
  message: string
  prNumber?: number
}
```

### Version Comparison Strategy

Simple approach for semver comparison:

- Compare version strings as arrays of numbers
- No need for full semver library for basic > comparison
- Already have `APP_VERSION` constant injected at build time

### Storage Key

Add to existing `STORAGE_KEYS`:

```typescript
LAST_SEEN_VERSION: 'vinyldeck-last-seen-version'
```

Or extend preferences store:

```typescript
lastSeenVersion: string | null
```

Recommendation: Use preferences store for consistency with existing patterns.

## Sources

### UX Patterns & Best Practices

- [Modal UX Design for SaaS in 2026](https://userpilot.com/blog/modal-ux-design/) - Modal timing, dismiss patterns
- [Mastering Modal UX](https://www.eleken.co/blog-posts/modal-ux) - Exit options, user control
- [NN/G Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/) - Multi-expand vs auto-collapse
- [LogRocket Modal UX Design](https://blog.logrocket.com/ux-design/modal-ux-design-patterns-examples-best-practices/) - Blocking vs non-blocking

### Changelog Organization

- [Whatfix: How to Keep a Changelog](https://whatfix.com/blog/changelog/) - Category structure
- [Getbeamer: 11 Best Practices](https://www.getbeamer.com/blog/11-best-practices-for-changelogs) - Visual indicators

### PWA Update Patterns

- [Dean Hume: New Version Available PWA](https://deanhume.com/displaying-a-new-version-available-progressive-web-app/) - Service worker detection
- [Vite PWA: Periodic Updates](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates) - Update checking

### Version Storage

- [DEV: Using Local Storage for User Visits](https://dev.to/riapacheco/using-local-storage-for-remembering-user-visits-coe) - Version-based notification pattern

---

_Feature research for: User-friendly changelog UI_
_Researched: 2026-01-29_

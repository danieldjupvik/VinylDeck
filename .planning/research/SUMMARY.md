# Project Research Summary

**Project:** User-Friendly Changelog Modal
**Domain:** PWA update notification UI
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

VinylDeck needs an in-app changelog system to communicate updates to users without interrupting their workflow. Research shows the standard approach is a responsive modal (desktop Dialog, mobile Drawer) triggered from settings, with dismissal state persisted to prevent repeat shows. The feature requires zero new dependencies beyond shadcn's Drawer component (vaul), leveraging existing infrastructure: Zustand preferences store for dismissal tracking, simple version comparison for detection, and curated JSON data format for i18n-compatible entries.

The recommended architecture uses a hook-based pattern (`useChangelog`) that compares `APP_VERSION` against stored `lastSeenVersion`, filtering a static changelog.json data file. Modal UI splits responsively at 768px breakpoint using existing `useIsMobile` hook. Key insight: avoid auto-showing on app load (modal fatigue), instead use badge indicator on settings page and let users initiate. This respects user attention while keeping changelog easily accessible.

Critical risks center on version comparison (string comparison breaks at 0.9→0.10), cross-tab sync (dismissals must propagate), and modal timing (never interrupt OAuth/loading flows). Mitigation: numeric version comparison from day one, reuse existing cross-tab sync patterns from auth store, gate modal trigger behind authenticated stable routes. All risks have clear prevention strategies from existing codebase patterns.

## Key Findings

### Recommended Stack

All required components exist in the codebase except shadcn Drawer. The project already has Dialog (Radix), ScrollArea, Badge, and the responsive detection hook. Version comparison can use simple numeric tuple parsing without external dependencies. Dismissal tracking extends the existing preferences-store pattern with a single `lastSeenVersion` field.

**Core technologies:**

- **Drawer (vaul)**: Mobile bottom sheet — shadcn's official component, Radix Dialog primitives
- **Dialog (@radix-ui)**: Desktop modal — already installed, accessible, keyboard-navigable
- **ScrollArea**: Long changelog content — already installed, handles overflow gracefully
- **Zustand preferences-store**: Dismissal persistence — extends existing store, auto localStorage sync
- **Native version comparison**: Semver detection — zero dependencies, handles X.Y.Z-beta.N format

**Installation:**

```bash
bunx shadcn@latest add drawer
```

No other dependencies required.

### Expected Features

Research identified clear table stakes vs differentiators based on industry patterns and user expectations.

**Must have (table stakes):**

- Dismiss button (X) and keyboard (Escape) — 43% abandonment rate without easy exit
- Version number display — users need confirmation they're current
- Categorized entries (Features, Fixes, Improvements) — users scan for specific types
- Persist dismissal via lastSeenVersion — users don't want repeat shows
- Settings page access — users want to revisit after dismissal

**Should have (competitive):**

- Multi-version accordion — shows missed versions without overwhelming (latest expanded)
- Visual category indicators — color-coded badges improve scanning
- Silent skip for empty releases — respects attention by hiding dev-only releases
- Cross-tab sync — dismissing in one tab propagates to all

**Defer (v2+):**

- External link to GitHub releases — low priority, power user feature
- Analytics on engagement — premature optimization
- Auto-show on version change — anti-pattern, creates modal fatigue

**Anti-features to avoid:**

- Auto-dismiss timer — rushed reading, accessibility issues
- Blocking modal (no backdrop click) — hostile UX
- Full changelog inline — overwhelming
- Forced acknowledgment button — adds friction

### Architecture Approach

Hook-based pattern with static data, no new providers. The `useChangelog` hook encapsulates version detection and filtering logic, returning state for UI components. Data flows from static JSON (tree-shaken at build) through the hook to responsive modal components.

**Major components:**

1. **useChangelog hook** — Version comparison, filtering entries newer than lastSeenVersion, markAsSeen action
2. **ChangelogModal** — Responsive wrapper (Dialog desktop, Drawer mobile) using existing useIsMobile hook
3. **ChangelogList** — ScrollArea with version entries, categorized changes with badges
4. **preferences-store extension** — Add lastSeenVersion field with setLastSeenVersion action
5. **changelog.json** — Curated data file with i18n keys, imported statically at build time

**Data format choice:** TypeScript/JSON over YAML (needs parser), Markdown (parsing complexity), or direct CHANGELOG.md parsing (machine format not user-friendly). Static import enables type safety and tree-shaking.

**Storage choice:** Extend preferences-store rather than new store, reuses existing localStorage persistence and cross-tab sync patterns.

**Version comparison:** Numeric tuple parsing (`[major, minor, patch, prerelease]`) avoids string comparison pitfalls. Handles 0.9.0 → 0.10.0 correctly. Pre-release support via Infinity sentinel for stable releases.

### Critical Pitfalls

Research identified six critical pitfalls with clear prevention strategies.

1. **Version string comparison** — Lexicographic "0.10.0" < "0.9.0" breaks ordering. Prevention: parse to numeric tuples before comparing.

2. **Hydration timing race** — Checking version before IndexedDB hydration completes triggers false positives. Prevention: use localStorage exclusively for changelog (already sync) or gate behind hydration guard.

3. **Modal interruption timing** — Showing during OAuth/login flows disrupts critical paths. Prevention: only trigger on authenticated routes, never during loading/error states.

4. **Cross-tab staleness** — Dismissal in Tab A doesn't propagate to Tab B without storage event listener. Prevention: reuse existing cross-tab sync pattern from auth-store.

5. **Undismissable modal** — No escape hatch traps users. Prevention: use Radix Dialog/Drawer primitives (already available), always allow Esc, backdrop click, close button.

6. **Missing changelog entries** — Developer ships version but forgets entry, `lastSeenVersion` advances silently. Prevention: structured JSON format with optional build-time validation.

## Implications for Roadmap

Based on research, suggested 3-phase structure prioritizing infrastructure, then UI, then polish.

### Phase 1: Core Infrastructure & Data Layer

**Rationale:** Foundation must be solid — version comparison, storage, data format all have pitfall potential. Get these right before building UI to avoid costly refactors.

**Delivers:**

- changelog.json data format with TypeScript types
- Version comparison utility (numeric tuple parsing)
- preferences-store extension (lastSeenVersion field)
- useChangelog hook (detection and filtering logic)

**Addresses features:**

- Version detection (table stakes)
- Persist dismissal (table stakes)

**Avoids pitfalls:**

- Version string comparison (numeric from start)
- Cross-tab staleness (store extension with sync)
- Hydration race (localStorage direct, no IndexedDB)
- Missing entries (structured format)

**Research needs:** Standard patterns, no phase-specific research required

### Phase 2: Modal UI Components

**Rationale:** With infrastructure solid, build responsive UI. Requires adding Drawer component and composing responsive logic. Mobile/desktop split adds complexity.

**Delivers:**

- Install shadcn Drawer (vaul)
- ChangelogModal responsive wrapper (Dialog/Drawer split)
- ChangelogList with ScrollArea
- ChangelogEntry card with categorized badges

**Addresses features:**

- Dismiss button (table stakes)
- Categorized entries (table stakes)
- Visual category indicators (competitive)
- Responsive mobile experience (table stakes)

**Uses stack:**

- Drawer (vaul) for mobile bottom sheet
- Dialog (existing) for desktop modal
- useIsMobile hook (existing) for responsive split
- ScrollArea (existing) for content overflow

**Implements architecture:**

- ChangelogModal, ChangelogList, ChangelogEntry components per architecture design

**Avoids pitfalls:**

- Undismissable modal (Radix primitives with proper exit paths)

**Research needs:** Standard shadcn patterns, no phase-specific research required

### Phase 3: Integration & Triggers

**Rationale:** With components working in isolation, integrate into app. Timing logic is subtle (avoid OAuth/loading interruption). Settings page already has placeholder.

**Delivers:**

- Settings page changelog link with "New" badge
- Proper trigger timing (authenticated routes only)
- Translation keys for en/no locales
- Manual open from settings

**Addresses features:**

- Settings page access (table stakes)
- Silent skip for empty releases (competitive)

**Avoids pitfalls:**

- Modal interruption timing (gate behind authenticated routes)

**Research needs:** Standard integration, no phase-specific research required

### Phase Ordering Rationale

- **Infrastructure first:** Version comparison and storage patterns have high pitfall density. Wrong choices force refactors. Get these right before UI.
- **UI second:** With stable data layer, component development is straightforward. Drawer component is only new dependency.
- **Integration last:** Trigger timing and route integration requires understanding app flow. Can't test timing without components.

**Dependencies:**

- Phase 2 requires Phase 1 (hook and data format)
- Phase 3 requires Phase 2 (components to integrate)
- No parallelization opportunities (linear dependency chain)

### Research Flags

**Phases with standard patterns (skip research-phase):**

- **Phase 1:** Well-documented Zustand patterns, simple version comparison
- **Phase 2:** Established shadcn component composition, existing codebase examples
- **Phase 3:** Standard route integration, i18n patterns already in use

**No phases need deeper research.** All patterns are established in codebase or shadcn documentation. If implementation hits unknowns (unlikely), use ad-hoc research rather than formal research-phase workflow.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                               |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | All components verified in shadcn docs and existing codebase                                        |
| Features     | HIGH       | Based on established UX patterns, Nielsen Norman Group, modal best practices                        |
| Architecture | HIGH       | Direct analysis of VinylDeck codebase patterns (Zustand, hooks, shadcn)                             |
| Pitfalls     | HIGH       | Specific to version comparison (well-documented), PWA timing (web.dev), modal UX (multiple sources) |

**Overall confidence:** HIGH

Research covered all decision points with authoritative sources. Stack choices verified against installed packages. Architecture patterns mirror existing code (auth-store, use-mobile, use-online-status). Pitfalls drawn from specific domain knowledge (semver edge cases, PWA update patterns, modal UX research).

### Gaps to Address

**Minor gaps (handle during implementation):**

- **First-time user experience:** Research doesn't specify whether to show modal to brand new users (lastSeenVersion = null). Recommendation: don't show until first version change to avoid "what's new" when nothing changed for them. Decision can be made during Phase 3 trigger logic.

- **Empty release handling:** Silent skip logic for releases without user-facing entries needs conditional check. Architecture specified, but exact predicate (check entry arrays?) left to implementation. Handle in Phase 1 data structure.

- **Badge count display:** Should settings page badge show count of unseen versions or just "New"? Research suggests no count (reduces notification burden). Can decide in Phase 3.

- **Accordion expand/collapse behavior:** Multi-version accordion deferred to v1.x, but when implemented, needs decision on multi-expand vs single-expand. Nielsen Norman Group recommends multi-expand. Document for future.

None of these gaps block implementation. All have reasonable defaults or can be decided with 5 minutes of discussion during implementation.

## Sources

### Primary (HIGH confidence)

- VinylDeck codebase analysis — Zustand patterns, hook patterns, existing component structure
- shadcn/ui Drawer documentation — Component API, responsive patterns
- Vaul GitHub releases — v1.1.2 compatibility verification
- Context7 `/websites/ui_shadcn` — Component verification
- Context7 `/websites/vaul_emilkowal_ski` — Drawer API verification

### Secondary (MEDIUM confidence)

- [Userpilot: Modal UX Design 2026](https://userpilot.com/blog/modal-ux-design/) — Modal timing, dismiss patterns, 43% abandonment stat
- [Eleken: Mastering Modal UX](https://www.eleken.co/blog-posts/modal-ux) — Exit options, user control
- [Nielsen Norman Group: Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/) — Multi-expand patterns
- [LogRocket: Modal UX Design](https://blog.logrocket.com/ux-design/modal-ux-design-patterns-examples-best-practices/) — Blocking vs non-blocking
- [Whatfix: How to Keep a Changelog](https://whatfix.com/blog/changelog/) — Category structure
- [Getbeamer: 11 Best Practices](https://www.getbeamer.com/blog/11-best-practices-for-changelogs) — Visual indicators
- [Dean Hume: New Version Available PWA](https://deanhume.com/displaying-a-new-version-available-progressive-web-app/) — Service worker detection
- [Vite PWA: Periodic Updates](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates) — Update checking
- [web.dev: PWA Update Patterns](https://web.dev/learn/pwa/update) — Update notification best practices
- [Thoughtspile: SemVer Tricky Parts](https://thoughtspile.github.io/2021/11/08/semver-challenges/) — Version comparison edge cases (0.9→0.10)

### Tertiary (LOW confidence)

- Various changelog versioning and badge UX articles — Supporting context for decisions

---

_Research completed: 2026-01-29_
_Ready for roadmap: yes_

# Pitfalls Research

**Domain:** Changelog/What's New UI for PWA
**Researched:** 2026-01-29
**Confidence:** MEDIUM (based on web search patterns + PWA-specific knowledge)

## Critical Pitfalls

### Pitfall 1: Version Comparison String vs Semantic

**What goes wrong:**
Storing and comparing versions as strings causes incorrect ordering. `"0.10.0" < "0.9.0"` evaluates true because string comparison is lexicographic, not semantic. Users see changelog for versions they've already seen, or miss versions entirely.

**Why it happens:**
Developers store `lastSeenVersion` as a raw string from `package.json` and use simple string comparison. Works during development when versions increment predictably (0.3.0 → 0.3.1) but breaks at minor/major bumps.

**How to avoid:**

- Parse versions into numeric tuples `[major, minor, patch]` before comparing
- Use a tiny version comparison helper (no need for full `semver` library)
- Test with version jump scenarios: `0.9.0 → 0.10.0`, `0.3.1 → 1.0.0`

**Warning signs:**

- Changelog modal shows for versions user has already dismissed
- Modal never appears after major version bump
- Unit tests only cover simple increments

**Phase to address:**
Phase 1 (Core Infrastructure) - Version comparison utility

---

### Pitfall 2: Premature Version Detection Timing

**What goes wrong:**
Checking for new version immediately on app load, before IndexedDB hydration completes. The stored `lastSeenVersion` hasn't been restored yet, so every page load triggers the "new version" flow.

**Why it happens:**
VinylDeck uses IndexedDB for persistent cache (via TanStack Query). IndexedDB is async. Checking version before hydration means localStorage values are available but cross-session state isn't ready.

**How to avoid:**

- Gate version check behind `useHydrationGuard` pattern already in codebase
- Or use localStorage exclusively for changelog state (simpler, already sync)
- Add explicit "hydration complete" check before triggering modal

**Warning signs:**

- Changelog modal shows on every hard refresh
- Modal appears briefly then disappears (race condition)
- Different behavior on soft nav vs hard reload

**Phase to address:**
Phase 1 (Core Infrastructure) - Storage layer decision

---

### Pitfall 3: Modal Interruption at Wrong Time

**What goes wrong:**
Showing changelog modal immediately on login or during critical flows (OAuth callback, collection loading). User sees changelog before they even know they're logged in, or modal blocks error recovery.

**Why it happens:**
Triggering modal on "app ready" without considering user context. OAuth callback page is technically "app ready" but user is mid-flow.

**How to avoid:**

- Only show on authenticated routes (not login, not oauth-callback)
- Add 1-2 second delay after navigation settles
- Never show during loading states or error boundaries
- Consider showing on second interaction (route change) not first mount

**Warning signs:**

- Users dismiss modal without reading (muscle memory)
- Support tickets about "weird popup during login"
- Modal appears over error toasts

**Phase to address:**
Phase 2 (Trigger Logic) - Route/context awareness

---

### Pitfall 4: localStorage Cross-Tab Staleness

**What goes wrong:**
User opens app in Tab A, sees changelog, dismisses it. Tab B was already open - still shows changelog because it cached the old `lastSeenVersion`. Or worse: Tab B dismisses and overwrites Tab A's newer state.

**Why it happens:**
localStorage changes don't automatically propagate to in-memory state. Zustand store initializes once on mount. Without `storage` event listener, tabs diverge.

**How to avoid:**

- VinylDeck already has cross-tab sync pattern in auth store - reuse it
- Listen to `storage` event and sync changelog state
- Or use Zustand's built-in storage subscribe option

**Warning signs:**

- "I dismissed this already" user complaints
- Modal shows differently in different tabs
- Testing only in single tab

**Phase to address:**
Phase 1 (Core Infrastructure) - Storage layer with sync

---

### Pitfall 5: Undismissable Modal (Accessibility/UX)

**What goes wrong:**
Modal has no escape hatch. Close button in top-right requires thumb stretch on mobile. Clicking backdrop does nothing. Esc key doesn't work. User is trapped.

**Why it happens:**
Using custom modal instead of Radix Dialog (which handles this). Or explicitly disabling escape routes "so users read it."

**How to avoid:**

- Use Radix Dialog/Drawer primitives (VinylDeck already has these)
- Always allow: Esc key, backdrop click, explicit close button
- Mobile: bottom sheet or full-screen with close in reach zone
- Never force engagement - changelog is informational, not mandatory

**Warning signs:**

- Accessibility audit failures
- "How do I close this" user feedback
- Modal component not from `@/components/ui/`

**Phase to address:**
Phase 2 (Modal Component) - Use existing Dialog/Drawer primitives

---

### Pitfall 6: Missing Entries After Manual Curation Skip

**What goes wrong:**
Manually curated changelog. Developer ships v0.4.0 but forgets to add entry. User updates, `lastSeenVersion` advances to 0.4.0, but they never saw changelog (because it was empty). Next release 0.4.1 only shows 0.4.1 changes - they missed 0.4.0 context.

**Why it happens:**
No validation that changelog entries exist for shipped versions. Silent failure - build succeeds, deploy succeeds, just no content.

**How to avoid:**

- Consider build-time check: warn if `package.json` version has no changelog entry
- Keep entries in a structured format (JSON/TS array) that can be validated
- Include "no changes to report" placeholder rather than nothing

**Warning signs:**

- Empty modal appearing
- Gap in changelog entry versions
- No CI check for changelog coverage

**Phase to address:**
Phase 1 (Data Structure) - Structured entries + optional build validation

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut                         | Immediate Benefit  | Long-term Cost                                  | When Acceptable                               |
| -------------------------------- | ------------------ | ----------------------------------------------- | --------------------------------------------- |
| Hardcoded changelog in component | Ship faster        | Every update requires code change, bundle grows | Never - data should be separate               |
| String version comparison        | Less code          | Breaks at 0.9→0.10 boundary                     | Never - use numeric comparison                |
| localStorage only (no sync)      | Simpler            | Cross-tab inconsistency                         | MVP only if single-tab usage expected         |
| Show modal on every route        | Ensures visibility | Modal fatigue, interrupts flows                 | Never - gate behind auth + stable route       |
| No "don't show again" option     | Forces engagement  | User frustration, muscle-memory dismissal       | Acceptable for critical breaking changes only |

## Integration Gotchas

Common mistakes when connecting to existing VinylDeck systems.

| Integration            | Common Mistake                                            | Correct Approach                                                              |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Zustand store          | Creating new store without persist                        | Extend existing `preferences-store.ts` or use same persist pattern            |
| Service Worker updates | Conflating "new SW" with "new app version"                | SW updates independently - version check uses `__APP_VERSION__` at build time |
| TanStack Router        | Checking version in root layout (shows on oauth-callback) | Check in `_authenticated` layout only                                         |
| Theme system           | Custom colors that don't use CSS variables                | Use existing `--primary`, `--muted` vars from theme                           |
| i18n                   | Hardcoding changelog text                                 | All user-facing text through translation system                               |

## Performance Traps

Patterns that work at small scale but fail as changelog grows.

| Trap                                     | Symptoms                           | Prevention                                            | When It Breaks    |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------------------- | ----------------- |
| Loading full changelog on every app load | Slow initial load                  | Lazy load changelog data only when modal opens        | 20+ entries       |
| Inline images in changelog entries       | Large bundle, slow modal open      | Use URLs, let browser cache                           | Any images        |
| Re-rendering changelog list on scroll    | Janky scroll, high CPU             | Virtualize if list exceeds viewport                   | 50+ visible items |
| Parsing markdown at runtime              | Delay before modal content appears | Pre-render to HTML at build time or use simple markup | Any markdown      |

## Security Mistakes

Domain-specific security issues.

| Mistake                                          | Risk                                          | Prevention                                                                 |
| ------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| Rendering user-facing links without sanitization | XSS if changelog sourced from CMS             | Hardcode URLs or sanitize, no `dangerouslySetInnerHTML` with external data |
| Storing arbitrary data in localStorage           | Pollution attacks                             | Namespace keys (VinylDeck already does: `vinyldeck-*`)                     |
| Version comparison trusting client storage       | User can manipulate to skip/replay changelogs | Acceptable risk - changelog is informational, not security boundary        |

## UX Pitfalls

Common user experience mistakes with changelog modals.

| Pitfall                                                         | User Impact                         | Better Approach                                                 |
| --------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| Modal on first load after long absence                          | User wants to use app, not read     | Small "what's new" badge, user-initiated modal                  |
| No way to re-access changelog                                   | User dismisses, later wants to read | Permanent link in settings/footer                               |
| Category overload (Added, Changed, Fixed, Removed, Security...) | Cognitive overload                  | 2-3 categories max: "New", "Improved", "Fixed"                  |
| Long entries with implementation details                        | Eyes glaze over                     | User-focused: what they can do now, not how you did it          |
| Forced sequential reading                                       | Can't scan                          | Scannable format: bold first line, details below                |
| No visual hierarchy                                             | Wall of text                        | Group by version, clear version headers                         |
| Mobile modal clips content                                      | Can't read everything               | Full-screen drawer on mobile (project context: already planned) |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Dismissal persistence:** Verify `lastSeenVersion` survives browser restart (not just sessionStorage)
- [ ] **Cross-tab sync:** Open two tabs, dismiss in one, verify other doesn't show
- [ ] **Hard refresh behavior:** Clear memory but not storage, verify no re-trigger
- [ ] **Version jump:** Test 0.3.0 → 0.5.0 (skipping 0.4.0) - shows cumulative or just latest?
- [ ] **First-time user:** New user with no `lastSeenVersion` - what happens?
- [ ] **Settings access:** Can user manually open changelog from settings?
- [ ] **Mobile responsiveness:** Test on actual device, not just dev tools
- [ ] **Keyboard navigation:** Tab through modal, Esc to close
- [ ] **Screen reader:** Announce modal, focus management correct
- [ ] **Theme compatibility:** Test light and dark mode
- [ ] **Offline behavior:** Does modal work when offline? (content should be bundled)

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall                   | Recovery Cost | Recovery Steps                                                       |
| ------------------------- | ------------- | -------------------------------------------------------------------- |
| Wrong version comparison  | LOW           | Fix utility, users will see correct modal on next version            |
| Hydration race condition  | MEDIUM        | Add guard, may need to bump version to re-trigger for affected users |
| Modal on wrong routes     | LOW           | Move trigger, existing dismissals still valid                        |
| Cross-tab desync          | LOW           | Add sync listener, state converges on next storage event             |
| Accessibility issues      | MEDIUM        | Fix component, audit with axe/screen reader                          |
| Missing changelog entries | MEDIUM        | Backfill entries, but users who advanced past won't see them         |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall                   | Prevention Phase             | Verification                             |
| ------------------------- | ---------------------------- | ---------------------------------------- |
| Version string comparison | Phase 1: Data/Infrastructure | Unit test with 0.9→0.10 scenario         |
| Hydration timing          | Phase 1: Storage layer       | Test hard refresh shows correct behavior |
| Modal wrong timing        | Phase 2: Trigger logic       | Manual test: login flow uninterrupted    |
| Cross-tab staleness       | Phase 1: Storage with sync   | Two-tab test in acceptance criteria      |
| Undismissable modal       | Phase 2: Modal component     | Accessibility audit checklist            |
| Missing entries           | Phase 1: Data structure      | Build-time warning or CI check           |
| Mobile UX                 | Phase 2: Responsive modal    | Device testing in QA                     |
| Settings access           | Phase 3: Integration         | Settings page has working link           |

## Sources

- [LinkedIn: How to avoid changelog pitfalls](https://www.linkedin.com/advice/0/how-do-you-avoid-common-pitfalls-mistakes-7054114318551773184) - consistency, specificity
- [Userpilot: Modal UX Design 2026](https://userpilot.com/blog/modal-ux-design/) - mobile patterns, CTA focus
- [Plotline: Mobile App Modals Guide](https://www.plotline.so/blog/mobile-app-modals) - interruption timing, dismissal
- [whatwebcando.today: Service Worker Updates](https://whatwebcando.today/articles/handling-service-worker-updates/) - version detection timing
- [web.dev: PWA Update Patterns](https://web.dev/learn/pwa/update) - update notification best practices
- [Thoughtspile: SemVer Tricky Parts](https://thoughtspile.github.io/2021/11/08/semver-challenges/) - version comparison edge cases
- [AnnounceKit: Changelog Versioning](https://announcekit.app/blog/changelog-versioning/) - versioning practices
- [UX Collective: Notification Badge Exploration](https://uxdesign.cc/notification-badge-exploration-56bc77325b61) - badge count issues
- [PatternFly: Notification Badge Guidelines](https://www.patternfly.org/components/notification-badge/design-guidelines/) - badge design patterns
- [Material Design 3: Badge Guidelines](https://m3.material.io/components/badges/guidelines) - badge count limits
- [Usersnap: Changelog Examples](https://usersnap.com/blog/changelog-examples/) - content structure
- [UserGuiding: Changelog Best Practices](https://userguiding.com/blog/changelog-best-practices) - writing style

---

_Pitfalls research for: Changelog/What's New UI_
_Researched: 2026-01-29_

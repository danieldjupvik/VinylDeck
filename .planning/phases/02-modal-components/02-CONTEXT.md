# Phase 2: Modal Components - Context

**Gathered:** 2026-01-29 (updated)
**Status:** Ready for planning

<domain>
## Phase Boundary

Responsive changelog modal with categorized content display. Dialog on desktop (>=768px), Drawer on mobile (<768px). Shows version, date, categorized entries with visual badges. Accordion for multiple missed versions. Triggering and integration are Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Visual hierarchy

- Categories distinguished by colored badge + icon (both)
- Entries formatted as simple bullet list under each category heading
- Comfortable spacing (balanced, easy scanning)
- No entry counts in category headers

### Animation & transitions

- Use shadcn's built-in Dialog/Drawer animations (no custom open/close)
- Content appears immediately with modal (no staggered reveal)
- Accordion uses shadcn's default expand/collapse animation
- Trust shadcn components to handle prefers-reduced-motion

### Version display

- Header format: "What's New in v0.3.0"
- Absolute date shown below header, formatted per user's language (i18n)
- Accordion labels show version + date: "v0.2.0 — January 15, 2026"
- No footer link to GitHub release notes — modal is self-contained

### Edge states

- Versions with no user-facing entries: skip silently (no modal)
- Many missed versions (5+): show latest 3, collapse older with "+ N older versions"
- Long entries: truncate after ~2 lines with "Show more" to expand
- Dismiss button text: "Got it"

### Modal reusability

- Create a reusable `ResponsiveModal` component (Dialog on desktop, Drawer on mobile)
- Follow shadcn's DrawerDialogDemo pattern: `useMediaQuery` hook + conditional rendering, abstracted into a single component
- Location: `src/components/responsive-modal.tsx` (not in `ui/` — keep shadcn primitives separate from composed components)
- Check codebase for existing `useMediaQuery` hook before creating a new one
- Fresh API design — not constrained by existing Dialog prop patterns
- This component should be usable for future modals beyond changelog

### Claude's Discretion

- Exact badge colors per category (New Features, Bug Fixes, Improvements)
- Icon choice per category (Lucide icons)
- Exact spacing values and typography scale
- "Show more" implementation details for long entries
- How the "+ N older versions" expansion works in the accordion
- ResponsiveModal API design (unified props vs slot-based for header/footer)

</decisions>

<specifics>
## Specific Ideas

- Use shadcn Dialog and Drawer components — leverage their built-in animations
- Use shadcn Accordion for multiple versions display
- Date formatting should use the app's existing i18n infrastructure
- Reference: shadcn's DrawerDialogDemo pattern for the responsive modal approach

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 02-modal-components_
_Context gathered: 2026-01-29_

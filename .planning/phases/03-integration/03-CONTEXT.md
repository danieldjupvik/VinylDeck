# Phase 3: Integration - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Modal triggers correctly in app flow and is accessible from settings. Auto-trigger on version change, manual access via Settings > About, gating during hydration/OAuth/loading states. Updating lastSeenVersion after dismissal.

</domain>

<decisions>
## Implementation Decisions

### Auto-trigger timing

- Short delay (500ms-1s) after hydration completes before showing modal
- Use default shadcn Dialog/Drawer animations (no custom entrance)
- Mark lastSeenVersion as soon as modal appears (not on dismiss)
- Subtle haptic feedback on mobile when modal opens

### Settings placement

- Replace existing "Coming soon" placeholder in About section
- Text link style (minimal footprint, not a button)
- Label: "What's New"
- No version number displayed next to link
- No "new" indicator badge — just a plain link

### Dismissal behavior

- Use shadcn defaults: X button, Escape, backdrop click on desktop; swipe-to-dismiss on mobile drawer
- No primary action button — just content and dismiss methods
- Silent dismissal — no toast or confirmation message
- Use shadcn default focus trap behavior

### Edge case handling

- Don't trigger modal if no user-facing entries exist for the new version
- Suppress trigger during OAuth callback flow — trigger on next normal app load
- Suppress trigger during hydration and loading states

### Claude's Discretion

- Interruption handling (whether to wait for user idle or trigger after delay)
- Multi-tab sync behavior (leverage existing cross-tab patterns in codebase)
- Exact delay value within 500ms-1s range

</decisions>

<specifics>
## Specific Ideas

- Settings page will be refactored in the future — keep integration simple for now
- "What's New" label chosen over "View Changelog" for friendlier tone

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 03-integration_
_Context gathered: 2026-01-29_

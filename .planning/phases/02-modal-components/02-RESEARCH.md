# Phase 2: Modal Components - Research

**Researched:** 2026-01-29
**Domain:** Responsive modals, shadcn/ui Dialog + Drawer, Accordion
**Confidence:** HIGH

## Summary

This phase implements a responsive changelog modal that renders as a Dialog on desktop (>=768px) and a Drawer on mobile (<768px). The project already has the foundational components: a `useIsMobile` hook at 768px breakpoint, Badge component with CVA variants, and Collapsible component for animations.

The standard approach is to install shadcn's Dialog, Drawer, and Accordion components, then create a wrapper component that conditionally renders based on screen size. The existing Sheet component (uses Radix Dialog under the hood) demonstrates the project's styling patterns. All three new components use Radix primitives with built-in accessibility, keyboard support, and animations.

**Primary recommendation:** Create a `ResponsiveModal` wrapper component that uses the existing `useIsMobile` hook to switch between Dialog and Drawer. Reuse the existing Badge component with custom color variants for category badges.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)

| Library                     | Version  | Purpose               | Status            |
| --------------------------- | -------- | --------------------- | ----------------- |
| @radix-ui/react-dialog      | ^1.1.15  | Dialog primitive      | Already installed |
| @radix-ui/react-collapsible | ^1.1.12  | Collapsible primitive | Already installed |
| lucide-react                | ^0.563.0 | Icons                 | Already installed |

### To Install via shadcn CLI

| Component | Underlying Primitive      | Purpose             |
| --------- | ------------------------- | ------------------- |
| dialog    | @radix-ui/react-dialog    | Desktop modal       |
| drawer    | vaul                      | Mobile bottom sheet |
| accordion | @radix-ui/react-accordion | Version grouping    |

### Supporting (Already Available)

| Component   | Purpose                 | Notes                                 |
| ----------- | ----------------------- | ------------------------------------- |
| Badge       | Category badges         | Has CVA variants, needs custom colors |
| Button      | "Got it" dismiss button | Already styled                        |
| useIsMobile | Breakpoint detection    | Uses 768px, matches requirement       |

**Installation:**

```bash
bunx shadcn add dialog drawer accordion
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── changelog/
│   │   ├── changelog-modal.tsx      # Main wrapper (Dialog/Drawer switch)
│   │   ├── changelog-content.tsx    # Shared content (header, categories, footer)
│   │   ├── changelog-entry.tsx      # Single entry with truncation
│   │   └── version-accordion.tsx    # Multi-version accordion
│   └── ui/
│       ├── dialog.tsx               # shadcn Dialog (new)
│       ├── drawer.tsx               # shadcn Drawer (new)
│       └── accordion.tsx            # shadcn Accordion (new)
├── hooks/
│   └── use-mobile.ts                # Existing - 768px breakpoint
└── lib/
    └── date-format.ts               # Date formatting utility (new)
```

### Pattern 1: Responsive Modal Wrapper

**What:** A component that conditionally renders Dialog or Drawer based on viewport
**When to use:** Any modal that needs different UX on mobile vs desktop
**Example:**

```typescript
// Source: shadcn/ui Drawer docs - Responsive Dialog pattern
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription
} from '@/components/ui/drawer'

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          {children}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

### Pattern 2: Controlled Accordion with Default Open

**What:** Accordion where specific items are open by default
**When to use:** Showing latest version expanded, older versions collapsed
**Example:**

```typescript
// Source: shadcn/ui Accordion docs
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'

// For single-item accordion with collapsible behavior
<Accordion type="single" collapsible defaultValue="item-0">
  {versions.map((version, index) => (
    <AccordionItem key={version.tag} value={`item-${index}`}>
      <AccordionTrigger>
        {version.tag} — {formatDate(version.date)}
      </AccordionTrigger>
      <AccordionContent>
        {/* Category groups */}
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

### Pattern 3: Custom Badge Variants

**What:** Extend existing Badge component with category-specific colors
**When to use:** Visual distinction for changelog categories
**Example:**

```typescript
// Extend existing badge.tsx with new variants
const badgeVariants = cva('inline-flex items-center justify-center...', {
  variants: {
    variant: {
      // Existing variants...
      default: '...',
      secondary: '...',
      // New category variants
      feature:
        'border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      fix: 'border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      improvement:
        'border-transparent bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    }
  }
})
```

### Anti-Patterns to Avoid

- **Mounting Dialog AND Drawer simultaneously:** Always use conditional rendering based on `isMobile` to mount only one component
- **Custom open/close animations:** Trust shadcn's built-in animations (data-state transitions)
- **Separate state for each modal type:** Use single `open` state, pass to whichever renders
- **Hardcoding breakpoint values:** Use the existing `useIsMobile` hook (768px)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                   | Don't Build               | Use Instead                      | Why                                             |
| ------------------------- | ------------------------- | -------------------------------- | ----------------------------------------------- |
| Modal overlay + content   | Custom div with z-index   | shadcn Dialog/Drawer             | Portal, focus trap, scroll lock, accessibility  |
| Escape key handling       | document keydown listener | Radix built-in                   | Proper focus management, event bubbling         |
| Backdrop click dismiss    | onClick on overlay        | Radix built-in                   | Handles pointer vs mouse events correctly       |
| Expand/collapse animation | CSS height transitions    | Accordion with Radix Collapsible | Uses CSS variables for dynamic height           |
| Mobile detection          | window.innerWidth         | useIsMobile hook                 | Handles resize, SSR, avoids layout thrashing    |
| Focus trap                | Manual focus management   | Radix Dialog                     | Handles edge cases, multiple focusable elements |

**Key insight:** Radix primitives (used by shadcn) handle dozens of accessibility and UX edge cases. The shadcn styling layer adds consistent theming. Custom solutions will miss keyboard navigation, screen reader announcements, and motion preferences.

## Common Pitfalls

### Pitfall 1: Flash of Wrong Modal on Resize

**What goes wrong:** User resizes browser and sees brief flash of Dialog switching to Drawer
**Why it happens:** `useIsMobile` state update triggers re-render
**How to avoid:** Accept this as expected behavior OR use CSS media queries for initial render
**Warning signs:** Jarring visual when crossing 768px breakpoint

### Pitfall 2: Accordion Content Height

**What goes wrong:** Content jumps or clips during expand/collapse
**Why it happens:** Not using Radix's CSS variable approach for height
**How to avoid:** Use shadcn Accordion which uses `--radix-accordion-content-height` CSS variable
**Warning signs:** Accordion animations look choppy or content is clipped

### Pitfall 3: Drawer Scroll Behavior on iOS

**What goes wrong:** Content doesn't scroll inside Drawer, or page scrolls behind it
**Why it happens:** iOS Safari has specific scroll handling requirements
**How to avoid:** Vaul (shadcn Drawer primitive) handles this; don't add custom scroll containers
**Warning signs:** Scrolling feels "stuck" on iOS Safari

### Pitfall 4: Date Formatting Locale Mismatch

**What goes wrong:** Date shows in wrong language or format
**Why it happens:** Using wrong locale string with `Intl.DateTimeFormat`
**How to avoid:** Use i18next's `i18n.language` (returns 'en' or 'no' per project config)
**Warning signs:** Norwegian users see English dates or vice versa

### Pitfall 5: Text Truncation Detection

**What goes wrong:** "Show more" button appears even when text isn't truncated
**Why it happens:** Comparing scrollHeight vs clientHeight before layout
**How to avoid:** Use `useLayoutEffect` for measurement, or only show button after confirming truncation
**Warning signs:** Button shows for short entries that don't need truncation

## Code Examples

Verified patterns from official sources:

### Date Formatting with i18n

```typescript
// Create formatter using current language
import i18n from '@/providers/i18n-provider'

export function formatChangelogDate(dateString: string): string {
  const date = new Date(dateString)

  // Maps i18n language codes to Intl locale codes
  const localeMap: Record<string, string> = {
    en: 'en-US',
    no: 'nb-NO'
  }

  const locale = localeMap[i18n.language] ?? 'en-US'

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

// Usage in component:
// "January 29, 2026" (en) or "29. januar 2026" (no)
```

### Category Badge with Icon

```typescript
import { Sparkles, Bug, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const CATEGORY_CONFIG = {
  features: {
    icon: Sparkles,
    variant: 'feature' as const,
    label: 'New Features'
  },
  fixes: {
    icon: Bug,
    variant: 'fix' as const,
    label: 'Bug Fixes'
  },
  improvements: {
    icon: Zap,
    variant: 'improvement' as const,
    label: 'Improvements'
  }
} as const

function CategoryBadge({ category }: { category: keyof typeof CATEGORY_CONFIG }) {
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
```

### Truncatable Entry with Show More

```typescript
import { useState, useRef, useLayoutEffect } from 'react'
import { cn } from '@/lib/utils'

function TruncatableEntry({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const element = textRef.current
    if (element) {
      setIsTruncated(element.scrollHeight > element.clientHeight)
    }
  }, [text])

  return (
    <div>
      <p
        ref={textRef}
        className={cn(
          'text-sm text-muted-foreground',
          !isExpanded && 'line-clamp-2'
        )}
      >
        {text}
      </p>
      {isTruncated && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-primary hover:underline mt-1"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
```

### Older Versions Collapse Pattern

```typescript
// For 5+ versions: show 3, collapse rest
function VersionList({ versions }: { versions: Version[] }) {
  const [showAll, setShowAll] = useState(false)
  const olderCount = versions.length - 3

  const visibleVersions = showAll ? versions : versions.slice(0, 3)

  return (
    <Accordion type="single" collapsible defaultValue="item-0">
      {visibleVersions.map((version, index) => (
        <AccordionItem key={version.tag} value={`item-${index}`}>
          {/* ... */}
        </AccordionItem>
      ))}

      {!showAll && olderCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          + {olderCount} older versions
        </button>
      )}
    </Accordion>
  )
}
```

## State of the Art

| Old Approach               | Current Approach                 | When Changed     | Impact                                   |
| -------------------------- | -------------------------------- | ---------------- | ---------------------------------------- |
| Custom modal with portal   | Radix Dialog primitive           | 2023             | Better accessibility, focus management   |
| CSS max-height transitions | Radix data-state + CSS variables | 2023             | Smoother animations, no layout thrashing |
| Multiple breakpoint hooks  | Single useIsMobile at 768px      | Project standard | Consistency across app                   |
| Manual scroll lock         | Vaul/Radix built-in              | Built-in         | Proper iOS Safari handling               |

**Deprecated/outdated:**

- `@reach/dialog`: Replaced by Radix Dialog
- Custom focus trap implementations: Radix handles this
- CSS-only drawer animations: Vaul provides physics-based gestures

## Open Questions

Things that couldn't be fully resolved:

1. **Entry Truncation Threshold**
   - What we know: Decision says "~2 lines with Show more"
   - What's unclear: Exact pixel height or character count
   - Recommendation: Use `line-clamp-2` (CSS-based, ~3em height), measure with `scrollHeight`

2. **Older Versions Button Position**
   - What we know: Show "+ N older versions" for 5+ versions
   - What's unclear: Should it be inside or outside the accordion?
   - Recommendation: Place as a button after the last visible AccordionItem, outside accordion structure

3. **Animation Duration on Mobile**
   - What we know: Vaul handles drawer animations
   - What's unclear: Whether default timing is appropriate
   - Recommendation: Start with defaults, adjust only if UX testing shows issues

## Sources

### Primary (HIGH confidence)

- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog) - Component structure, installation
- [shadcn/ui Drawer](https://ui.shadcn.com/docs/components/drawer) - Responsive pattern, Vaul integration
- [shadcn/ui Accordion](https://ui.shadcn.com/docs/components/accordion) - Props, defaultValue pattern
- [Vaul API](https://vaul.emilkowal.ski/api) - Drawer props (dismissible, direction)
- Existing codebase: `use-mobile.ts`, `badge.tsx`, `sheet.tsx`, `alert-dialog.tsx`

### Secondary (MEDIUM confidence)

- [Lucide Icons](https://lucide.dev/icons/) - Verified icons: Sparkles, Bug, Zap, CircleCheck
- WebSearch: Responsive dialog pattern with useMediaQuery

### Tertiary (LOW confidence)

- Text truncation detection patterns (multiple blog posts, needs validation in implementation)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - shadcn docs verified, Radix primitives battle-tested
- Architecture: HIGH - Responsive modal pattern documented by shadcn
- Pitfalls: MEDIUM - Based on Radix/Vaul docs and common patterns
- Text truncation: LOW - Implementation details may need adjustment

**Research date:** 2026-01-29
**Valid until:** 2026-03-01 (90 days - stable components)

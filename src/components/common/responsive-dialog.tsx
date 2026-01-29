import { useEffect } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

const MAX_WIDTH_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl'
} as const

interface ResponsiveDialogProps {
  /** Controls whether the dialog is open */
  open: boolean
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void
  /** Content to render inside the dialog */
  children: React.ReactNode
  /** Accessible title (rendered as sr-only) */
  title: string
  /** Accessible description (rendered as sr-only) */
  description: string
  /** Max width on desktop. Default: 'lg' (512px) */
  maxWidth?: keyof typeof MAX_WIDTH_CLASSES
  /** Max height on mobile. Default: '80vh' */
  maxHeight?: string
  /** Additional classes for the content container */
  className?: string
}

/**
 * Responsive dialog that renders as Dialog on desktop and Drawer on mobile.
 *
 * Uses 768px breakpoint from useIsMobile hook. Both variants include
 * sr-only title/description for accessibility.
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when open state changes
 * @param children - Content to render inside
 * @param title - Accessible title (sr-only)
 * @param description - Accessible description (sr-only)
 * @param maxWidth - Desktop max width (default: 'lg')
 * @param maxHeight - Mobile max height (default: '80vh')
 * @param className - Additional content classes
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  maxWidth = 'lg',
  maxHeight = '80vh',
  className
}: ResponsiveDialogProps): React.ReactNode {
  const isMobile = useIsMobile()

  // Blur trigger element to prevent aria-hidden focus conflict
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [open])

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={cn('bg-card p-0', className)}
          style={{ maxHeight }}
        >
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {description}
          </DrawerDescription>
          {children}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('bg-card p-0', MAX_WIDTH_CLASSES[maxWidth], className)}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}

import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useTranslation } from 'react-i18next'

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

interface ChangelogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/**
 * Responsive changelog modal that renders as Dialog on desktop and Drawer on mobile.
 *
 * Uses the 768px breakpoint from useIsMobile hook. Both Dialog and Drawer inherit
 * dismissal behaviors (X button, Escape key, backdrop click) from Radix primitives.
 *
 * @param open - Whether the modal is open
 * @param onOpenChange - Callback when the modal open state changes
 * @param children - Content to render inside the modal (typically ChangelogContent)
 * @returns The modal component (Dialog on desktop, Drawer on mobile)
 */
export function ChangelogModal({
  open,
  onOpenChange,
  children
}: ChangelogModalProps): React.ReactNode {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] p-0">
          <VisuallyHidden>
            <DrawerTitle>{t('changelog.modal.title')}</DrawerTitle>
            <DrawerDescription>
              {t('changelog.modal.description')}
            </DrawerDescription>
          </VisuallyHidden>
          {children}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
        }}
      >
        <VisuallyHidden>
          <DialogTitle>{t('changelog.modal.title')}</DialogTitle>
          <DialogDescription>
            {t('changelog.modal.description')}
          </DialogDescription>
        </VisuallyHidden>
        {children}
      </DialogContent>
    </Dialog>
  )
}

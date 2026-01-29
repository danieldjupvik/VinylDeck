import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  /** Trigger element (typically a Button) */
  trigger: React.ReactNode
  /** Dialog title */
  title: string
  /** Dialog description */
  description: string
  /** Text for the confirm button */
  confirmText: string
  /** Called when user confirms */
  onConfirm: () => void
  /** Text for the cancel button. Defaults to common.cancel translation */
  cancelText?: string
  /** Style variant for confirm button. Default: 'destructive' */
  variant?: 'destructive' | 'default'
  /** Controlled open state */
  open?: boolean
  /** Controlled open state change handler */
  onOpenChange?: (open: boolean) => void
}

/**
 * Confirmation dialog for actions requiring explicit user consent.
 *
 * Wraps AlertDialog with a simplified API for common confirmation patterns.
 * Supports both controlled and uncontrolled modes.
 *
 * @param trigger - Element that opens the dialog
 * @param title - Dialog title
 * @param description - Dialog description
 * @param confirmText - Confirm button text
 * @param onConfirm - Callback when confirmed
 * @param cancelText - Cancel button text (default: translated 'common.cancel')
 * @param variant - Confirm button variant (default: 'destructive')
 * @param open - Controlled open state
 * @param onOpenChange - Controlled state handler
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText,
  onConfirm,
  cancelText,
  variant = 'destructive',
  open,
  onOpenChange
}: ConfirmDialogProps): React.ReactNode {
  const { t } = useTranslation()

  // Build controlled props only when open is defined (exactOptionalPropertyTypes)
  const controlledProps =
    open !== undefined ? { open, onOpenChange } : undefined

  return (
    <AlertDialog {...controlledProps}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {cancelText ?? t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              variant === 'destructive' &&
                'bg-destructive hover:bg-destructive/90 text-white'
            )}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

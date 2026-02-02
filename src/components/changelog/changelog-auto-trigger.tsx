import { useTranslation } from 'react-i18next'

import { ResponsiveDialog } from '@/components/common/responsive-dialog'
import { useChangelogTrigger } from '@/hooks/use-changelog-trigger'
import {
  buildTranslatedEntries,
  buildTranslatedVersions
} from '@/lib/changelog-utils'

import { ChangelogContent } from './changelog-content'
import { VersionAccordion } from './version-accordion'

/**
 * Auto-triggers changelog modal on new version detection.
 * Renders nothing if modal not open. Placed in authenticated layout.
 *
 * @returns Modal element when open, null otherwise
 */
export function ChangelogAutoTrigger(): React.ReactNode {
  const { t } = useTranslation()
  const { isOpen, onDismiss, triggeredVersions } = useChangelogTrigger()

  const firstVersion = triggeredVersions[0]
  if (!isOpen || !firstVersion) {
    return null
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onDismiss()
    }
  }

  const showAccordion = triggeredVersions.length > 1

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={t('changelog.modal.title')}
      description={t('changelog.modal.description')}
      maxHeight="85vh"
    >
      {showAccordion ? (
        <VersionAccordion
          versions={buildTranslatedVersions(triggeredVersions, t)}
          onDismiss={onDismiss}
        />
      ) : (
        <ChangelogContent
          version={firstVersion.version}
          date={firstVersion.date}
          entries={buildTranslatedEntries(firstVersion, t)}
          onDismiss={onDismiss}
        />
      )}
    </ResponsiveDialog>
  )
}

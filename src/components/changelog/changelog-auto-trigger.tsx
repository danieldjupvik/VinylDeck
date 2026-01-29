import { useTranslation } from 'react-i18next'

import { ResponsiveDialog } from '@/components/common/responsive-dialog'
import { useChangelogTrigger } from '@/hooks/use-changelog-trigger'
import type { ChangelogEntry, ChangelogVersion } from '@/types/changelog'

import { ChangelogContent } from './changelog-content'
import { VersionAccordion } from './version-accordion'

/**
 * Builds entries object with only defined categories (for exactOptionalPropertyTypes).
 */
function buildEntries(
  version: {
    features?: ChangelogEntry[]
    improvements?: ChangelogEntry[]
    fixes?: ChangelogEntry[]
  },
  t: (key: string) => string
): { features?: string[]; improvements?: string[]; fixes?: string[] } {
  const entries: {
    features?: string[]
    improvements?: string[]
    fixes?: string[]
  } = {}

  if (version.features && version.features.length > 0) {
    entries.features = version.features.map((e) => t(e.key))
  }
  if (version.improvements && version.improvements.length > 0) {
    entries.improvements = version.improvements.map((e) => t(e.key))
  }
  if (version.fixes && version.fixes.length > 0) {
    entries.fixes = version.fixes.map((e) => t(e.key))
  }

  return entries
}

/**
 * Transforms ChangelogVersion array to translated version data for accordion.
 */
function buildVersionData(
  versions: ChangelogVersion[],
  t: (key: string) => string
) {
  return versions.map((v) => ({
    version: v.version,
    date: v.date,
    entries: buildEntries(v, t)
  }))
}

/**
 * Auto-triggers changelog modal on new version detection.
 * Renders nothing if modal not open. Placed in authenticated layout.
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
          versions={buildVersionData(triggeredVersions, t)}
          onDismiss={onDismiss}
        />
      ) : (
        <ChangelogContent
          version={firstVersion.version}
          date={firstVersion.date}
          entries={buildEntries(firstVersion, t)}
          onDismiss={onDismiss}
        />
      )}
    </ResponsiveDialog>
  )
}

import { useTranslation } from 'react-i18next'

import { useChangelog } from '@/hooks/use-changelog'
import { useChangelogTrigger } from '@/hooks/use-changelog-trigger'
import type { ChangelogEntry } from '@/types/changelog'

import { ChangelogContent } from './changelog-content'
import { ChangelogModal } from './changelog-modal'

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
 * Auto-triggers changelog modal on new version detection.
 * Renders nothing if no new entries. Placed in authenticated layout.
 */
export function ChangelogAutoTrigger(): React.ReactNode {
  const { t } = useTranslation()
  const { isOpen, setIsOpen } = useChangelogTrigger()
  const changelog = useChangelog()

  if (!changelog.hasEntries) {
    return null
  }

  const latestVersion = changelog.versions[0]
  if (!latestVersion) {
    return null
  }

  return (
    <ChangelogModal open={isOpen} onOpenChange={setIsOpen}>
      <ChangelogContent
        version={latestVersion.version}
        date={latestVersion.date}
        entries={buildEntries(latestVersion, t)}
        onDismiss={() => {
          setIsOpen(false)
        }}
      />
    </ChangelogModal>
  )
}

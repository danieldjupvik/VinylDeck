import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChangelogContent } from '@/components/changelog/changelog-content'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { formatChangelogDate } from '@/lib/date-format'

interface VersionData {
  version: string
  date: string
  entries: {
    features?: string[]
    fixes?: string[]
    improvements?: string[]
  }
}

interface VersionAccordionProps {
  versions: VersionData[]
  onDismiss: () => void
}

const VISIBLE_THRESHOLD = 4
const INITIAL_VISIBLE_COUNT = 3

/**
 * Displays multiple changelog versions in an accordion format.
 *
 * The latest version (first in array) is expanded by default. Older versions
 * are collapsed. When there are 5+ versions, only the first 3 are shown with
 * a "+ N older versions" button to reveal the rest.
 *
 * @param versions - Array of version data, ordered from newest to oldest
 * @param onDismiss - Callback when dismiss button is clicked in any version
 * @returns Accordion display of changelog versions
 */
// eslint-disable-next-line import-x/no-unused-modules -- Will be used in Phase 3 integration
export function VersionAccordion({
  versions,
  onDismiss
}: VersionAccordionProps): React.ReactNode {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)

  const shouldCollapse = versions.length > VISIBLE_THRESHOLD
  const olderCount = versions.length - INITIAL_VISIBLE_COUNT
  const visibleVersions =
    shouldCollapse && !showAll
      ? versions.slice(0, INITIAL_VISIBLE_COUNT)
      : versions

  return (
    <div className="flex flex-col">
      <Accordion type="single" collapsible defaultValue="item-0">
        {visibleVersions.map((version, index) => (
          <AccordionItem key={version.version} value={`item-${index}`}>
            <AccordionTrigger className="px-6">
              <span className="text-sm font-medium">
                {t('changelog.versionDate', {
                  version: version.version,
                  date: formatChangelogDate(version.date)
                })}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ChangelogContent
                version={version.version}
                date={version.date}
                entries={version.entries}
                onDismiss={onDismiss}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {shouldCollapse && !showAll ? (
        <button
          onClick={() => {
            setShowAll(true)
          }}
          className="text-muted-foreground hover:text-foreground w-full py-4 text-sm transition-colors"
        >
          {t('changelog.olderVersions', { count: olderCount })}
        </button>
      ) : null}
    </div>
  )
}

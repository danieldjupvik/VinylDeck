import { Bug, Sparkles, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatChangelogDate } from '@/lib/date-format'

import { ChangelogEntry } from './changelog-entry'

const CATEGORY_CONFIG = {
  features: {
    icon: Sparkles,
    variant: 'feature' as const,
    labelKey: 'changelog.categories.features'
  },
  improvements: {
    icon: Zap,
    variant: 'improvement' as const,
    labelKey: 'changelog.categories.improvements'
  },
  fixes: {
    icon: Bug,
    variant: 'fix' as const,
    labelKey: 'changelog.categories.fixes'
  }
} as const

type CategoryKey = keyof typeof CATEGORY_CONFIG

interface ChangelogContentProps {
  version: string
  date: string
  entries: {
    features?: string[]
    fixes?: string[]
    improvements?: string[]
  }
  onDismiss: () => void
}

/**
 * Renders the changelog content with header, categorized entries, and dismiss button.
 *
 * Displays version title ("What's New in v{version}"), formatted date,
 * category sections with colored badges and icons, and a "Got it" dismiss button.
 * Categories are only rendered if they have entries.
 *
 * @param version - Version string (e.g., "0.3.0")
 * @param date - ISO date string (e.g., "2026-01-29")
 * @param entries - Categorized changelog entries
 * @param onDismiss - Callback when dismiss button is clicked
 * @returns The content component for use inside ChangelogModal
 */
export function ChangelogContent({
  version,
  date,
  entries,
  onDismiss
}: ChangelogContentProps): React.ReactNode {
  const { t } = useTranslation()

  const categoryOrder: CategoryKey[] = ['features', 'improvements', 'fixes']
  const categoriesToRender = categoryOrder.filter(
    (key) => entries[key] && entries[key].length > 0
  )

  return (
    <div className="flex flex-col gap-4 p-6 pt-2">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          {t('changelog.header.title', { version })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {formatChangelogDate(date)}
        </p>
      </header>

      <div className="flex max-h-[50vh] flex-col gap-6 overflow-y-auto">
        {categoriesToRender.map((categoryKey) => {
          const config = CATEGORY_CONFIG[categoryKey]
          const Icon = config.icon
          const categoryEntries = entries[categoryKey] ?? []

          return (
            <section key={categoryKey} className="flex flex-col gap-2">
              <Badge variant={config.variant} className="w-fit">
                <Icon className="size-3" />
                {t(config.labelKey)}
              </Badge>
              <ul className="list-disc space-y-2">
                {categoryEntries.map((entry, index) => (
                  // eslint-disable-next-line react/no-array-index-key -- Entries have no stable ID
                  <ChangelogEntry key={index} text={entry} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <footer className="pt-2">
        <Button onClick={onDismiss} className="w-full">
          {t('changelog.footer.dismiss')}
        </Button>
      </footer>
    </div>
  )
}

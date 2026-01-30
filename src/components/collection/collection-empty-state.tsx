import { ExternalLink, GhostIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'

interface NonVinylBreakdownItem {
  format: string
  count: number
}

interface CollectionEmptyStateProps {
  nonVinylCount?: number | undefined
  nonVinylBreakdown?: NonVinylBreakdownItem[] | undefined
}

const EMPTY_BREAKDOWN: NonVinylBreakdownItem[] = []

const DISCOGS_SEARCH_URL =
  'https://www.discogs.com/search?sort=have%2Cdesc&type=release&format=Vinyl'

export function CollectionEmptyState({
  nonVinylCount = 0,
  nonVinylBreakdown = EMPTY_BREAKDOWN
}: CollectionEmptyStateProps): React.JSX.Element {
  const { t } = useTranslation()

  const hasNonVinyl = nonVinylCount > 0 && nonVinylBreakdown.length > 0
  const nonVinylSummary = nonVinylBreakdown
    .map((item) => `${item.count} ${item.format}`)
    .join(', ')

  const description = hasNonVinyl
    ? t('collection.emptyState.descriptionWithOther', {
        formats: nonVinylSummary
      })
    : t('collection.emptyState.description')

  return (
    <EmptyState
      icon={<GhostIcon className="h-16 w-16" />}
      title={t('collection.emptyState.title')}
      description={description}
      size="fullHeight"
      className="min-h-[calc(100svh-23rem)]"
      action={
        // TODO: Replace with in-app vinyl adding when that feature is implemented
        <Button variant="outline" asChild>
          <a
            href={DISCOGS_SEARCH_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('collection.emptyState.addVinyl')}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      }
    />
  )
}

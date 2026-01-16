import { useTranslation } from 'react-i18next'
import { Disc3 } from 'lucide-react'
import type { DiscogsCollectionRelease } from '@/types/discogs'
import { VinylCard } from './vinyl-card'
import { VinylCardSkeleton } from './vinyl-card-skeleton'

interface VinylGridProps {
  releases: DiscogsCollectionRelease[]
  isLoading: boolean
}

export function VinylGrid({ releases, isLoading }: VinylGridProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <VinylCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (releases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Disc3 className="h-20 w-20 text-muted-foreground opacity-50" />
        <p className="mt-6 text-lg font-medium text-muted-foreground">
          {t('collection.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {releases.map((release) => (
        <VinylCard key={release.instance_id} release={release} />
      ))}
    </div>
  )
}

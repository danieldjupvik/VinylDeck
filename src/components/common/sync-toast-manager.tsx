import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useCollectionSync } from '@/hooks/use-collection-sync'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

import { SyncPendingCard } from './sync-pending-card'

/**
 * Renders the global collection sync surface on authenticated pages.
 *
 * @returns Sync toast UI element when pending/refreshing, otherwise null
 * @throws Will not throw
 */
export function SyncToastManager(): React.JSX.Element | null {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const { descriptor, refreshCollection, minimize, open } = useCollectionSync()

  if (!descriptor) return null

  const handleRefresh = () => {
    void refreshCollection().catch((error: unknown) => {
      console.error('Collection sync refresh failed:', error)
      toast.error(descriptor.refreshFailedMessage)
    })
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[120] w-fit',
        isMobile
          ? 'bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 -translate-x-1/2'
          : 'right-4 bottom-4'
      )}
    >
      <div className="pointer-events-auto">
        <SyncPendingCard
          message={descriptor.message}
          isRefreshing={descriptor.status === 'refreshing'}
          isMinimized={descriptor.isMinimized}
          refreshLabel={t('collection.sync.refreshNow')}
          refreshingLabel={t('collection.sync.refreshing')}
          minimizeLabel={t('collection.sync.minimize')}
          openLabel={t('collection.sync.open')}
          onRefresh={handleRefresh}
          onMinimize={minimize}
          onOpen={open}
        />
      </div>
    </div>
  )
}

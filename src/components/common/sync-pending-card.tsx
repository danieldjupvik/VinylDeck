import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface SyncPendingCardProps {
  message: string
  isRefreshing: boolean
  isMinimized: boolean
  refreshLabel: string
  refreshingLabel: string
  minimizeLabel: string
  openLabel: string
  onRefresh: () => void
  onMinimize: () => void
  onOpen: () => void
}

export function SyncPendingCard({
  message,
  isRefreshing,
  isMinimized,
  refreshLabel,
  refreshingLabel,
  minimizeLabel,
  openLabel,
  onRefresh,
  onMinimize,
  onOpen
}: SyncPendingCardProps): React.JSX.Element {
  return (
    <div className="relative inline-grid [grid-template-areas:'stack']">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'bg-accent/70 text-card-foreground hover:bg-accent/80 border-border inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-lg backdrop-blur transition-all duration-200 ease-out [grid-area:stack]',
          isMinimized
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none absolute right-0 bottom-0 translate-y-1 scale-95 opacity-0'
        )}
      >
        <RefreshCw className="size-4" />
        <span>{openLabel}</span>
      </button>

      <div
        className={cn(
          'bg-accent/70 text-card-foreground border-border w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border p-4 shadow-xl backdrop-blur transition-all duration-200 ease-out [grid-area:stack]',
          isMinimized
            ? 'pointer-events-none absolute right-0 bottom-0 translate-y-1 scale-95 opacity-0'
            : 'translate-y-0 scale-100 opacity-100'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {isRefreshing ? <Spinner /> : <RefreshCw />}
          </div>
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMinimize}
            disabled={isRefreshing}
          >
            {minimizeLabel}
          </Button>
          <Button size="sm" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? refreshingLabel : refreshLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

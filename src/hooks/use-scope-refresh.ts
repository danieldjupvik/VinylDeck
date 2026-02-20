import { useQueryClient } from '@tanstack/react-query'

import { clearScopeCache } from '@/lib/query-cache-scopes'
import { buildSyncKey } from '@/lib/sync-keys'
import { useSyncStateStore } from '@/stores/sync-state-store'
import type { SyncScope } from '@/types/sync'

interface UseScopeRefreshParams<THydrateTarget> {
  scope: SyncScope
  identity: string | null | undefined
  getCachedBaselineCount: () => number | null
  refreshCachedData: () => Promise<number | null>
  fetchLiveCount: () => Promise<number>
  hydrateIfMissing?:
    | ((target: THydrateTarget) => Promise<number | null>)
    | undefined
}

/**
 * Options for one scope refresh execution.
 *
 * @typeParam THydrateTarget - Input shape for optional cache seeding when no
 * cached scope queries are available.
 */
export interface ScopeRefreshOptions<THydrateTarget> {
  /**
   * Clears in-memory and persisted TanStack query cache for the scope before
   * executing refresh logic.
   */
  clearCache?: boolean | undefined
  /**
   * Optional cache-seeding target used only when refresh finds no cached scope
   * queries and a hydrate handler is provided.
   */
  hydrateIfMissing?: THydrateTarget | undefined
}

interface UseScopeRefreshResult<THydrateTarget> {
  refresh: (options?: ScopeRefreshOptions<THydrateTarget>) => Promise<void>
  isRefreshing: boolean
}

/**
 * Generic scoped refresh coordinator for sync-aware data domains.
 *
 * Handles sync entry initialization, refreshing status, optional scoped cache
 * clearing, baseline reconciliation, and pending-state acknowledgement.
 *
 * @typeParam THydrateTarget - Input shape used by `hydrateIfMissing`
 * @param params - Scope refresh configuration and data callbacks
 * @returns Scope refresh action and current scope refresh state
 * @throws Re-throws errors from `refreshCachedData`, `hydrateIfMissing`,
 * `fetchLiveCount`, or `clearScopeCache` during a refresh execution
 */
export function useScopeRefresh<THydrateTarget>(
  params: UseScopeRefreshParams<THydrateTarget>
): UseScopeRefreshResult<THydrateTarget> {
  const queryClient = useQueryClient()
  const upsertFromMetadata = useSyncStateStore(
    (state) => state.upsertFromMetadata
  )
  const setRefreshing = useSyncStateStore((state) => state.setRefreshing)
  const acknowledgeBaseline = useSyncStateStore(
    (state) => state.acknowledgeBaseline
  )

  const syncKey =
    params.identity !== undefined && params.identity !== null
      ? buildSyncKey(params.scope, params.identity)
      : null
  const isRefreshing = useSyncStateStore((state) =>
    syncKey ? state.entries[syncKey]?.isRefreshing === true : false
  )

  const refresh = async (
    options?: ScopeRefreshOptions<THydrateTarget>
  ): Promise<void> => {
    if (!syncKey) return

    const existingEntry = useSyncStateStore.getState().entries[syncKey]
    if (!existingEntry) {
      const cachedCount = params.getCachedBaselineCount() ?? 0
      upsertFromMetadata({
        key: syncKey,
        scope: params.scope,
        baselineCount: cachedCount,
        liveCount: cachedCount
      })
    }

    setRefreshing(syncKey, true)

    try {
      if (options?.clearCache === true) {
        await clearScopeCache(queryClient, params.scope)
      }

      let syncedCount = await params.refreshCachedData()

      if (
        syncedCount === null &&
        options?.hydrateIfMissing !== undefined &&
        params.hydrateIfMissing
      ) {
        syncedCount = await params.hydrateIfMissing(options.hydrateIfMissing)
      }

      if (syncedCount === null) {
        syncedCount = await params.fetchLiveCount()
      }

      upsertFromMetadata({
        key: syncKey,
        scope: params.scope,
        baselineCount: syncedCount,
        liveCount: syncedCount
      })
      acknowledgeBaseline({ key: syncKey, baselineCount: syncedCount })
    } catch (error) {
      setRefreshing(syncKey, false)
      throw error
    }
  }

  return { refresh, isRefreshing }
}

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
  useScopeRefresh,
  type ScopeRefreshOptions
} from '@/hooks/use-scope-refresh'
import { useUserProfile } from '@/hooks/use-user-profile'
import { COLLECTION } from '@/lib/constants'
import { buildSyncKey } from '@/lib/sync-keys'
import { trpc } from '@/lib/trpc'
import { useHydrationState } from '@/providers/hydration-context'
import { useAuthStore } from '@/stores/auth-store'
import { useSyncStateStore } from '@/stores/sync-state-store'
import type {
  CollectionReleasesPage,
  SortOrder,
  UserSort
} from '@/types/discogs'
import type { SyncPendingDescriptor } from '@/types/sync'

const COLLECTION_SCOPE = 'collection'
const COLLECTION_QUERY_KEY_PREFIX = 'collection'
const FETCH_ALL_PAGES_BATCH_SIZE = 3

interface CollectionFetchParams {
  page: number
  shouldFetchAllPages: boolean
  sort: UserSort
  sortOrder: SortOrder
}

interface CollectionSyncResult {
  descriptor: SyncPendingDescriptor | null
  refreshCollection: (options?: CollectionRefreshOptions) => Promise<void>
  minimize: () => void
  open: () => void
}

interface CollectionRefreshResult {
  refreshCollection: (options?: CollectionRefreshOptions) => Promise<void>
  isRefreshing: boolean
}

/**
 * Options for a manual collection refresh operation.
 */
type CollectionRefreshOptions = ScopeRefreshOptions<CollectionFetchParams>

const getLatestCachedCollectionCount = (
  queryClient: ReturnType<typeof useQueryClient>,
  username: string
): number | null => {
  const queries = findCachedCollectionQueries(queryClient, username)

  let latestQuery: (typeof queries)[number] | undefined
  for (const query of queries) {
    if (
      !latestQuery ||
      query.state.dataUpdatedAt > latestQuery.state.dataUpdatedAt
    ) {
      latestQuery = query
    }
  }

  const cachedCollection = latestQuery?.state.data as
    | CollectionReleasesPage
    | undefined
  const cachedCount = cachedCollection?.pagination.items
  return typeof cachedCount === 'number' ? cachedCount : null
}

const findCachedCollectionQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  username: string
) =>
  queryClient.getQueryCache().findAll({
    queryKey: ['collection', username],
    exact: false,
    predicate: (query) => query.state.data !== undefined
  })

const isSortOrder = (value: unknown): value is SortOrder =>
  value === 'asc' || value === 'desc'

const parseCollectionFetchParams = (
  queryKey: readonly unknown[],
  username: string
): CollectionFetchParams | null => {
  if (queryKey[0] !== COLLECTION_QUERY_KEY_PREFIX) return null
  if (queryKey[1] !== username) return null

  const shouldFetchAllPages = queryKey[2] === true
  const rawPage = queryKey[3]
  const page =
    !shouldFetchAllPages && typeof rawPage === 'number' && rawPage > 0
      ? rawPage
      : 1

  const rawSort = queryKey[4]
  if (typeof rawSort !== 'string') return null

  const rawSortOrder = queryKey[5]
  if (!isSortOrder(rawSortOrder)) return null

  return {
    page,
    shouldFetchAllPages,
    sort: rawSort as UserSort,
    sortOrder: rawSortOrder
  }
}

const buildCollectionQueryKey = (
  username: string,
  params: CollectionFetchParams
): readonly [string, string, boolean, number | null, UserSort, SortOrder] => [
  COLLECTION_QUERY_KEY_PREFIX,
  username,
  params.shouldFetchAllPages,
  params.shouldFetchAllPages ? null : params.page,
  params.sort,
  params.sortOrder
]

const fetchCollectionForParams = async ({
  params,
  fetchPage
}: {
  params: CollectionFetchParams
  fetchPage: (page: number) => Promise<CollectionReleasesPage>
}): Promise<CollectionReleasesPage> => {
  if (!params.shouldFetchAllPages) {
    return fetchPage(params.page)
  }

  const firstPage = await fetchPage(1)
  const totalPages = firstPage.pagination.pages
  if (totalPages <= 1) return firstPage

  const releases = [...firstPage.releases]
  const remainingPages = Array.from(
    { length: totalPages - 1 },
    (_, index) => index + 2
  )

  for (let i = 0; i < remainingPages.length; i += FETCH_ALL_PAGES_BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + FETCH_ALL_PAGES_BATCH_SIZE)
    const responses = await Promise.all(
      batch.map((pageNumber) => fetchPage(pageNumber))
    )
    for (const response of responses) {
      releases.push(...response.releases)
    }
  }

  return {
    ...firstPage,
    releases
  }
}

/**
 * Refreshes collection data and sync baseline using one shared flow.
 *
 * Updates all cached collection query variants and reconciles sync state so
 * manual refresh actions can originate from any route.
 * Supports optional scoped cache clearing before refresh and optional cache
 * hydration when no matching collection query exists.
 *
 * @returns Collection refresh function and current refreshing state
 *
 * Returned `refreshCollection` behavior:
 * - Refreshes cached collection query variants for current user
 * - Reconciles sync baseline/live counts on success
 * - Optionally clears collection cache before refresh
 * - Optionally seeds cache when no collection query is currently cached
 *
 * @throws {Error} When OAuth tokens are unavailable for a required fetch
 * @throws Upstream tRPC/fetch errors during collection or metadata requests
 */
export function useCollectionRefresh(): CollectionRefreshResult {
  const queryClient = useQueryClient()
  const trpcUtils = trpc.useUtils()
  const { profile } = useUserProfile()

  const username = profile?.username
  const requireTokens = () => {
    const currentTokens = useAuthStore.getState().tokens
    if (!currentTokens) {
      throw new Error('OAuth tokens are required to refresh collection')
    }
    return currentTokens
  }
  const { refresh: refreshScope, isRefreshing } =
    useScopeRefresh<CollectionFetchParams>({
      scope: COLLECTION_SCOPE,
      identity: username,
      getCachedBaselineCount: () => {
        if (!username) return null
        return getLatestCachedCollectionCount(queryClient, username)
      },
      refreshCachedData: async () => {
        if (!username) return null

        const cachedCollectionQueries = findCachedCollectionQueries(
          queryClient,
          username
        )

        let syncedCount: number | null = null

        if (cachedCollectionQueries.length > 0) {
          const currentTokens = requireTokens()

          let lastError: unknown = null

          for (const query of cachedCollectionQueries) {
            const fetchParams = parseCollectionFetchParams(
              query.queryKey,
              username
            )
            if (!fetchParams) {
              console.warn(
                'Skipping unrecognized cached collection query key during sync refresh:',
                query.queryKey
              )
              continue
            }

            try {
              const refreshedCollection = await fetchCollectionForParams({
                params: fetchParams,
                fetchPage: async (page) =>
                  trpcUtils.client.discogs.getCollection.query({
                    accessToken: currentTokens.accessToken,
                    accessTokenSecret: currentTokens.accessTokenSecret,
                    username,
                    page,
                    perPage: COLLECTION.PER_PAGE,
                    sort: fetchParams.sort,
                    sortOrder: fetchParams.sortOrder
                  })
              })

              queryClient.setQueryData(query.queryKey, refreshedCollection)

              const refreshedTotal = refreshedCollection.pagination.items
              if (typeof refreshedTotal === 'number') {
                syncedCount =
                  syncedCount === null
                    ? refreshedTotal
                    : Math.max(syncedCount, refreshedTotal)
              }
            } catch (error) {
              console.error(
                'Failed to refresh collection variant:',
                query.queryKey,
                error
              )
              lastError = error
            }
          }

          if (syncedCount === null && lastError !== null) {
            throw lastError instanceof Error
              ? lastError
              : new Error('All collection variant refreshes failed')
          }
        }

        return syncedCount
      },
      hydrateIfMissing: async (hydrationTarget) => {
        if (!username) return null
        const currentTokens = requireTokens()

        const hydratedCollection = await fetchCollectionForParams({
          params: hydrationTarget,
          fetchPage: async (page) =>
            trpcUtils.client.discogs.getCollection.query({
              accessToken: currentTokens.accessToken,
              accessTokenSecret: currentTokens.accessTokenSecret,
              username,
              page,
              perPage: COLLECTION.PER_PAGE,
              sort: hydrationTarget.sort,
              sortOrder: hydrationTarget.sortOrder
            })
        })

        queryClient.setQueryData(
          buildCollectionQueryKey(username, hydrationTarget),
          hydratedCollection
        )

        const hydratedTotal = hydratedCollection.pagination.items
        return typeof hydratedTotal === 'number' ? hydratedTotal : null
      },
      fetchLiveCount: async () => {
        if (!username) {
          throw new Error('Username is required to refresh collection')
        }
        const currentTokens = useAuthStore.getState().tokens
        const metadata =
          await trpcUtils.client.discogs.getCollectionMetadata.query(
            currentTokens
              ? {
                  accessToken: currentTokens.accessToken,
                  accessTokenSecret: currentTokens.accessTokenSecret,
                  username
                }
              : { username }
          )
        return metadata.totalCount
      }
    })

  const refreshCollection = async (
    options?: CollectionRefreshOptions
  ): Promise<void> => {
    await refreshScope(options)
  }

  return { refreshCollection, isRefreshing }
}

/**
 * Tracks collection sync status using persisted baseline metadata.
 *
 * Computes pending sync changes from live metadata count versus the local
 * baseline stored in localStorage. Works across authenticated routes without
 * requiring collection query cache to exist.
 *
 * @returns Collection sync descriptor and controls for refresh/minimize/open
 * @throws {Error} Returned `refreshCollection` can re-throw authentication and
 * API errors from refresh operations (for example missing OAuth tokens,
 * permission/auth failures, network failures, and upstream HTTP errors).
 */
export function useCollectionSync(): CollectionSyncResult {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { refreshCollection } = useCollectionRefresh()
  const { hasHydrated } = useHydrationState()
  const tokens = useAuthStore((state) => state.tokens)
  const { profile } = useUserProfile()
  const upsertFromMetadata = useSyncStateStore(
    (state) => state.upsertFromMetadata
  )
  const setMinimized = useSyncStateStore((state) => state.setMinimized)

  const username = profile?.username
  const syncKey =
    username !== undefined ? buildSyncKey(COLLECTION_SCOPE, username) : null

  const syncEntry = useSyncStateStore((state) =>
    syncKey ? state.entries[syncKey] : undefined
  )

  const metadataInput =
    tokens && username
      ? {
          accessToken: tokens.accessToken,
          accessTokenSecret: tokens.accessTokenSecret,
          username
        }
      : {
          // metadataInput fallback only satisfies input typing; tokens/username checks disable this query branch.
          username: ''
        }

  const { data: meta, isSuccess: isMetaSuccess } =
    trpc.discogs.getCollectionMetadata.useQuery(metadataInput, {
      enabled: Boolean(tokens && username),
      refetchOnWindowFocus: true,
      refetchInterval: 60 * 1000,
      // Immediately stale so refetchOnWindowFocus always fires on tab-back.
      // refetchInterval handles polling when the user stays on the tab.
      staleTime: 0
    })

  useEffect(() => {
    if (!syncKey) return
    if (!isMetaSuccess) return
    if (typeof meta.totalCount !== 'number') return

    const hasExistingEntry =
      useSyncStateStore.getState().entries[syncKey] !== undefined
    const isInitialBaselineSetup = !hasExistingEntry

    // Wait for query-cache hydration before first baseline setup so we can
    // compare against restored collection data when available.
    if (isInitialBaselineSetup && !hasHydrated) {
      return
    }

    const cachedBaselineCount =
      isInitialBaselineSetup && username
        ? getLatestCachedCollectionCount(queryClient, username)
        : null

    upsertFromMetadata({
      key: syncKey,
      scope: COLLECTION_SCOPE,
      baselineCount: cachedBaselineCount ?? undefined,
      liveCount: meta.totalCount
    })
  }, [
    syncKey,
    username,
    hasHydrated,
    queryClient,
    isMetaSuccess,
    meta?.totalCount,
    upsertFromMetadata
  ])

  const minimize = (): void => {
    if (!syncKey) return
    setMinimized(syncKey, true)
  }

  const open = (): void => {
    if (!syncKey) return
    setMinimized(syncKey, false)
  }

  let status: 'idle' | 'pending' | 'refreshing' = 'idle'
  if (syncEntry?.isRefreshing) {
    status = 'refreshing'
  } else if (syncEntry?.isPending) {
    status = 'pending'
  }

  const descriptor: SyncPendingDescriptor | null =
    syncKey && syncEntry && (syncEntry.isPending || syncEntry.isRefreshing)
      ? {
          key: syncKey,
          scope: COLLECTION_SCOPE,
          status,
          counts: {
            newItems: syncEntry.pendingNewCount,
            deletedItems: syncEntry.pendingDeletedCount
          },
          isMinimized: syncEntry.isMinimized,
          message:
            status === 'refreshing'
              ? t('collection.refreshing')
              : [
                  syncEntry.pendingNewCount > 0
                    ? t('collection.newItems', {
                        count: syncEntry.pendingNewCount
                      })
                    : null,
                  syncEntry.pendingDeletedCount > 0
                    ? t('collection.deletedItems', {
                        count: syncEntry.pendingDeletedCount
                      })
                    : null,
                  t('collection.refreshPrompt')
                ]
                  .filter((part): part is string => part !== null)
                  .join(' '),
          refreshFailedMessage: t('collection.sync.refreshFailed')
        }
      : null

  return { descriptor, refreshCollection, minimize, open }
}

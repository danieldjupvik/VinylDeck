import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useUserProfile } from '@/hooks/use-user-profile'
import { COLLECTION } from '@/lib/constants'
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
  refreshCollection: () => Promise<void>
  minimize: () => void
  open: () => void
}

const buildCollectionSyncKey = (username: string): string =>
  `${COLLECTION_SCOPE}:${username.toLowerCase()}`

const getLatestCachedCollectionCount = (
  queryClient: ReturnType<typeof useQueryClient>,
  username: string
): number | null => {
  const queries = queryClient.getQueryCache().findAll({
    queryKey: ['collection', username],
    exact: false,
    predicate: (query) => query.state.data !== undefined
  })

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

  return { ...firstPage, releases }
}

/**
 * Tracks collection sync status using persisted baseline metadata.
 *
 * Computes pending sync changes from live metadata count versus the local
 * baseline stored in localStorage. Works across authenticated routes without
 * requiring collection query cache to exist.
 *
 * @returns Collection sync descriptor and controls for refresh/minimize/open
 */
export function useCollectionSync(): CollectionSyncResult {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const trpcUtils = trpc.useUtils()
  const { hasHydrated } = useHydrationState()
  const tokens = useAuthStore((state) => state.tokens)
  const { profile } = useUserProfile()
  const upsertFromMetadata = useSyncStateStore(
    (state) => state.upsertFromMetadata
  )
  const setRefreshing = useSyncStateStore((state) => state.setRefreshing)
  const setMinimized = useSyncStateStore((state) => state.setMinimized)
  const acknowledgeBaseline = useSyncStateStore(
    (state) => state.acknowledgeBaseline
  )

  const username = profile?.username
  const syncKey =
    username !== undefined ? buildCollectionSyncKey(username) : null

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
      staleTime: 30 * 1000
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

  const refreshCollection = async (): Promise<void> => {
    if (!syncKey || !username) return

    setRefreshing(syncKey, true)

    try {
      const cachedCollectionQueries = queryClient.getQueryCache().findAll({
        queryKey: ['collection', username],
        exact: false,
        predicate: (query) => query.state.data !== undefined
      })

      if (cachedCollectionQueries.length > 0) {
        const currentTokens = useAuthStore.getState().tokens
        if (!currentTokens) {
          throw new Error('OAuth tokens are required to refresh collection')
        }

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
        }
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

      upsertFromMetadata({
        key: syncKey,
        scope: COLLECTION_SCOPE,
        liveCount: metadata.totalCount
      })
      acknowledgeBaseline({ key: syncKey, baselineCount: metadata.totalCount })
    } catch (error) {
      setRefreshing(syncKey, false)
      throw error
    }
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

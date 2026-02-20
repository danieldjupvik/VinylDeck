import { QueryClient } from '@tanstack/react-query'

import { queryPersister } from '@/lib/query-persister'
import type { SyncScope } from '@/types/sync'

import type { PersistedClient } from '@tanstack/query-persist-client-core'

interface PersistedQueryShape {
  queryKey: readonly unknown[]
}

// Matches manually-keyed queries (e.g. ['collection', username, ...]).
// tRPC-managed queries have an array at queryKey[0] and are intentionally excluded.
const isScopeQueryKey = (scope: SyncScope, queryKey: readonly unknown[]) =>
  queryKey[0] === scope

const isScopePersistedQuery = (
  scope: SyncScope,
  query: PersistedQueryShape
): boolean => isScopeQueryKey(scope, query.queryKey)

const getQueryKey = (value: unknown): readonly unknown[] | null => {
  if (typeof value !== 'object' || value === null) return null
  const maybeQueryKey = (value as { queryKey?: unknown }).queryKey
  return Array.isArray(maybeQueryKey) ? maybeQueryKey : null
}

const isPersistedQueryShape = (value: unknown): value is PersistedQueryShape =>
  getQueryKey(value) !== null

/**
 * Removes cached queries for one scope from the in-memory query client.
 *
 * @param queryClient - TanStack Query client instance
 * @param scope - Cache scope identifier
 * @returns Promise that resolves after active scope queries are cancelled and removed
 */
const clearInMemoryScopeCache = async (
  queryClient: QueryClient,
  scope: SyncScope
): Promise<void> => {
  await queryClient.cancelQueries({
    predicate: (query) => {
      const queryKey = getQueryKey(query)
      return queryKey ? isScopeQueryKey(scope, queryKey) : false
    }
  })
  queryClient.removeQueries({
    predicate: (query) => {
      const queryKey = getQueryKey(query)
      return queryKey ? isScopeQueryKey(scope, queryKey) : false
    }
  })
}

/**
 * Removes persisted IndexedDB queries for one scope.
 *
 * @param scope - Cache scope identifier
 * @returns Promise that resolves after persisted scope queries are removed
 */
const clearPersistedScopeCache = async (scope: SyncScope): Promise<void> => {
  const persistedClient = await queryPersister.restoreClient()
  if (!persistedClient) return

  const nextQueries = persistedClient.clientState.queries.filter(
    (query) =>
      !isPersistedQueryShape(query) || !isScopePersistedQuery(scope, query)
  )
  if (nextQueries.length === persistedClient.clientState.queries.length) return

  const nextClient: PersistedClient = {
    ...persistedClient,
    clientState: {
      ...persistedClient.clientState,
      queries: nextQueries
    }
  }
  await queryPersister.persistClient(nextClient)
}

/**
 * Clears one scope from both in-memory and persisted query caches.
 *
 * @param queryClient - TanStack Query client instance
 * @param scope - Cache scope identifier
 * @returns Promise that resolves after both cache layers are cleared for the scope
 * @throws Errors from in-memory query cancellation/removal or IndexedDB persistence
 */
export async function clearScopeCache(
  queryClient: QueryClient,
  scope: SyncScope
): Promise<void> {
  await clearInMemoryScopeCache(queryClient, scope)
  await clearPersistedScopeCache(scope)
}

/**
 * Clears all TanStack query cache layers (memory and persisted IndexedDB).
 *
 * @param queryClient - TanStack Query client instance
 * @returns Promise that resolves after all query cache layers are cleared
 * @throws Errors from `cancelQueries` or `clear` (`removeClient` swallows errors internally)
 */
export async function clearAllQueryCache(
  queryClient: QueryClient
): Promise<void> {
  await queryClient.cancelQueries()
  queryClient.clear()
  await queryPersister.removeClient()
}

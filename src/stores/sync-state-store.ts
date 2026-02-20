import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { STORAGE_KEYS } from '@/lib/storage-keys'
import { buildSyncKey, parseSyncKey } from '@/lib/sync-keys'
import { SYNC_SCOPES } from '@/types/sync'
import type { SyncScope } from '@/types/sync'

const SYNC_PERSIST_VERSION = 2

export interface SyncScopeState {
  scope: SyncScope
  baselineCount: number
  liveCount: number
  pendingNewCount: number
  pendingDeletedCount: number
  isPending: boolean
  isMinimized: boolean
  isRefreshing: boolean
  lastDetectedAt: number | null
  lastAckedAt: number | null
}

export interface UpsertFromMetadataInput {
  key: string
  scope: SyncScope
  liveCount: number
  baselineCount?: number | undefined
  detectedAt?: number | undefined
}

export interface AcknowledgeBaselineInput {
  key: string
  baselineCount?: number | undefined
  ackedAt?: number | undefined
}

export interface SyncStateStore {
  entries: Record<string, SyncScopeState>
  /**
   * Upserts live metadata and computes pending deltas against the persisted baseline.
   *
   * @param input - Sync scope key, scope name, and latest live collection count
   */
  upsertFromMetadata: (input: UpsertFromMetadataInput) => void
  /**
   * Sets minimized state for one sync scope.
   *
   * @param key - Sync scope key
   * @param isMinimized - Whether the surface should be minimized
   */
  setMinimized: (key: string, isMinimized: boolean) => void
  /**
   * Sets refreshing state for one sync scope.
   *
   * @param key - Sync scope key
   * @param isRefreshing - Whether refresh is in progress
   */
  setRefreshing: (key: string, isRefreshing: boolean) => void
  /**
   * Acknowledges current or provided baseline and clears pending state.
   *
   * @param input - Sync scope key and optional baseline override
   */
  acknowledgeBaseline: (input: AcknowledgeBaselineInput) => void
  /**
   * Clears one sync scope entry.
   *
   * @param key - Sync scope key
   */
  clearScope: (key: string) => void
  /**
   * Clears all sync entries.
   */
  clearAll: () => void
}

type PersistedSyncState = Pick<SyncStateStore, 'entries'>

const toNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.trunc(value))
}

const toNullableTimestamp = (value: unknown): number | null => {
  if (value === null) return null
  const parsed = toNonNegativeNumber(value)
  return parsed ?? null
}

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const pickMostRecentEntry = (
  current: SyncScopeState | undefined,
  candidate: SyncScopeState
): SyncScopeState => {
  if (!current) return candidate

  const currentMostRecent = Math.max(
    current.lastDetectedAt ?? 0,
    current.lastAckedAt ?? 0
  )
  const candidateMostRecent = Math.max(
    candidate.lastDetectedAt ?? 0,
    candidate.lastAckedAt ?? 0
  )

  return candidateMostRecent >= currentMostRecent ? candidate : current
}

const sanitizePersistedEntry = (value: unknown): SyncScopeState | null => {
  if (typeof value !== 'object' || value === null) return null

  const raw = value as Record<string, unknown>
  if (
    typeof raw['scope'] !== 'string' ||
    !SYNC_SCOPES.includes(raw['scope'] as SyncScope)
  ) {
    return null
  }
  const scope = raw['scope'] as SyncScope

  const baselineCount = toNonNegativeNumber(raw['baselineCount'])
  const liveCount = toNonNegativeNumber(raw['liveCount'])
  if (baselineCount === null || liveCount === null) return null

  const pendingNewCount = Math.max(0, liveCount - baselineCount)
  const pendingDeletedCount = Math.max(0, baselineCount - liveCount)
  const isPending = pendingNewCount > 0 || pendingDeletedCount > 0

  return {
    scope,
    baselineCount,
    liveCount,
    pendingNewCount,
    pendingDeletedCount,
    isPending,
    isMinimized: isPending ? toBoolean(raw['isMinimized'], false) : false,
    isRefreshing: false,
    lastDetectedAt: isPending
      ? toNullableTimestamp(raw['lastDetectedAt'])
      : null,
    lastAckedAt: toNullableTimestamp(raw['lastAckedAt'])
  }
}

const sanitizePersistedEntries = (
  entries: unknown
): Record<string, SyncScopeState> => {
  if (typeof entries !== 'object' || entries === null) return {}

  const nextEntries: Record<string, SyncScopeState> = {}

  for (const [rawKey, rawValue] of Object.entries(entries)) {
    const parsedKey = parseSyncKey(rawKey)
    if (!parsedKey) continue

    const sanitized = sanitizePersistedEntry(rawValue)
    if (!sanitized) continue

    const normalizedKey = buildSyncKey(parsedKey.scope, parsedKey.identity)
    nextEntries[normalizedKey] = pickMostRecentEntry(
      nextEntries[normalizedKey],
      sanitized
    )
  }

  return nextEntries
}

const partializeSyncState = (state: SyncStateStore): PersistedSyncState => ({
  entries: Object.fromEntries(
    Object.entries(state.entries).map(([key, entry]) => [
      key,
      {
        ...entry,
        isRefreshing: false
      }
    ])
  )
})

const migrateSyncState = (persistedState: unknown): PersistedSyncState => {
  const rawState = (persistedState ?? {}) as Partial<PersistedSyncState>
  return { entries: sanitizePersistedEntries(rawState.entries) }
}

/**
 * localStorage-backed sync state store for pending data refresh indicators.
 *
 * Persists per-user/per-scope baseline and pending deltas so sync state survives
 * hard refresh and session sign-out. Disconnect flow clears this store.
 *
 * @returns Zustand store hook with sync entries and sync state actions
 */
export const useSyncStateStore = create<SyncStateStore>()(
  persist(
    (set) => ({
      entries: {},

      upsertFromMetadata: ({
        key,
        scope,
        liveCount,
        baselineCount,
        detectedAt
      }) =>
        set((state) => {
          const now = detectedAt ?? Date.now()
          const existing = state.entries[key]

          if (!existing) {
            const initialBaseline = baselineCount ?? liveCount
            const pendingNewCount = Math.max(0, liveCount - initialBaseline)
            const pendingDeletedCount = Math.max(0, initialBaseline - liveCount)
            const isPending = pendingNewCount > 0 || pendingDeletedCount > 0

            return {
              entries: {
                ...state.entries,
                [key]: {
                  scope,
                  baselineCount: initialBaseline,
                  liveCount,
                  pendingNewCount,
                  pendingDeletedCount,
                  isPending,
                  isMinimized: false,
                  isRefreshing: false,
                  lastDetectedAt: isPending ? now : null,
                  lastAckedAt: now
                }
              }
            }
          }

          const nextBaseline = baselineCount ?? existing.baselineCount
          const pendingNewCount = Math.max(0, liveCount - nextBaseline)
          const pendingDeletedCount = Math.max(0, nextBaseline - liveCount)
          const isPending = pendingNewCount > 0 || pendingDeletedCount > 0
          const pendingChanged =
            pendingNewCount !== existing.pendingNewCount ||
            pendingDeletedCount !== existing.pendingDeletedCount
          const shouldExpand =
            isPending && existing.isMinimized && pendingChanged
          const nextIsMinimized = shouldExpand ? false : existing.isMinimized
          const nextLastDetectedAt =
            isPending && pendingChanged ? now : existing.lastDetectedAt

          if (
            existing.baselineCount === nextBaseline &&
            existing.liveCount === liveCount &&
            existing.pendingNewCount === pendingNewCount &&
            existing.pendingDeletedCount === pendingDeletedCount &&
            existing.isPending === isPending &&
            existing.isMinimized === nextIsMinimized &&
            existing.lastDetectedAt === nextLastDetectedAt
          ) {
            return state
          }

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...existing,
                scope,
                baselineCount: nextBaseline,
                liveCount,
                pendingNewCount,
                pendingDeletedCount,
                isPending,
                isMinimized: nextIsMinimized,
                lastDetectedAt: nextLastDetectedAt
              }
            }
          }
        }),

      setMinimized: (key, isMinimized) =>
        set((state) => {
          const existing = state.entries[key]
          if (!existing) return state
          return {
            entries: {
              ...state.entries,
              [key]: { ...existing, isMinimized }
            }
          }
        }),

      setRefreshing: (key, isRefreshing) =>
        set((state) => {
          const existing = state.entries[key]
          if (!existing) return state
          return {
            entries: {
              ...state.entries,
              [key]: { ...existing, isRefreshing }
            }
          }
        }),

      acknowledgeBaseline: ({ key, baselineCount, ackedAt }) =>
        set((state) => {
          const existing = state.entries[key]
          if (!existing) return state

          const nextBaseline = baselineCount ?? existing.liveCount
          const pendingNewCount = Math.max(0, existing.liveCount - nextBaseline)
          const pendingDeletedCount = Math.max(
            0,
            nextBaseline - existing.liveCount
          )
          const isPending = pendingNewCount > 0 || pendingDeletedCount > 0

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...existing,
                baselineCount: nextBaseline,
                pendingNewCount,
                pendingDeletedCount,
                isPending,
                isMinimized: existing.isMinimized,
                isRefreshing: false,
                lastAckedAt: ackedAt ?? Date.now()
              }
            }
          }
        }),

      clearScope: (key) =>
        set((state) => {
          if (!(key in state.entries)) return state
          const { [key]: removedEntry, ...nextEntries } = state.entries
          void removedEntry
          return { entries: nextEntries }
        }),

      clearAll: () => set({ entries: {} })
    }),
    {
      name: STORAGE_KEYS.SYNC,
      version: SYNC_PERSIST_VERSION,
      partialize: partializeSyncState,
      migrate: migrateSyncState
    }
  )
)

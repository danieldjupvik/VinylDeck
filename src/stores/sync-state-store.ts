import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { STORAGE_KEYS } from '@/lib/storage-keys'
import type { SyncScope } from '@/types/sync'

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

interface UpsertFromMetadataInput {
  key: string
  scope: SyncScope
  liveCount: number
  baselineCount?: number | undefined
  detectedAt?: number | undefined
}

interface AcknowledgeBaselineInput {
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

/**
 * localStorage-backed sync state store for pending data refresh indicators.
 *
 * Persists per-user/per-scope baseline and pending deltas so sync state survives
 * hard refresh and session sign-out. Disconnect flow clears this store.
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

          const pendingNewCount = Math.max(
            0,
            liveCount - existing.baselineCount
          )
          const pendingDeletedCount = Math.max(
            0,
            existing.baselineCount - liveCount
          )
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
                isMinimized: isPending ? existing.isMinimized : false,
                isRefreshing: false,
                lastAckedAt: ackedAt ?? Date.now()
              }
            }
          }
        }),

      clearScope: (key) =>
        set((state) => {
          if (!(key in state.entries)) return state
          const nextEntries = Object.fromEntries(
            Object.entries(state.entries).filter(
              ([entryKey]) => entryKey !== key
            )
          )
          return { entries: nextEntries }
        }),

      clearAll: () => set({ entries: {} })
    }),
    { name: STORAGE_KEYS.SYNC }
  )
)

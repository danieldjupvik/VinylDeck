export const SYNC_SCOPES = ['collection'] as const

export type SyncScope = (typeof SYNC_SCOPES)[number]

export type SyncStatus = 'idle' | 'pending' | 'refreshing'

export interface SyncCounts {
  newItems: number
  deletedItems: number
}

export interface SyncPendingDescriptor {
  key: string
  scope: SyncScope
  status: SyncStatus
  counts: SyncCounts
  isMinimized: boolean
  message: string
  refreshFailedMessage: string
}

export type SyncScope = 'collection'

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

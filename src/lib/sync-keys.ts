import { SYNC_SCOPES } from '@/types/sync'
import type { SyncScope } from '@/types/sync'

interface ParsedSyncKey {
  scope: SyncScope
  identity: string
}

const SYNC_KEY_DELIMITER = ':'

/**
 * Builds a normalized sync-state key for one scope and identity.
 *
 * @param scope - Sync scope name
 * @param identity - Scope identity (for example username)
 * @returns Normalized persisted key in `<scope>:<identity>` format
 */
export function buildSyncKey(scope: SyncScope, identity: string): string {
  return `${scope}${SYNC_KEY_DELIMITER}${identity.trim().toLowerCase()}`
}

/**
 * Parses a persisted sync-state key into scope and identity.
 *
 * @param key - Persisted key in `<scope>:<identity>` format
 * @returns Parsed scope/identity pair or null when key is invalid
 */
export function parseSyncKey(key: string): ParsedSyncKey | null {
  const [rawScope, rawIdentity, ...rest] = key.split(SYNC_KEY_DELIMITER)
  if (rest.length > 0) return null
  if (!rawScope || !rawIdentity) return null
  if (!SYNC_SCOPES.includes(rawScope as SyncScope)) return null

  const identity = rawIdentity.trim().toLowerCase()
  if (!identity) return null

  return { scope: rawScope as SyncScope, identity }
}

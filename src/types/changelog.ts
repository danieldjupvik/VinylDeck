/**
 * Category for changelog entries.
 * Displayed in priority order: features, improvements, fixes.
 */
export type ChangelogCategory = 'features' | 'improvements' | 'fixes'

/**
 * A single changelog entry within a version.
 */
export interface ChangelogEntry {
  /**
   * Translation key for the entry text.
   * Supports markdown formatting (bold, code, etc.).
   * Pattern: `changelog.{version_underscored}.{category}_{index}`
   * @example 'changelog.0_3_0_beta.feature_1'
   */
  key: string
}

/**
 * A version entry in the changelog.
 * Each version contains categorized entries describing user-facing changes.
 */
export interface ChangelogVersion {
  /**
   * Semver version string.
   * @example '0.3.0-beta'
   */
  version: string

  /**
   * Release date in ISO format (YYYY-MM-DD).
   * @example '2026-01-29'
   */
  date: string

  /** New features added in this version */
  features?: ChangelogEntry[]

  /** Improvements to existing functionality */
  improvements?: ChangelogEntry[]

  /** Bug fixes in this version */
  fixes?: ChangelogEntry[]
}

/**
 * Ordered array of changelog versions.
 * Newest version first, oldest last.
 */
export type ChangelogData = ChangelogVersion[]

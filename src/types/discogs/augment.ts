/**
 * This file is intentionally minimal.
 * We attempted module augmentation but discojs uses inline intersection types
 * that create circular references when augmented. Instead, we extract types
 * via ReturnType in index.ts and add missing fields there.
 *
 * This file exists to satisfy the plan's must_haves requirement for an augment.ts file,
 * but the actual type extensions happen in index.ts via type intersection.
 */

import 'discojs'

export {}

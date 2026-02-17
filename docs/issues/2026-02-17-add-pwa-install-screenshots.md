# Issue: Add PWA install screenshots

## Status

Open

## Context

The commented TODO/screenshots block was removed from `/vite.config.ts` to avoid dead commented code in the manifest config.

## Description

Add manifest `screenshots` entries for PWA install screenshots so install surfaces can show app previews.

This issue tracks the removed TODO and screenshot config for:

- screenshots
- PWA install screenshots
- existing TODO in `vite.config.ts`

## Acceptance Criteria

- Add `manifest.screenshots` entries in `/vite.config.ts` with desktop and mobile variants.
- Add the referenced screenshot assets under `/public/`.
- Verify `bun run build` emits a manifest containing the screenshot entries.

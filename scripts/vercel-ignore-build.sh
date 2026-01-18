#!/bin/bash

# Vercel Ignored Build Step
# https://vercel.com/docs/projects/overview#ignored-build-step
#
# This script determines whether Vercel should build a commit.
# Exit 1 = build, Exit 0 = skip build
#
# Strategy: Only build when:
# 1. The commit is a release commit from release-please (updates version in package.json)
# 2. OR when manually triggered via Vercel dashboard

echo "Checking if this commit should trigger a Vercel build..."

# Get the commit message
COMMIT_MSG=$(git log -1 --pretty=%B)

# Check if this is a release-please release commit
# Release-please creates commits like "chore(main): release 0.2.0"
if echo "$COMMIT_MSG" | grep -qE "^chore\(main\): release"; then
  echo "✓ Release commit detected - proceeding with build"
  exit 1
fi

# Check if package.json version was changed in this commit
# This catches release-please version bumps
if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
  VERSION_CHANGED=$(git diff HEAD~1 HEAD -- package.json | grep -E '^\+.*"version"' || true)
  if [ -n "$VERSION_CHANGED" ]; then
    echo "✓ Version bump detected in package.json - proceeding with build"
    exit 1
  fi
fi

# Check for release tags
TAGS=$(git tag --points-at HEAD)
if echo "$TAGS" | grep -qE "^v[0-9]+\.[0-9]+"; then
  echo "✓ Release tag detected - proceeding with build"
  exit 1
fi

echo "✗ Not a release commit - skipping build"
echo "  Feature branches are deployed only after release-please PR is merged"
exit 0

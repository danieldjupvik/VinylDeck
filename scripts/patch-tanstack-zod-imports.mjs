// TODO: Remove this script once TanStack Router ships zod v4 support
// Tracking: https://github.com/TanStack/router/issues/6138
// Fix PR: https://github.com/TanStack/router/pull/6652
//
// Zod 3.25.x (the "Mini" bridge release) breaks @tanstack/router-generator
// because its default export uses the v4 API, but the v3 compat layer's
// ZodObject._parse expects v3 objects with _parse methods. This script
// rewrites TanStack's bare "zod" imports to "zod/v3" so schema objects
// are created with the actual v3 API.
import { promises as fs } from 'node:fs'
import path from 'node:path'

const packageDirs = [
  'node_modules/@tanstack/router-generator',
  'node_modules/@tanstack/router-plugin'
]

const targetExtensions = new Set(['.js', '.cjs', '.ts'])

const replacements = [
  ['from "zod"', 'from "zod/v3"'],
  ["from 'zod'", "from 'zod/v3'"],
  ['require("zod")', 'require("zod/v3")'],
  ["require('zod')", "require('zod/v3')"]
]

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function walkFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      const nested = await walkFiles(fullPath)
      files.push(...nested)
      continue
    }

    if (targetExtensions.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

let totalFilesPatched = 0

for (const packageDir of packageDirs) {
  const absolutePackageDir = path.resolve(process.cwd(), packageDir)
  if (!(await pathExists(absolutePackageDir))) {
    continue
  }

  const files = await walkFiles(absolutePackageDir)

  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8')
    let patched = source

    for (const [from, to] of replacements) {
      patched = patched.split(from).join(to)
    }

    if (patched !== source) {
      await fs.writeFile(filePath, patched, 'utf8')
      totalFilesPatched += 1
    }
  }
}

if (totalFilesPatched > 0) {
  console.log(`patched ${totalFilesPatched} TanStack files to use zod/v3`)
} else {
  console.log('TanStack zod patch: no changes needed')
}

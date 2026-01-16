# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `bun dev` - Start development server with HMR
- `bun run build` - Type-check with TypeScript and build for production
- `bun run lint` - Run ESLint
- `bun run preview` - Preview production build locally

## Tech Stack

- **React 19** with React Compiler enabled (via babel-plugin-react-compiler)
- **Vite 7** for bundling and dev server
- **TypeScript 5.9** with strict configuration
- **Tailwind CSS 4** via @tailwindcss/vite plugin
- **shadcn/ui** (new-york style) for UI components
- **Bun** as the package manager

## Project Structure

- `src/components/ui/` - shadcn/ui components (added via `bunx shadcn add <component>`)
- `src/components/` - Custom application components
- `src/lib/utils.ts` - Utility functions including `cn()` for className merging
- `src/hooks/` - Custom React hooks

## Path Aliases

Use `@/` to import from `src/`:
```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

## Adding shadcn Components

```bash
bunx shadcn add <component-name>
```

Components are placed in `src/components/ui/` and use the new-york style with lucide icons.

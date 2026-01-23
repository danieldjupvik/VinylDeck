// src/providers/theme-provider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes'

import type { ThemeProviderProps } from 'next-themes'

/**
 * Theme provider using next-themes.
 * Prevents FOUC (flash of unstyled content) and flickering during theme toggle.
 *
 * Benefits:
 * - No white flash on page load (inline script in index.html)
 * - No flickering on theme toggle (disableTransitionOnChange)
 * - Simpler implementation (~88 lines → ~15 lines)
 * - Battle-tested library (zero bundle impact, already installed)
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      storageKey="vinyldeck-theme"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

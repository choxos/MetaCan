'use client'
import { ThemeProvider as NextThemes } from 'next-themes'

/**
 * Theme plumbing. next-themes stamps BOTH `class="dark"` (for Tailwind's dark:
 * variants) and `data-theme="dark|light"` (the design's selector) on <html>,
 * and persists the explicit choice in localStorage. Default is light, per the
 * design; there is no system mode, because the design specifies a two-state
 * toggle.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute={['class', 'data-theme']}
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  )
}

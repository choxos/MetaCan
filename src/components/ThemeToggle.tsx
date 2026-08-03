'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/** The design's own 14px strokes: moon shown in light, sun in dark. */
const MOON = 'M11.5 8.6A5.1 5.1 0 0 1 5.4 2.5 5.1 5.1 0 1 0 11.5 8.6Z'
const SUN =
  'M7 3.5A3.5 3.5 0 1 1 7 10.5 3.5 3.5 0 0 1 7 3.5ZM7 .8v1M7 12.2v1M.8 7h1M12.2 7h1M2.6 2.6l.7.7M10.7 10.7l.7.7M11.4 2.6l-.7.7M3.3 10.7l-.7.7'

export function ThemeToggle({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  // The server does not know the user's theme, so rendering the icon before
  // mount produces a hydration mismatch. Render the box, not the glyph.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md border"
      style={{ background: 'var(--surface)', color: 'var(--ink-3)' }}
    >
      {mounted ? (
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d={resolvedTheme === 'dark' ? SUN : MOON}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <span style={{ display: 'block', width: 14, height: 14 }} />
      )}
    </button>
  )
}

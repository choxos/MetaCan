'use client'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  // The server does not know the user's theme, so rendering the icon before
  // mount produces a hydration mismatch. Render the box, not the glyph.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <button
      aria-label={label}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="rounded-md border p-2"
      style={{ background: 'var(--surface-2)' }}
    >
      {mounted && (resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />)}
      {!mounted && <span style={{ display: 'block', width: 16, height: 16 }} />}
    </button>
  )
}

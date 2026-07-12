'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, type CSSProperties } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

const SIZE = 32

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const baseStyle: CSSProperties = {
    width: SIZE,
    height: SIZE,
    borderRadius: 'var(--r-md)',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--ink-3)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  }

  if (!mounted) {
    return (
      <button style={baseStyle} aria-label="Toggle theme" disabled>
        <Monitor size={15} />
      </button>
    )
  }

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const icon =
    theme === 'light' ? <Sun size={15} /> : theme === 'dark' ? <Moon size={15} /> : <Monitor size={15} />

  const label =
    theme === 'light'
      ? 'Light mode (click for dark)'
      : theme === 'dark'
      ? 'Dark mode (click for system)'
      : 'System theme (click for light)'

  return (
    <button
      onClick={cycleTheme}
      style={baseStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--ink)'
        e.currentTarget.style.borderColor = 'var(--border-strong)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--ink-3)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  )
}

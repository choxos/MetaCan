'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { getDict } from '@/lib/i18n'
import { localePath, type Lang } from '@/lib/lang'

/**
 * The hero search bar. It is an entry point, not a filter panel: submitting
 * routes to the cohort builder with ?q=, where the real query tool lives.
 * ⌘K (or Ctrl+K) focuses it, matching the hint the design draws in the bar.
 */
export function HomeSearch({ lang }: { lang: Lang }) {
  const t = getDict(lang)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = () => {
    const cohort = localePath(lang, '/cohort')
    const term = q.trim()
    router.push(term ? `${cohort}?q=${encodeURIComponent(term)}` : cohort)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        go()
      }}
      className="flex h-[62px] items-center gap-3 border-b pl-[22px] pr-2"
    >
      <svg width="16" height="16" viewBox="0 0 15 15" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="var(--ink-4)" strokeWidth="1.5" />
        <line x1="10" y1="10" x2="13.5" y2="13.5" stroke="var(--ink-4)" strokeWidth="1.5" />
      </svg>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.home.searchPh}
        aria-label={t.filters.searchAria}
        className="min-w-0 flex-1 border-0 bg-transparent outline-none"
        style={{ fontSize: 17, color: 'var(--ink)' }}
      />
      <span className="mono-meta hidden rounded border px-1.5 py-0.5 sm:inline" style={{ color: 'var(--ink-5)' }}>
        ⌘K
      </span>
      <button type="submit" className="btn btn-ink px-6 py-3 text-sm">
        {t.home.searchBtn}
      </button>
    </form>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { getDict } from '@/lib/i18n'
import { formatInt, type Lang } from '@/lib/lang'

/**
 * Search-as-you-type over a facet with too many values for a <select>
 * (~85,000 venues, ~4,500 topics). The chosen value is an EXACT string that
 * goes into the filter as an equality; nothing fuzzy leaks into the query, so
 * the cohort stays reproducible. Only a picked suggestion sets the filter;
 * free text that was never picked filters nothing, because a filter the user
 * merely typed but never confirmed would be an invisible difference between
 * two "identical" cohorts.
 */
export function Typeahead({
  label,
  endpoint,
  value,
  onPick,
  lang,
}: {
  label: string
  /** /api/v1/facets/venue or /api/v1/facets/topic */
  endpoint: string
  value: string
  onPick: (v: string | undefined) => void
  lang: Lang
}) {
  const t = getDict(lang)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Array<{ value: string; works: number }>>([])
  const [searched, setSearched] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = (q: string) => {
    setText(q)
    setSearched(false)
    if (timer.current) clearTimeout(timer.current)
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setResults([])
      setOpen(trimmed.length > 0)
      return
    }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${endpoint}?q=${encodeURIComponent(trimmed)}`)
        if (!r.ok) return
        const j = (await r.json()) as { results: Array<{ value: string; works: number }> }
        setResults(j.results)
        setSearched(true)
        setOpen(true)
      } catch {
        /* a lost keystroke query is not an error worth surfacing */
      }
    }, 200)
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
        {label}
      </div>

      {value ? (
        <div
          className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
        >
          <span className="truncate" title={value}>
            {value}
          </span>
          <button
            type="button"
            className="link shrink-0 text-xs"
            style={{ color: 'var(--mc)' }}
            onClick={() => {
              onPick(undefined)
              setText('')
            }}
          >
            {t.cohort.typeaheadClear}
          </button>
        </div>
      ) : (
        <>
          <input
            value={text}
            onChange={(e) => search(e.target.value)}
            onFocus={() => text.trim().length > 0 && setOpen(true)}
            placeholder={t.cohort.typeaheadMin}
            aria-label={label}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
          />
          {open && (
            <div
              className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border shadow-lg"
              style={{ background: 'var(--surface)', minWidth: '16rem' }}
            >
              {results.length === 0 ? (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--ink-5)' }}>
                  {text.trim().length < 2 ? t.cohort.typeaheadMin : searched ? t.cohort.typeaheadNone : '…'}
                </div>
              ) : (
                results.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      onPick(r.value)
                      setOpen(false)
                      setText('')
                    }}
                  >
                    <span className="min-w-0 truncate" title={r.value}>
                      {r.value}
                    </span>
                    <span className="tabular shrink-0 text-xs" style={{ color: 'var(--ink-5)' }}>
                      {formatInt(lang, r.works)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

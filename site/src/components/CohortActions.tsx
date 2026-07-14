'use client'

import { useState } from 'react'
import { getDict } from '@/lib/i18n'
import { formatInt, type Lang } from '@/lib/lang'

/**
 * Export and citation actions for the current cohort.
 *
 * The export links are plain <a> downloads: the browser streams the file
 * straight from /api/v1/cohort/export, and this component's only jobs are to
 * carry the CURRENT filter state into the link and to say, before the click,
 * whether the cohort exceeds the export cap. A cap discovered after the
 * download would be a silent truncation, which this project does not do.
 *
 * "Cite this cohort" mints the /q/<hash> permalink. Idempotent server-side:
 * the same filters always return the same URL.
 */
export function CohortActions({
  query,
  total,
  exportCap,
  lang,
}: {
  /** The canonical filter query string for the current cohort (no page/sort). */
  query: string
  total: number
  exportCap: number
  lang: Lang
}) {
  const t = getDict(lang)
  const [permalink, setPermalink] = useState<string | null>(null)
  const [minting, setMinting] = useState(false)
  const [copied, setCopied] = useState(false)

  const qs = query ? `&${query}` : ''
  const truncated = total > exportCap

  const mint = async () => {
    setMinting(true)
    try {
      const r = await fetch(`/api/v1/permalink${query ? `?${query}` : ''}`, { method: 'POST' })
      if (!r.ok) return
      const j = (await r.json()) as { url: string }
      setPermalink(j.url)
    } finally {
      setMinting(false)
    }
  }

  const copy = async () => {
    if (!permalink) return
    try {
      await navigator.clipboard.writeText(permalink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* the URL is visible and selectable; a failed clipboard is survivable */
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
          {t.cohort.exportTitle}
        </span>
        <a
          href={`/api/v1/cohort/export?format=csv${qs}`}
          className="rounded-md border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--mc)', color: 'var(--mc)' }}
          download
        >
          {t.cohort.exportCsv}
        </a>
        <a
          href={`/api/v1/cohort/export?format=json${qs}`}
          className="rounded-md border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--mc)', color: 'var(--mc)' }}
          download
        >
          {t.cohort.exportJson}
        </a>

        <span className="mx-1 hidden h-5 border-l sm:inline-block" />

        <button
          onClick={mint}
          disabled={minting}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--mc)' }}
        >
          {minting ? t.cohort.citeWorking : t.cohort.citeButton}
        </button>

        {permalink && (
          <span className="flex items-center gap-2 text-sm">
            <a href={permalink} className="link font-mono text-xs" style={{ color: 'var(--mc)' }}>
              {permalink.replace(/^https?:\/\//, '')}
            </a>
            <button onClick={copy} className="link text-xs" style={{ color: 'var(--ink-4)' }}>
              {copied ? t.cohort.citeCopied : t.cohort.citeCopy}
            </button>
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--ink-5)' }}>
        {truncated
          ? t.cohort.exportTruncated(formatInt(lang, total), formatInt(lang, exportCap))
          : t.cohort.exportNote(formatInt(lang, exportCap))}{' '}
        {t.cohort.citeNote}
      </p>

      <p className="mt-1 text-xs" style={{ color: 'var(--ink-5)' }}>
        {t.cohort.apiLine}{' '}
        <a href={`/api/v1/cohort${query ? `?${query}` : ''}`} className="link font-mono">
          /api/v1/cohort{query ? `?${query}` : ''}
        </a>
      </p>
    </div>
  )
}

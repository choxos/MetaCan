'use client'

import { useState } from 'react'
import { getDict } from '@/lib/i18n'
import { formatInt, type Lang } from '@/lib/lang'

/**
 * The cohort header's action buttons, per the design: Export CSV, Copy /q/
 * permalink, API query, plus the JSON export.
 *
 * The export links are plain <a> downloads: the browser streams the file
 * straight from /api/v1/cohort/export, and this component's only jobs are to
 * carry the CURRENT filter state into the link and to say, before the click,
 * whether the cohort exceeds the export cap. A cap discovered after the
 * download would be a silent truncation, which this project does not do.
 *
 * "Copy /q/ permalink" mints the citable /q/<hash> link. Idempotent
 * server-side: the same filters always return the same URL.
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
      try {
        await navigator.clipboard.writeText(j.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch {
        /* the URL is rendered below; a refused clipboard is survivable */
      }
    } finally {
      setMinting(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <a className="btn" href={`/api/v1/cohort/export?format=csv${qs}`} download>
          {t.cohort.exportCsvBtn}
        </a>
        <a className="btn" href={`/api/v1/cohort/export?format=json${qs}`} download>
          {t.cohort.exportJsonBtn}
        </a>
        <button onClick={mint} disabled={minting} className="btn disabled:opacity-60">
          {minting ? t.cohort.citeWorking : copied ? t.cohort.citeCopied : t.cohort.copyPermalinkBtn}
        </button>
        <a className="btn font-mono" href={`/api/v1/cohort${query ? `?${query}` : ''}`}>
          {t.cohort.apiQueryBtn}
        </a>
      </div>
      {permalink && (
        <a href={permalink} className="link font-mono text-xs">
          {permalink.replace(/^https?:\/\//, '')}
        </a>
      )}
      <p className="max-w-[560px] text-xs leading-snug sm:text-right" style={{ color: 'var(--ink-5)' }}>
        {truncated
          ? t.cohort.exportTruncated(formatInt(lang, total), formatInt(lang, exportCap))
          : t.cohort.exportNote(formatInt(lang, exportCap))}{' '}
        {t.cohort.citeNote}
      </p>
    </div>
  )
}

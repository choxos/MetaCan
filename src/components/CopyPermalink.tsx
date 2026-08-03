'use client'

import { useState } from 'react'

/**
 * "Copy /q/ permalink": mints the citable permalink for a filter state (the
 * mint is idempotent server-side; the same filters always return the same
 * URL) and puts it on the clipboard. Used by the home preview, the cohort
 * builder header, and the record page.
 */
export function CopyPermalink({
  query,
  label,
  copiedLabel,
  className = 'btn',
  url,
}: {
  /** Canonical filter query string, no leading `?`. Empty = the whole frame. */
  query?: string
  label: string
  copiedLabel: string
  className?: string
  /** When set, copies this URL directly instead of minting a /q/ permalink. */
  url?: string
}) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* the URL is visible elsewhere on the page; a refused clipboard is survivable */
    }
  }

  const onClick = async () => {
    if (url) {
      await copy(url)
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`/api/v1/permalink${query ? `?${query}` : ''}`, { method: 'POST' })
      if (!r.ok) return
      const j = (await r.json()) as { url: string }
      await copy(j.url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      {copied ? copiedLabel : label}
    </button>
  )
}

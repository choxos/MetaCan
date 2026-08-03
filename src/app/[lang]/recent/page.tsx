import type { Metadata } from 'next'
import Link from 'next/link'
import { getRecentStatus, getRecentWorks, type RecentAuthor } from '@/lib/recent'
import { frameTotal } from '@/lib/query'
import { SNAPSHOT } from '@/lib/permalink'
import { getDict, type Dictionary } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, numberLocale, type Lang } from '@/lib/lang'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).recent.title, alternates: langAlternates(lang, '/recent') }
}

/**
 * The live layer: recent Canadian works synced daily from the OpenAlex API,
 * VISIBLY SEPARATE from the frozen frame. Every row carries the live-layer
 * chip, no row carries a classifier category, and the sync banner reports
 * the latest run's real status: count, window, lexicon version, and whether
 * the last attempt actually succeeded.
 */

function fmtDate(lang: Lang, d: Date): string {
  return d.toLocaleDateString(numberLocale(lang), { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtTs(d: Date): string {
  // Mono meta line, UTC, per the design's "last sync ... UTC".
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

function RecentRow({
  t,
  lang,
  w,
}: {
  t: Dictionary
  lang: Lang
  w: Awaited<ReturnType<typeof getRecentWorks>>['rows'][number]
}) {
  const routes = [
    w.routeCaAff ? 'aff' : null,
    w.routeCaFund ? 'fund' : null,
    w.routeCaVenue ? 'venue' : null,
    w.routeAboutCa ? 'about' : null,
  ].filter((x): x is string => x !== null)
  const authors = Array.isArray(w.authors)
    ? (w.authors as RecentAuthor[])
        .map((a) => (typeof a === 'string' ? a : (a?.name ?? '')))
        .filter(Boolean)
        .slice(0, 6)
        .join(', ')
    : null

  return (
    <div className="flex items-start gap-4 border-b px-5 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="mb-[7px] flex flex-wrap items-center gap-[5px]">
          <span className="chip chip-live">{t.recent.liveChip}</span>
          {routes.map((r) => (
            <span key={r} className="chip chip-route">
              {r}
            </span>
          ))}
          {!w.routeCaAff && (
            <span className="chip chip-teal" title={t.workRow.noAffTitle}>
              no&nbsp;aff
            </span>
          )}
        </div>
        <div
          className="font-serif"
          style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.3, color: 'var(--ink)' }}
        >
          {w.title || t.common.noTitle}
        </div>
        <div className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
          <span className="tabular">{fmtDate(lang, w.publicationDate)}</span>
          {w.type && <span> · {w.type}</span>}
          {w.lang && <span> · {w.lang}</span>}
          {w.venue && <em> · {w.venue}</em>}
          {w.field && <span> · {w.field}</span>}
        </div>
        {authors && (
          <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--ink-4)' }}>
            {authors}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-serif tabular" style={{ fontSize: 20, color: 'var(--ink)' }}>
          {formatInt(lang, w.citedBy)}
        </div>
        <div className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
          {t.common.citations}
        </div>
      </div>
    </div>
  )
}

export default async function Recent({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const n = (x: number) => formatInt(lang, x)

  const [status, { rows }, frameN] = await Promise.all([getRecentStatus(), getRecentWorks(1, 50), frameTotal()])

  const run = status.lastRun
  const syncLine =
    run === null
      ? t.recent.lastSyncNone
      : run.status === 'succeeded'
        ? t.recent.lastSync(fmtTs(run.completedAt ?? run.startedAt))
        : status.lastSuccess?.completedAt
          ? `${t.recent.lastSync(fmtTs(status.lastSuccess.completedAt))} · ${t.recent.lastSyncFailed(fmtTs(run.completedAt ?? run.startedAt))}`
          : t.recent.lastSyncFailed(fmtTs(run.completedAt ?? run.startedAt))

  return (
    <div>
      <div className="max-w-[820px] pt-9">
        <div className="eyebrow" style={{ color: 'var(--teal)' }}>
          {t.recent.eyebrow}
        </div>
        <h1
          className="font-serif mt-2.5"
          style={{ fontSize: 'clamp(28px, 3.4vw, 36px)', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
        >
          {t.recent.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.recent.body(n(frameN))}
        </p>
      </div>

      {/* The live-sync banner: real counts, real status. */}
      <div
        className="mt-6 flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-lg border px-5 py-3.5"
        style={{ background: 'var(--teal-bg)', borderColor: 'var(--teal-border)' }}
      >
        <span className="chip chip-live">
          <span className="pulse-dot" aria-hidden="true" />
          {t.recent.liveChip}
        </span>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
          {t.recent.statusA} <strong className="tabular">{n(status.total)}</strong>{' '}
          {t.recent.statusB(SNAPSHOT.built)}
        </span>
        <span className="mono-meta flex flex-wrap gap-x-4 sm:ml-auto">
          <span>{syncLine}</span>
          {run && <span>{t.recent.lexicon(run.routeVersion)}</span>}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card mt-5 p-8 text-center text-sm" style={{ color: 'var(--ink-4)' }}>
          {t.recent.empty}
        </div>
      ) : (
        <div className="card mt-5 overflow-hidden">
          {rows.map((w) => (
            <RecentRow key={w.id} t={t} lang={lang} w={w} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs" style={{ color: 'var(--ink-5)' }}>
        <Link href="/api/v1/recent" className="link font-mono">
          /api/v1/recent
        </Link>
      </p>
    </div>
  )
}

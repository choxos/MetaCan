import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPermalink, filtersToQuery, SNAPSHOT, type CanonicalFilters } from '@/lib/permalink'
import { cohortCount } from '@/lib/query'
import { filtersFromParams } from '@/lib/api'
import { getDict, type Dictionary } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, localePath, numberLocale, type Lang } from '@/lib/lang'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { lang: string; hash: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return {
    title: getDict(lang).meta.qTitle(params.hash),
    alternates: langAlternates(lang, `/q/${params.hash}`),
  }
}

/**
 * A citable cohort query.
 *
 * The hash names the FILTERS, not a result list: the row in query_permalink
 * stores the canonical filter object, and this page re-runs the query on every
 * view. Against a pinned snapshot the counts cannot drift, so what the reader
 * sees is what the citing author saw, recomputed rather than trusted.
 */

/** Human labels for the stored filter keys, in the reader's language. */
function filterLabel(t: Dictionary, key: string): string {
  const map: Record<string, string> = {
    q: t.filters.searchAria,
    year_from: t.filters.yearFrom,
    year_to: t.filters.yearTo,
    lang: t.filters.language,
    type: t.filters.type,
    field: t.filters.field,
    topic: t.cohort.topic,
    venue: t.cohort.venue,
    route: t.filters.route,
    route_aff: `${t.cohort.routes}: ${t.cohort.routeAffLabel}`,
    route_fund: `${t.cohort.routes}: ${t.cohort.routeFundLabel}`,
    route_venue: `${t.cohort.routes}: ${t.cohort.routeVenueLabel}`,
    route_about: `${t.cohort.routes}: ${t.cohort.routeAboutLabel}`,
    retracted: t.cohort.retraction,
    no_abstract: t.filters.noAbstract,
    abstract: t.cohort.abstract,
    n_in: t.filters.consensus,
    category: t.cohort.category,
    design: t.cohort.design,
    agreement: t.cohort.agreement,
    labeled: t.cohort.labeled,
  }
  return map[key] ?? key
}

function filterValue(t: Dictionary, key: string, v: string | number | boolean): string {
  if (key === 'category') return t.cohort.categoryNames[String(v)] ?? String(v)
  if (key === 'design') return t.cohort.designNames[String(v)] ?? String(v)
  if (key === 'agreement') return v === 'all' ? t.cohort.agreementAll : t.cohort.agreementAny
  if (key.startsWith('route_')) return v === true || v === '1' || v === 1 ? t.cohort.routeRequire : t.cohort.routeExclude
  if (key === 'retracted') return v === true || v === '1' || v === 1 ? t.cohort.retractionOnly : t.cohort.retractionExclude
  if (key === 'labeled') return v === true || v === '1' || v === 1 ? t.cohort.labeledOnly : t.cohort.labeledNone
  if (key === 'abstract') return v === 'has' ? t.cohort.abstractHas : t.cohort.abstractNone
  return String(v)
}

export default async function QPage({ params }: { params: { lang: string; hash: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)
  const n = (x: number) => formatInt(lang, x)

  const stored = await getPermalink(params.hash)
  if (!stored) notFound()
  const filters: CanonicalFilters = stored

  const query = filtersToQuery(filters)
  const f = filtersFromParams(new URLSearchParams(query))
  const { total, labeled } = await cohortCount(f)

  const entries = Object.entries(filters) as Array<[string, string | number | boolean]>
  const today = new Date().toLocaleDateString(numberLocale(lang), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const citation = t.qpage.citation(n(total), params.hash, today, SNAPSHOT.release)

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--mc)' }}>
          {t.qpage.eyebrow}
        </p>
        <h1 className="font-serif text-3xl">{t.qpage.title(params.hash)}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.qpage.sub}
        </p>
      </div>

      <section className="card p-6">
        <h2 className="font-serif text-xl">{t.qpage.filtersTitle}</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-4)' }}>
            {t.qpage.noFilters}
          </p>
        ) : (
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b pb-1 last:border-0">
                <dt style={{ color: 'var(--ink-4)' }}>{filterLabel(t, k)}</dt>
                <dd className="text-right font-medium">
                  {filterValue(t, k, v)}{' '}
                  <code className="font-mono text-xs" style={{ color: 'var(--ink-5)' }}>
                    {k}={typeof v === 'boolean' ? (v ? '1' : '0') : String(v)}
                  </code>
                </dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-4 text-sm">
          <Link href={`${p('/')}${query ? `?${query}` : ''}`} className="link" style={{ color: 'var(--mc)' }}>
            {t.qpage.openBuilder}
          </Link>
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
            {t.qpage.totalLabel}
          </div>
          <div className="tabular mt-2 text-3xl font-semibold">{n(total)}</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--ink-5)' }}>
            {t.qpage.countsTitle}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
            {t.qpage.labeledLabel}
          </div>
          <div className="tabular mt-2 text-3xl font-semibold" style={{ color: 'var(--contested)' }}>
            {n(labeled)}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--ink-5)' }}>
            {t.qpage.labeledNote}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">{t.qpage.snapshotTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.qpage.snapshotLine(SNAPSHOT.release, SNAPSHOT.built)}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">{t.qpage.citeTitle}</h2>
        <blockquote
          className="mt-3 rounded-md border-l-2 p-4 text-sm leading-relaxed"
          style={{ borderColor: 'var(--mc)', background: 'var(--surface-2)' }}
        >
          {citation}
        </blockquote>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span style={{ color: 'var(--ink-4)' }}>{t.qpage.apiLabel}:</span>
          <a href={`/api/v1/cohort${query ? `?${query}` : ''}`} className="link font-mono text-xs">
            /api/v1/cohort{query ? `?${query}` : ''}
          </a>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          <span style={{ color: 'var(--ink-4)' }}>{t.qpage.exportLabel}:</span>
          <a href={`/api/v1/cohort/export?format=csv${query ? `&${query}` : ''}`} className="link" download>
            {t.cohort.exportCsv}
          </a>
          <a href={`/api/v1/cohort/export?format=json${query ? `&${query}` : ''}`} className="link" download>
            {t.cohort.exportJson}
          </a>
        </div>
      </section>
    </div>
  )
}

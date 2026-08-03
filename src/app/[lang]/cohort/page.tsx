import type { Metadata } from 'next'
import Link from 'next/link'
import { cohortSearch, cohortYearCounts, frameTotal, getRailCounts, EXPORT_CAP } from '@/lib/query'
import { canonicalFilters, filtersToQuery } from '@/lib/permalink'
import { filtersFromRecord } from '@/lib/api'
import { getFacets, getLabelStats, getSummary } from '@/lib/stats'
import { getScreenSummary } from '@/lib/screen'
import { WorkRow } from '@/components/WorkRow'
import { CohortFilters } from '@/components/CohortFilters'
import { CohortRail } from '@/components/CohortRail'
import { CohortActions } from '@/components/CohortActions'
import { getDict } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, localePath, type Lang } from '@/lib/lang'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).cohort.title, alternates: langAlternates(lang, '/cohort') }
}

/**
 * The cohort builder: the reason the site exists.
 *
 * MetaCan exists so that a meta-researcher can define a cohort of Canadian
 * works, count it exactly, export it, and cite it. Every filter state is a
 * URL; the URL is the query; the query is citable via /q/<hash>. The page,
 * /api/v1/cohort and the export all parse the SAME parameters with the SAME
 * function, so no surface can answer a different question from another.
 *
 * Layout per the design: header row with the frame-sized serif title and the
 * export / permalink / API buttons, the query panel, then a sticky facet rail
 * beside the results list. The label coverage sentences travel with every
 * result set, because the label table is sparse and absence of a label is
 * not a negative label.
 */
export default async function Cohort({
  params,
  searchParams,
}: {
  params: { lang: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)
  const n = (x: number) => formatInt(lang, x)

  const f = filtersFromRecord(searchParams)
  const [
    { rows, total, directLabeled, predicted, page, perPage },
    facets,
    frameN,
    labelStats,
    summary,
    screen,
    yearCounts,
    railCounts,
  ] = await Promise.all([
    cohortSearch(f),
    getFacets(),
    frameTotal(),
    getLabelStats(),
    getSummary(),
    getScreenSummary(),
    cohortYearCounts(f),
    getRailCounts(),
  ])
  const pages = Math.max(Math.ceil(total / perPage), 1)

  // The canonical query string: what the export, the API link and the
  // permalink all receive. Pagination and sort are presentation, not cohort
  // membership, so they are not part of it.
  const canonicalQuery = filtersToQuery(canonicalFilters(f))

  const qs = (over: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...searchParams, ...over })) {
      if (v !== undefined && v !== '' && typeof v !== 'object') sp.set(k, String(v))
    }
    return `?${sp.toString()}`
  }

  const categoryCounts = Object.fromEntries(labelStats.by_category.map((c) => [c.category, c.any_model]))

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-6 pt-5">
        <div>
          <div className="eyebrow">{t.cohort.eyebrow}</div>
          <h1
            className="font-serif mt-2"
            style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
          >
            <span className="tabular">{n(frameN)}</span> {t.cohort.titleTail}
          </h1>
          <p className="mt-2 max-w-[660px] text-[13px]" style={{ color: 'var(--ink-3)' }}>
            {t.cohort.subA}{' '}
            <span className="font-mono" style={{ color: 'var(--mc)' }}>
              /q/⟨hash⟩
            </span>
            {t.cohort.subB}
          </p>
        </div>
        <CohortActions query={canonicalQuery} total={total} exportCap={EXPORT_CAP} lang={lang} />
      </div>

      <div className="mt-5">
        <CohortFilters facets={facets} lang={lang} total={total} />
      </div>

      <div className="grid items-start gap-6 pt-6 lg:grid-cols-[260px_1fr]">
        <CohortRail
          lang={lang}
          yearCounts={yearCounts}
          railCounts={railCounts}
          categoryCounts={categoryCounts}
          evidenceCounts={{
            abstract: summary.coverage.has_abstract,
            unanimous: screen.n_in_3,
            retracted: summary.retracted_openalex,
            labeled: labelStats.coverage.labeled_works,
          }}
        />

        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[13px]" style={{ color: 'var(--ink)' }}>
              <strong className="tabular">{n(total)}</strong>{' '}
              {f.q ? t.cohort.matchTailQ(f.q) : t.cohort.matchAll} ·{' '}
              <span style={{ color: 'var(--ink-4)' }}>{t.cohort.ofTotal(n(frameN))}</span>
            </span>
            <span className="tabular text-xs" style={{ color: 'var(--ink-4)' }}>
              {t.common.pageOf(n(page), n(pages))}
            </span>
          </div>
          {/* The coverage sentences: mandatory on every cohort, because the label
              table is sparse and absence of a label is not a negative label. */}
          <p className="text-xs leading-snug" style={{ color: 'var(--ink-4)' }}>
            {t.cohort.coverage(n(directLabeled), n(total))}{' '}
            <span style={{ color: 'var(--ink-5)' }}>{t.cohort.coverageNote}</span>
          </p>
          <p className="mb-2.5 text-xs leading-snug" style={{ color: 'var(--ink-4)' }}>
            {t.cohort.predictionCoverage(n(predicted), n(total))}{' '}
            <span style={{ color: 'var(--ink-5)' }}>{t.cohort.predictionCoverageNote}</span>
          </p>

          {rows.length === 0 ? (
            <div className="card p-8 text-center" style={{ color: 'var(--ink-4)' }}>
              {t.works.empty}
            </div>
          ) : (
            <div className="card overflow-hidden">
              {rows.map((w) => (
                <WorkRow
                  key={w.id}
                  lang={lang}
                  w={{
                    ...w,
                    labels: w.labels.map((l) => ({
                      model: l.model,
                      categories: l.categories,
                      studyDesign: l.studyDesign,
                      confidence: l.confidence,
                    })),
                    prediction: w.prediction
                      ? {
                          modelVersion: w.prediction.modelVersion,
                          candidateCategories: w.prediction.candidateCategories,
                          consensusCategories: w.prediction.consensusCategories,
                          teacherDisagreementScore: w.prediction.teacherDisagreementScore,
                          thresholdUncertaintyScore: w.prediction.thresholdUncertaintyScore,
                          predictionStatus: w.prediction.predictionStatus,
                        }
                      : null,
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex justify-between pt-3.5 text-[13px] font-medium" style={{ color: 'var(--mc)' }}>
            {page > 1 ? (
              <Link href={qs({ page: page - 1 })} style={{ color: 'var(--mc)' }}>
                {t.common.previous}
              </Link>
            ) : (
              <span />
            )}
            {page < pages ? (
              <Link href={qs({ page: page + 1 })} style={{ color: 'var(--mc)' }}>
                {t.common.next}
              </Link>
            ) : (
              <span />
            )}
          </div>

          <p className="mt-6 border-t pt-4 text-xs leading-relaxed" style={{ color: 'var(--ink-5)' }}>
            {t.nav.howBuilt}:{' '}
            <Link href={p('/screen')} className="link">
              {t.nav.screen}
            </Link>
            {' · '}
            <Link href={p('/findings')} className="link">
              {t.nav.findings}
            </Link>
            {' · '}
            <Link href={p('/about')} className="link">
              {t.nav.about}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

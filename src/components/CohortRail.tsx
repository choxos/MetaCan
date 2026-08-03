'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { getDict } from '@/lib/i18n'
import { formatInt, localePath, type Lang } from '@/lib/lang'
import { LABEL_CATEGORIES } from '@/lib/labels'
import { ResultsByYear } from '@/components/ResultsByYear'

/**
 * The sticky left facet rail, per the design: the machine-label Categories
 * with their sparse-coverage warning, then Evidence facets, then the sentence
 * that keeps the whole panel honest: an unlabeled work is unknown, not a
 * negative.
 *
 * Category counts are DIRECT-LABEL counts (at least one model applied the
 * category), served from the same cached label stats the Landscape uses.
 * The category filter itself is single-select because that is the query
 * vocabulary (?category=...); the checkboxes toggle rather than accumulate.
 */
export function CohortRail({
  lang,
  categoryCounts,
  evidenceCounts,
  yearCounts,
  railCounts,
}: {
  lang: Lang
  categoryCounts: Record<string, number>
  evidenceCounts: { abstract: number; unanimous: number; retracted: number; labeled: number }
  yearCounts: Array<{ year: number; n: number }>
  railCounts: {
    lang: { en: number; fr: number }
    types: Array<{ type: string; n: number }>
    cited: { c10: number; c100: number }
  }
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const t = getDict(lang)
  const basePath = localePath(lang, '/cohort')

  const push = useCallback(
    (over: Record<string, string | undefined>) => {
      const p = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(over)) {
        if (v === undefined || v === '') p.delete(k)
        else p.set(k, v)
      }
      p.delete('page')
      const qs = p.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [router, sp, basePath],
  )

  const category = sp.get('category') ?? ''

  // PubMed's "publication date" quick picks, in this frame's vocabulary: each
  // is just a year_from value, so the numeric inputs, the histogram slider and
  // these radios all write the same two URL params.
  const thisYear = new Date().getFullYear()
  const DATE_PICKS = [
    { label: t.cohort.dateLast5, from: thisYear - 4 },
    { label: t.cohort.dateLast10, from: thisYear - 9 },
    { label: t.cohort.dateSince2000, from: 2000 },
  ]
  const yearFrom = sp.get('year_from') ?? ''
  const yearTo = sp.get('year_to') ?? ''

  const langNow = sp.get('lang') ?? ''
  const LANGS = [
    { code: 'en', label: t.cohort.langEn, count: railCounts.lang.en },
    { code: 'fr', label: t.cohort.langFr, count: railCounts.lang.fr },
  ]

  const typeNow = sp.get('type') ?? ''
  const citedNow = sp.get('cited_min') ?? ''
  const CITED = [
    { v: '10', label: t.cohort.cited10, count: railCounts.cited.c10 },
    { v: '100', label: t.cohort.cited100, count: railCounts.cited.c100 },
  ]

  const EVIDENCE = [
    {
      key: 'abstract',
      label: t.cohort.evAbs,
      count: evidenceCounts.abstract,
      on: sp.get('abstract') === 'has',
      toggle: () => push({ abstract: sp.get('abstract') === 'has' ? undefined : 'has' }),
    },
    {
      key: 'unanimous',
      label: t.cohort.evUnanimous,
      count: evidenceCounts.unanimous,
      on: sp.get('n_in') === '3',
      toggle: () => push({ n_in: sp.get('n_in') === '3' ? undefined : '3' }),
    },
    {
      key: 'retracted',
      label: t.cohort.evRetracted,
      count: evidenceCounts.retracted,
      on: sp.get('retracted') === '1',
      toggle: () => push({ retracted: sp.get('retracted') === '1' ? undefined : '1' }),
    },
    {
      key: 'labeled',
      label: t.cohort.evLabeled,
      count: evidenceCounts.labeled,
      on: sp.get('labeled') === '1',
      toggle: () => push({ labeled: sp.get('labeled') === '1' ? undefined : '1' }),
    },
  ]

  return (
    <div className="card sticky top-[76px] px-4 py-1">
      <ResultsByYear lang={lang} data={yearCounts} />

      <div className="border-b py-3">
        <div className="micro-label mb-2">{t.cohort.pubDate}</div>
        <div className="flex flex-col gap-0.5">
          {DATE_PICKS.map((d) => {
            const on = yearFrom === String(d.from) && !yearTo
            return (
              <button
                key={d.from}
                type="button"
                className="facet-row"
                aria-pressed={on}
                onClick={() => push({ year_from: on ? undefined : String(d.from), year_to: undefined })}
              >
                <span className="facet-box" data-on={on ? 'true' : 'false'}>
                  {on && (
                    <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
                      <path d="M1 3l2 2 4-4" stroke="var(--on-mc)" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 truncate" style={{ color: on ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {d.label}
                </span>
                <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  {d.from}–
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-b py-3">
        <div className="micro-label mb-1">{t.cohort.categories}</div>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--contested)' }}>
          {t.cohort.sparseCov}
        </div>
        <div className="flex flex-col gap-0.5">
          {LABEL_CATEGORIES.map((c) => {
            const on = category === c
            return (
              <button
                key={c}
                type="button"
                className="facet-row"
                aria-pressed={on}
                onClick={() => push({ category: on ? undefined : c })}
              >
                <span className="facet-box" data-on={on ? 'true' : 'false'}>
                  {on && (
                    <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
                      <path d="M1 3l2 2 4-4" stroke="var(--on-mc)" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 truncate" style={{ color: on ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {t.cohort.categoryNames[c] ?? c}
                </span>
                <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  {formatInt(lang, categoryCounts[c] ?? 0)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-b py-3">
        <div className="micro-label mb-2">{t.cohort.evidence}</div>
        <div className="flex flex-col gap-0.5">
          {EVIDENCE.map((e) => (
            <button key={e.key} type="button" className="facet-row" aria-pressed={e.on} onClick={e.toggle}>
              <span className="facet-box" data-on={e.on ? 'true' : 'false'}>
                {e.on && (
                  <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
                    <path d="M1 3l2 2 4-4" stroke="var(--on-mc)" strokeWidth="1.5" fill="none" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 truncate" style={{ color: e.on ? 'var(--ink)' : 'var(--ink-2)' }}>
                {e.label}
              </span>
              <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                {formatInt(lang, e.count)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b py-3">
        <div className="micro-label mb-2">{t.filters.language}</div>
        <div className="flex flex-col gap-0.5">
          {LANGS.map((l) => {
            const on = langNow === l.code
            return (
              <button
                key={l.code}
                type="button"
                className="facet-row"
                aria-pressed={on}
                onClick={() => push({ lang: on ? undefined : l.code })}
              >
                <span className="facet-box" data-on={on ? 'true' : 'false'}>
                  {on && (
                    <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
                      <path d="M1 3l2 2 4-4" stroke="var(--on-mc)" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 truncate" style={{ color: on ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {l.label}
                </span>
                <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  {formatInt(lang, l.count)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-b py-3">
        <div className="micro-label mb-2">{t.filters.type}</div>
        <div className="flex flex-col gap-0.5">
          {railCounts.types.map((x) => {
            const on = typeNow === x.type
            return (
              <button
                key={x.type}
                type="button"
                className="facet-row"
                aria-pressed={on}
                onClick={() => push({ type: on ? undefined : x.type })}
              >
                <span className="facet-box" data-on={on ? 'true' : 'false'}>
                  {on && (
                    <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
                      <path d="M1 3l2 2 4-4" stroke="var(--on-mc)" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 truncate" style={{ color: on ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {x.type}
                </span>
                <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  {formatInt(lang, x.n)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-b py-3">
        <div className="micro-label mb-2">{t.cohort.citations}</div>
        <div className="flex flex-col gap-0.5">
          {CITED.map((c) => {
            const on = citedNow === c.v
            return (
              <button
                key={c.v}
                type="button"
                className="facet-row"
                aria-pressed={on}
                onClick={() => push({ cited_min: on ? undefined : c.v })}
              >
                <span className="facet-box" data-on={on ? 'true' : 'false'}>
                  {on && (
                    <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true">
                      <path d="M1 3l2 2 4-4" stroke="var(--on-mc)" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 truncate" style={{ color: on ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {c.label}
                </span>
                <span className="ml-auto font-mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  {formatInt(lang, c.count)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="callout-plain my-3">{t.cohort.unlabeledNote}</div>
    </div>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { getDict } from '@/lib/i18n'
import { formatInt, localePath, type Lang } from '@/lib/lang'
import { STUDY_DESIGNS } from '@/lib/labels'
import type { Facets } from '@/components/Filters'
import { Typeahead } from '@/components/Typeahead'

/**
 * The cohort builder's query panel, per the design: search / year range /
 * sort on the first row, the bibliographic facets below, the four Canadian
 * routes as tri-state segmented controls, and a results strip with the live
 * total, the active-filter count, Clear all, and the Search button.
 *
 * All state lives in the URL: the address bar IS the query, which is what
 * makes a cohort shareable, exportable and citable without any session state.
 * The filter VALUES (?category=metaresearch, ?route_fund=1) are the API's
 * vocabulary and identical in both languages; only the labels switch.
 *
 * Two facet families deserve their comments:
 *
 *   - The four Canadian routes are TRI-STATE (any / required / excluded) and
 *     compose, because "funded by Canada but no Canadian affiliation" is a
 *     stratum this frame exists to make visible.
 *
 *   - The label facets (label source, study design, agreement, labeled)
 *     filter over SPARSE machine labels. The panel says so where the reader
 *     picks them, and the results header reports coverage on every query,
 *     because nothing here may imply that an unlabeled work is a negative.
 *     The category facet lives in the left rail (CohortRail).
 */
export function CohortFilters({
  facets,
  lang,
  total,
}: {
  facets: Facets
  lang: Lang
  total: number
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const t = getDict(lang)

  const [q, setQ] = useState(sp.get('q') ?? '')
  useEffect(() => setQ(sp.get('q') ?? ''), [sp])
  const [author, setAuthor] = useState(sp.get('author') ?? '')
  useEffect(() => setAuthor(sp.get('author') ?? ''), [sp])

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

  const val = (k: string) => sp.get(k) ?? ''
  const labelSource = val('label_source') || 'direct'
  const active = Array.from(new Set(sp.keys())).filter((k) => k !== 'page' && k !== 'sort' && sp.get(k)).length

  const SORTS = [
    { v: 'cited', label: t.filters.sortCited },
    { v: 'year_desc', label: t.filters.sortNewest },
    { v: 'year_asc', label: t.filters.sortOldest },
  ] as const

  const TRI = [
    { v: '', label: t.cohort.triAny, aria: t.cohort.routeAny },
    { v: '1', label: t.cohort.triReq, aria: t.cohort.routeRequire },
    { v: '0', label: t.cohort.triExcl, aria: t.cohort.routeExclude },
  ] as const

  const ROUTES = [
    { k: 'route_aff', code: 'aff', name: t.cohort.rsAff },
    { k: 'route_fund', code: 'fund', name: t.cohort.rsFund },
    { k: 'route_venue', code: 'venue', name: t.cohort.rsVenue },
    { k: 'route_about', code: 'about', name: t.cohort.rsAbout },
  ] as const

  const submitSearch = () => push({ q: q.trim() || undefined, author: author.trim() || undefined })

  return (
    <form
      className="card overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        submitSearch()
      }}
    >
      {/* Row 1: search term, author, year range, sort */}
      <div className="grid gap-3.5 px-5 pt-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1.1fr_1fr_0.8fr]">
        <div>
          <span className="field-label">{t.cohort.searchTerm}</span>
          <div className="control flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 15 15" aria-hidden="true" className="shrink-0">
              <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="var(--ink-4)" strokeWidth="1.5" />
              <line x1="10" y1="10" x2="13.5" y2="13.5" stroke="var(--ink-4)" strokeWidth="1.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.filters.searchPlaceholder}
              aria-label={t.filters.searchAria}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--ink)' }}
            />
          </div>
        </div>
        <div>
          <span className="field-label">{t.cohort.authorTerm}</span>
          <div className="control flex items-center gap-2">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t.cohort.authorPlaceholder}
              aria-label={t.cohort.authorTerm}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--ink)' }}
            />
          </div>
        </div>
        <div>
          <span className="field-label">{t.filters.yearRange}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={t.filters.from}
              defaultValue={val('year_from')}
              onBlur={(e) => push({ year_from: e.target.value || undefined })}
              aria-label={t.filters.yearFrom}
              className="control control-mono tabular"
            />
            <span style={{ color: 'var(--ink-5)' }}>→</span>
            <input
              type="number"
              placeholder={t.filters.to}
              defaultValue={val('year_to')}
              onBlur={(e) => push({ year_to: e.target.value || undefined })}
              aria-label={t.filters.yearTo}
              className="control control-mono tabular"
            />
          </div>
        </div>
        <Select label={t.filters.sort} value={val('sort') || 'cited'} onChange={(v) => push({ sort: v })}>
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Row 2: bibliographic facets */}
      <div className="grid gap-3.5 px-5 pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Select label={t.filters.language} value={val('lang')} onChange={(v) => push({ lang: v })}>
          <option value="">{t.filters.anyLanguage}</option>
          {facets.langs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>

        <Select label={t.filters.type} value={val('type')} onChange={(v) => push({ type: v })}>
          <option value="">{t.filters.anyType}</option>
          {facets.types.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>

        <Select label={t.filters.field} value={val('field')} onChange={(v) => push({ field: v })}>
          <option value="">{t.filters.anyField}</option>
          {facets.fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>

        <Typeahead
          label={t.cohort.venue}
          endpoint="/api/v1/facets/venue"
          value={val('venue')}
          onPick={(v) => push({ venue: v })}
          lang={lang}
        />

        <Typeahead
          label={t.cohort.topic}
          endpoint="/api/v1/facets/topic"
          value={val('topic')}
          onPick={(v) => push({ topic: v })}
          lang={lang}
        />

        <Select label={t.cohort.retraction} value={val('retracted')} onChange={(v) => push({ retracted: v })}>
          <option value="">{t.cohort.retractionAny}</option>
          <option value="1">{t.cohort.retractionOnly}</option>
          <option value="0">{t.cohort.retractionExclude}</option>
        </Select>

        <Select label={t.cohort.abstract} value={val('abstract')} onChange={(v) => push({ abstract: v })}>
          <option value="">{t.cohort.abstractAny}</option>
          <option value="has">{t.cohort.abstractHas}</option>
          <option value="none">{t.cohort.abstractNone}</option>
        </Select>

        <Select
          label={t.cohort.labelSource}
          value={labelSource}
          onChange={(v) =>
            push({
              label_source: v === 'predicted' ? 'predicted' : undefined,
              agreement: undefined,
              labeled: undefined,
              prediction_mode: v === 'predicted' ? 'candidate' : undefined,
            })
          }
        >
          <option value="direct">{t.cohort.directLabels}</option>
          <option value="predicted">{t.cohort.predictedLabels}</option>
        </Select>

        <Select label={t.cohort.design} value={val('design')} onChange={(v) => push({ design: v })}>
          <option value="">{t.cohort.anyDesign}</option>
          {STUDY_DESIGNS.map((d) => (
            <option key={d} value={d}>
              {t.cohort.designNames[d] ?? d}
            </option>
          ))}
        </Select>

        {labelSource === 'predicted' ? (
          <Select
            label={t.cohort.predictionMode}
            value={val('prediction_mode') || 'candidate'}
            onChange={(v) => push({ prediction_mode: v })}
          >
            <option value="candidate">{t.cohort.predictionCandidate}</option>
            <option value="consensus">{t.cohort.predictionConsensus}</option>
          </Select>
        ) : (
          <>
            <Select label={t.cohort.agreement} value={val('agreement')} onChange={(v) => push({ agreement: v })}>
              <option value="">{t.cohort.agreementAny}</option>
              <option value="all">{t.cohort.agreementAll}</option>
            </Select>
            <Select label={t.cohort.labeled} value={val('labeled')} onChange={(v) => push({ labeled: v })}>
              <option value="">{t.cohort.labeledAny}</option>
              <option value="1">{t.cohort.labeledOnly}</option>
              <option value="0">{t.cohort.labeledNone}</option>
            </Select>
          </>
        )}
      </div>
      <p className="px-5 pt-2 text-xs leading-snug" style={{ color: 'var(--ink-5)' }}>
        {t.cohort.labelFacetsHint}
      </p>

      {/* Row 3: the four Canadian routes, tri-state, composable */}
      <div className="grid gap-3.5 px-5 pb-[18px] pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {ROUTES.map((r) => {
          const current = val(r.k)
          return (
            <div key={r.k} className="flex min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-2">
              <span className="min-w-0 truncate">
                <span className="font-mono text-[11px] font-medium" style={{ color: 'var(--mc)' }}>
                  {r.code}
                </span>
                <span className="ml-1.5 text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  {r.name}
                </span>
              </span>
              <span className="seg" role="group" aria-label={`${t.cohort.routes}: ${r.name}`}>
                {TRI.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    aria-pressed={current === o.v}
                    aria-label={o.aria}
                    onClick={() => push({ [r.k]: o.v || undefined })}
                  >
                    {o.label}
                  </button>
                ))}
              </span>
            </div>
          )
        })}
      </div>
      <p className="-mt-2 px-5 pb-3 text-xs leading-snug" style={{ color: 'var(--ink-5)' }}>
        {t.cohort.routesHint}
      </p>

      {/* Results strip */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3"
        style={{ background: 'var(--surface-2)' }}
        aria-live="polite"
      >
        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>
          <strong className="tabular" style={{ color: 'var(--ink)' }}>
            {formatInt(lang, total)}
          </strong>{' '}
          {t.cohort.resultsWord} · {t.filters.active(active)}
          {active > 0 && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => router.push(basePath)}
                className="font-medium"
                style={{ color: 'var(--mc)', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
              >
                {t.filters.clearAll}
              </button>
            </>
          )}
        </span>
        <button type="submit" className="btn btn-primary px-5">
          {t.filters.searchButton}
        </button>
      </div>
    </form>
  )
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="control">
        {children}
      </select>
    </div>
  )
}

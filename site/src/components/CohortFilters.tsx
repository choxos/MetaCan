'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { getDict } from '@/lib/i18n'
import { localePath, type Lang } from '@/lib/lang'
import { LABEL_CATEGORIES, STUDY_DESIGNS } from '@/lib/labels'
import type { Facets } from '@/components/Filters'
import { Typeahead } from '@/components/Typeahead'

/**
 * The cohort builder's facet panel.
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
 *   - The label facets (category, study design) filter over a SPARSE table of
 *     machine labels. The panel says so where the reader picks them, and the
 *     results header reports coverage on every query, because nothing here may
 *     imply that an unlabelled work is a negative.
 */
export function CohortFilters({ facets, lang }: { facets: Facets; lang: Lang }) {
  const router = useRouter()
  const sp = useSearchParams()
  const t = getDict(lang)

  const [q, setQ] = useState(sp.get('q') ?? '')
  useEffect(() => setQ(sp.get('q') ?? ''), [sp])

  const homePath = localePath(lang, '/')

  const push = useCallback(
    (over: Record<string, string | undefined>) => {
      const p = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(over)) {
        if (v === undefined || v === '') p.delete(k)
        else p.set(k, v)
      }
      p.delete('page')
      const qs = p.toString()
      router.push(qs ? `${homePath}?${qs}` : homePath)
    },
    [router, sp, homePath],
  )

  const val = (k: string) => sp.get(k) ?? ''
  const active = Array.from(sp.keys()).filter((k) => k !== 'page' && k !== 'sort' && sp.get(k)).length

  const SORTS = [
    { v: 'cited', label: t.filters.sortCited },
    { v: 'year_desc', label: t.filters.sortNewest },
    { v: 'year_asc', label: t.filters.sortOldest },
  ] as const

  const TRI = [
    { v: '', label: t.cohort.routeAny },
    { v: '1', label: t.cohort.routeRequire },
    { v: '0', label: t.cohort.routeExclude },
  ] as const

  const ROUTES = [
    { k: 'route_aff', label: t.cohort.routeAffLabel },
    { k: 'route_fund', label: t.cohort.routeFundLabel },
    { k: 'route_venue', label: t.cohort.routeVenueLabel },
    { k: 'route_about', label: t.cohort.routeAboutLabel },
  ] as const

  return (
    <div className="card p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          push({ q: q.trim() || undefined })
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.filters.searchPlaceholder}
          aria-label={t.filters.searchAria}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
        />
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--mc)' }}
        >
          {t.filters.searchButton}
        </button>
      </form>

      {/* Bibliographic facets */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>{t.filters.yearRange}</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={t.filters.from}
              defaultValue={val('year_from')}
              onBlur={(e) => push({ year_from: e.target.value || undefined })}
              aria-label={t.filters.yearFrom}
              className="tabular w-full rounded-md border px-2 py-1.5 text-sm"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            />
            <span style={{ color: 'var(--ink-5)' }}>→</span>
            <input
              type="number"
              placeholder={t.filters.to}
              defaultValue={val('year_to')}
              onBlur={(e) => push({ year_to: e.target.value || undefined })}
              aria-label={t.filters.yearTo}
              className="tabular w-full rounded-md border px-2 py-1.5 text-sm"
              style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
            />
          </div>
        </div>

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
          label={t.cohort.topic}
          endpoint="/api/v1/facets/topic"
          value={val('topic')}
          onPick={(v) => push({ topic: v })}
          lang={lang}
        />

        <Typeahead
          label={t.cohort.venue}
          endpoint="/api/v1/facets/venue"
          value={val('venue')}
          onPick={(v) => push({ venue: v })}
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
      </div>

      {/* The four Canadian routes: tri-state, composable */}
      <div className="mt-4 border-t pt-3">
        <Label>{t.cohort.routes}</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROUTES.map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-2">
              <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
                {r.label}
              </span>
              <select
                value={val(r.k)}
                onChange={(e) => push({ [r.k]: e.target.value })}
                aria-label={`${t.cohort.routes}: ${r.label}`}
                className="rounded-md border px-2 py-1 text-sm"
                style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
              >
                {TRI.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--ink-5)' }}>
          {t.cohort.routesHint}
        </p>
      </div>

      {/* Machine-label facets: sparse, and labelled as such where they are picked */}
      <div className="mt-4 border-t pt-3">
        <Label>{t.cohort.labelFacetsTitle}</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label={t.cohort.category} value={val('category')} onChange={(v) => push({ category: v })}>
            <option value="">{t.cohort.anyCategory}</option>
            {LABEL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.cohort.categoryNames[c] ?? c}
              </option>
            ))}
          </Select>

          <Select label={t.cohort.design} value={val('design')} onChange={(v) => push({ design: v })}>
            <option value="">{t.cohort.anyDesign}</option>
            {STUDY_DESIGNS.map((d) => (
              <option key={d} value={d}>
                {t.cohort.designNames[d] ?? d}
              </option>
            ))}
          </Select>

          <Select label={t.cohort.agreement} value={val('agreement')} onChange={(v) => push({ agreement: v })}>
            <option value="">{t.cohort.agreementAny}</option>
            <option value="all">{t.cohort.agreementAll}</option>
          </Select>

          <Select label={t.cohort.labeled} value={val('labeled')} onChange={(v) => push({ labeled: v })}>
            <option value="">{t.cohort.labeledAny}</option>
            <option value="1">{t.cohort.labeledOnly}</option>
            <option value="0">{t.cohort.labeledNone}</option>
          </Select>
        </div>
        <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--ink-5)' }}>
          {t.cohort.labelFacetsHint}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--ink-4)' }}>
          {active > 0 && (
            <>
              <span>{t.filters.active(active)}</span>
              <button onClick={() => router.push(homePath)} className="link" style={{ color: 'var(--mc)' }}>
                {t.filters.clearAll}
              </button>
            </>
          )}
        </div>
        <div className="w-40">
          <select
            value={val('sort') || 'cited'}
            onChange={(e) => push({ sort: e.target.value })}
            aria-label={t.filters.sort}
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
          >
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
      {children}
    </div>
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
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full rounded-md border px-2 py-1.5 text-sm"
        style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
      >
        {children}
      </select>
    </div>
  )
}

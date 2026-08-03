import type { Metadata } from 'next'
import {
  getSummary,
  getByYear,
  getByRoute,
  getByField,
  getByLanguage,
  getAbstractGapByType,
  getTopVenues,
  getTopFunders,
  getRetractionStates,
  getLabelStats,
} from '@/lib/stats'
import {
  Frame,
  ByYearChart,
  ByRouteChart,
  RouteOverlapChart,
  ByFieldChart,
  ByLangChart,
  AbstractGapChart,
  VenueChart,
  FunderChart,
  RetractionChart,
} from '@/components/Charts'
import { getDict, type Dictionary } from '@/lib/i18n'
import { formatInt, formatPct, isLang, langAlternates, localePath, numberLocale, type Lang } from '@/lib/lang'
import { ScoreBanner } from '@/components/ScoreBanner'
// The provisional baseline scores, summarized. This file is the scoring run's own
// output (pilot/results/frame_scores.json), synced by `make findings` exactly as
// findings.json is: the numbers on this page are read, never typed.
import frameScores from '@/data/frame_scores.json'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).meta.landscape, alternates: langAlternates(lang, '/landscape') }
}

/**
 * The Landscape: first what the machine-labeled subset looks like (category,
 * study design, year, language), then the frame described by itself (the
 * former Analytics page, in full).
 *
 * The label section leads with its coverage banner, and every count in it is
 * over the labeled subset ONLY. The two readings per bucket (any model / all
 * models agree) keep the models' disagreement visible, because hiding it
 * behind one number is exactly what this project refuses to do.
 */
export default async function Landscape({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)

  const [labelStats, summary, byYear, byRoute, byField, byLang, gap, venues, funders, retractions] =
    await Promise.all([
      getLabelStats(),
      getSummary(),
      getByYear(),
      getByRoute(),
      getByField(),
      getByLanguage(),
      getAbstractGapByType(),
      getTopVenues(),
      getTopFunders(),
      getRetractionStates(),
    ])

  const n = (x: number) => formatInt(lang, x)
  const dec = (x: number) =>
    x.toLocaleString(numberLocale(lang), { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  const pctNoAff = formatPct(lang, (summary.no_aff / summary.works) * 100)
  const pctNoAbs = formatPct(lang, (summary.no_abstract / summary.works) * 100)
  const pctLabeled = formatPct(
    lang,
    (labelStats.coverage.labeled_works / labelStats.coverage.frame_works) * 100,
    3,
  )

  const sumMarginals = byRoute.marginals.reduce((a, r) => a + r.works, 0)
  const overcount = sumMarginals - byRoute.total

  const missedTotal = retractions.reduce((a, r) => a + r.openalex_missed, 0)
  const noticesTotal = retractions.reduce((a, r) => a + r.works, 0)

  const maxCat = Math.max(1, ...labelStats.by_category.map((c) => c.any_model))
  const maxDes = Math.max(1, ...labelStats.by_design.map((d) => d.any_model))
  const maxYear = Math.max(1, ...labelStats.by_year.map((y) => y.labeled))

  // The design's frame-wide panels: per-year bars, category counts, top
  // fields, language mix. All live values; the recharts sections below keep
  // the richer views.
  const frameYears = byYear
  const maxFrameYear = Math.max(1, ...frameYears.map((y) => y.works))
  const firstYear = frameYears[0]
  const lastYear = frameYears[frameYears.length - 1]
  const peakYear = frameYears.reduce((a, b) => (b.works > a.works ? b : a), frameYears[0]!)
  const growth = firstYear && firstYear.works > 0 ? (peakYear.works / firstYear.works).toFixed(1) : null
  // Axis ticks at the true first, middle and last positions; justify-between
  // spaces them evenly, so the labels must be the years actually there.
  const midYear = frameYears[Math.floor((frameYears.length - 1) / 2)]
  const yearTicks = firstYear && lastYear && midYear ? [firstYear.year, midYear.year, lastYear.year] : []

  const maxLabelCat = Math.max(1, ...labelStats.by_category.map((c) => c.any_model))
  const topFields = byField.slice(0, 5)
  const maxField = Math.max(1, ...topFields.map((f) => f.works))
  const enWorks = byLang.find((l) => l.lang === 'en')?.works ?? 0
  const frWorks = byLang.find((l) => l.lang === 'fr')?.works ?? 0
  const otherWorks = Math.max(summary.works - enWorks - frWorks, 0)
  const langSegs = [
    { key: 'en', label: t.landscape.langEn, v: enWorks, color: 'var(--teal)' },
    { key: 'fr', label: t.landscape.langFr, v: frWorks, color: 'var(--mc)' },
    { key: 'other', label: t.landscape.langOther, v: otherWorks, color: 'var(--ink-5)' },
  ]

  return (
    <div className="space-y-8">
      <div className="max-w-[820px] pt-4">
        <div className="eyebrow">{t.landscape.eyebrow}</div>
        <h1
          className="font-serif mt-2.5"
          style={{ fontSize: 'clamp(28px, 3.4vw, 36px)', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
        >
          {t.landscape.designTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.landscape.designBody}
        </p>
      </div>

      {/* Works per publication year: one bar per year, whole frame. */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <h3>{t.landscape.yearTitle}</h3>
          <span className="mono-meta">
            {firstYear && lastYear ? t.landscape.yearMeta(String(firstYear.year), String(lastYear.year)) : ''}
          </span>
        </div>
        <div className="px-5 pb-2 pt-5">
          <div className="flex items-end gap-[3px]" style={{ height: 180 }}>
            {frameYears.map((y) => (
              <div
                key={y.year}
                title={`${y.year} · ${n(y.works)}`}
                className="flex-1"
                style={{
                  height: `${Math.max(Math.round((y.works / maxFrameYear) * 100), 2)}%`,
                  background: 'var(--mc)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px]" style={{ color: 'var(--ink-4)' }}>
            {yearTicks.map((y) => (
              <span key={y}>{y}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t lg:grid-cols-4">
          {firstYear && (
            <YearStat label={t.landscape.baselineL(String(firstYear.year))} value={n(firstYear.works)} />
          )}
          <YearStat label={t.landscape.peakL(String(peakYear.year))} value={n(peakYear.works)} />
          {firstYear && growth && (
            <YearStat label={t.landscape.growthL(String(firstYear.year))} value={`×${lang === 'fr' ? growth.replace('.', ',') : growth}`} />
          )}
          {lastYear && <YearStat label={t.landscape.latestL(String(lastYear.year))} value={n(lastYear.works)} />}
        </div>
      </section>

      {/* Category counts (sparse, and it says so), top fields, language mix. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="card-head">
            <h3>{t.landscape.catsTitle}</h3>
            <span className="mono-meta">{t.landscape.catsMeta(n(labelStats.coverage.labeled_works))}</span>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4">
            {labelStats.by_category.map((c) => (
              <div key={c.category}>
                <div className="mb-[5px] flex justify-between text-xs">
                  <span style={{ color: 'var(--ink-2)' }}>{t.cohort.categoryNames[c.category] ?? c.category}</span>
                  <span className="font-mono tabular" style={{ color: 'var(--ink-3)' }}>
                    {n(c.any_model)}
                  </span>
                </div>
                <div className="meter">
                  <div style={{ width: `${Math.max((c.any_model / maxLabelCat) * 100, 2)}%`, background: 'var(--teal)' }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mx-5 mb-4 text-[11px] leading-normal" style={{ color: 'var(--contested)' }}>
            {t.cohort.sparseCov} · {t.cohort.unlabeledNote}
          </p>
        </section>

        <div className="flex flex-col gap-6">
          <section className="card overflow-hidden">
            <div className="card-head">
              <h3>{t.landscape.fieldsTitle}</h3>
              <span className="mono-meta">{t.landscape.fieldsMeta}</span>
            </div>
            <div className="flex flex-col gap-3 px-5 py-4">
              {topFields.map((f) => (
                <div key={f.field}>
                  <div className="mb-[5px] flex justify-between text-xs">
                    <span style={{ color: 'var(--ink-2)' }}>{f.field}</span>
                    <span className="font-mono tabular" style={{ color: 'var(--ink-3)' }}>
                      {n(f.works)}
                    </span>
                  </div>
                  <div className="meter">
                    <div style={{ width: `${Math.max((f.works / maxField) * 100, 2)}%`, background: 'var(--mc)' }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="card-head">
              <h3>{t.landscape.langTitle}</h3>
              <span className="mono-meta">{t.landscape.langMeta}</span>
            </div>
            <div className="px-5 py-4">
              <div className="flex gap-0.5 overflow-hidden rounded-full" style={{ height: 14 }}>
                {langSegs.map((ls) => (
                  <div
                    key={ls.key}
                    style={{ width: `${(ls.v / Math.max(summary.works, 1)) * 100}%`, background: ls.color }}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                {langSegs.map((ls) => (
                  <span key={ls.key} className="inline-flex items-center gap-[7px] text-xs" style={{ color: 'var(--ink-3)' }}>
                    <span
                      style={{ width: 8, height: 8, borderRadius: 999, background: ls.color, display: 'inline-block' }}
                    />
                    {ls.label}{' '}
                    <span className="font-mono tabular" style={{ color: 'var(--ink-4)' }}>
                      {n(ls.v)} · {formatPct(lang, (ls.v / Math.max(summary.works, 1)) * 100)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="border-t pt-8">
        <h2 className="font-serif text-2xl">{t.landscape.title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          {t.landscape.sub}
        </p>
      </div>

      {/* THE COVERAGE BANNER. It precedes every labeled count on purpose. */}
      <div
        role="note"
        className="rounded-md border-l-2 p-4 text-sm leading-relaxed"
        style={{ borderColor: 'var(--contested)', background: 'var(--surface-2)', color: 'var(--ink-2)' }}
      >
        <strong>{t.landscape.bannerTitle}.</strong>{' '}
        {t.landscape.banner(n(labelStats.coverage.labeled_works), n(labelStats.coverage.frame_works), pctLabeled)}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          label={t.landscape.tileLabeled}
          value={n(labelStats.coverage.labeled_works)}
          note={t.landscape.tileLabeledNote}
        />
        <Tile label={t.landscape.tileRows} value={n(labelStats.coverage.label_rows)} note={t.landscape.tileRowsNote} />
        <Tile
          label={t.landscape.tileModels}
          value={labelStats.coverage.models.join(' · ')}
          note={t.landscape.tileModelsNote}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-serif text-lg">{t.landscape.byCategoryTitle}</h2>
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--ink-4)' }}>
            {t.landscape.byCategoryNote}
          </p>
          <BarTable
            t={t}
            head={t.landscape.thCategory}
            rows={labelStats.by_category.map((c) => ({
              key: c.category,
              label: t.cohort.categoryNames[c.category] ?? c.category,
              any: c.any_model,
              all: c.all_models,
            }))}
            max={maxCat}
            lang={lang}
          />
        </section>

        <section className="card p-5">
          <h2 className="font-serif text-lg">{t.landscape.byDesignTitle}</h2>
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--ink-4)' }}>
            {t.landscape.byDesignNote}
          </p>
          <BarTable
            t={t}
            head={t.landscape.thDesign}
            rows={labelStats.by_design.map((d) => ({
              key: d.design,
              label: t.cohort.designNames[d.design] ?? d.design,
              any: d.any_model,
              all: d.all_models,
            }))}
            max={maxDes}
            lang={lang}
          />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-serif text-lg">{t.landscape.byYearTitle}</h2>
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--ink-4)' }}>
            {t.landscape.byYearNote}
          </p>
          <div className="scroll-x mt-3">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b" style={{ color: 'var(--ink-4)' }}>
                  <th className="p-1.5 text-left text-xs font-medium uppercase tracking-wider">
                    {t.landscape.thYear}
                  </th>
                  <th className="p-1.5 text-right text-xs font-medium uppercase tracking-wider">
                    {t.landscape.thLabeled}
                  </th>
                  <th className="w-1/2 p-1.5" />
                </tr>
              </thead>
              <tbody>
                {labelStats.by_year.map((y) => (
                  <tr key={y.year} className="border-b last:border-0">
                    <td className="tabular p-1.5">{y.year}</td>
                    <td className="tabular p-1.5 text-right">{n(y.labeled)}</td>
                    <td className="p-1.5">
                      <div
                        className="h-2.5 rounded-sm"
                        style={{ width: `${(y.labeled / maxYear) * 100}%`, background: 'var(--mc)', opacity: 0.7 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-serif text-lg">{t.landscape.byLangTitle}</h2>
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--ink-4)' }}>
            {t.landscape.byLangNote}
          </p>
          <div className="scroll-x mt-3">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b" style={{ color: 'var(--ink-4)' }}>
                  <th className="p-1.5 text-left text-xs font-medium uppercase tracking-wider">
                    {t.landscape.thLang}
                  </th>
                  <th className="p-1.5 text-right text-xs font-medium uppercase tracking-wider">
                    {t.landscape.thLabeled}
                  </th>
                </tr>
              </thead>
              <tbody>
                {labelStats.by_lang.map((l) => (
                  <tr key={l.lang} className="border-b last:border-0">
                    <td className="p-1.5" style={l.lang === 'fr' ? { color: 'var(--mc)', fontWeight: 600 } : undefined}>
                      {l.lang}
                    </td>
                    <td className="tabular p-1.5 text-right">{n(l.labeled)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* The frame itself: the former Analytics page, in full.               */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t pt-8">
        <h2 className="font-serif text-2xl">{t.landscape.frameTitle}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          {t.landscape.frameSub(n(summary.works))}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={t.analytics.tileWorks} value={n(summary.works)} />
        <Tile
          label={t.analytics.tileNoAff}
          value={n(summary.no_aff)}
          note={t.analytics.ofFrame(pctNoAff)}
          color="var(--mc-accent)"
        />
        <Tile
          label={t.analytics.tileNoAbs}
          value={n(summary.no_abstract)}
          note={t.analytics.ofFrame(pctNoAbs)}
          color="var(--contested)"
        />
        <Tile
          label={t.analytics.tileNotices}
          value={n(summary.retraction_notices)}
          note={t.analytics.joinedFromRW}
          color="var(--retraction)"
        />
      </section>

      <Frame title={t.analytics.byYearTitle} note={t.analytics.byYearNote(pctNoAff, n(summary.no_aff))}>
        <ByYearChart data={byYear} lang={lang} />
      </Frame>

      <div className="grid gap-6 lg:grid-cols-2">
        <Frame
          title={t.analytics.byRouteTitle}
          note={t.analytics.byRouteNote(n(sumMarginals), n(overcount), n(byRoute.total))}
        >
          <ByRouteChart data={byRoute} lang={lang} />
        </Frame>

        <Frame title={t.analytics.overlapTitle} note={t.analytics.overlapNote}>
          <RouteOverlapChart data={byRoute} lang={lang} />
        </Frame>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Frame title={t.analytics.byFieldTitle} note={t.analytics.byFieldNote}>
          <ByFieldChart data={byField} lang={lang} />
        </Frame>

        <Frame title={t.analytics.byLangTitle} note={t.analytics.byLangNote}>
          <ByLangChart data={byLang} lang={lang} />
        </Frame>
      </div>

      <Frame title={t.analytics.gapTitle} note={t.analytics.gapNote(pctNoAbs)}>
        <AbstractGapChart data={gap} lang={lang} />
      </Frame>

      <Frame title={t.analytics.retractionTitle} note={t.analytics.retractionNote(n(noticesTotal), n(missedTotal))}>
        <RetractionChart data={retractions} lang={lang} />
      </Frame>

      <div className="scroll-x">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b" style={{ color: 'var(--ink-4)' }}>
              <th className="p-2 text-left text-xs font-medium uppercase tracking-wider">{t.analytics.thState}</th>
              <th className="p-2 text-right text-xs font-medium uppercase tracking-wider">{t.analytics.thWorks}</th>
              <th className="p-2 text-right text-xs font-medium uppercase tracking-wider">{t.analytics.thFlagged}</th>
              <th className="p-2 text-right text-xs font-medium uppercase tracking-wider">{t.analytics.thMissed}</th>
            </tr>
          </thead>
          <tbody>
            {retractions.map((r) => (
              <tr key={r.nature} className="border-b last:border-0">
                <td className="p-2">{r.nature}</td>
                <td className="tabular p-2 text-right">{n(r.works)}</td>
                <td className="tabular p-2 text-right">{n(r.openalex_flagged)}</td>
                <td
                  className="tabular p-2 text-right"
                  style={{ color: r.openalex_missed ? 'var(--retraction)' : 'inherit' }}
                >
                  {n(r.openalex_missed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Frame title={t.analytics.venuesTitle} note={t.analytics.venuesNote}>
          <VenueChart data={venues} lang={lang} />
        </Frame>
        <Frame title={t.analytics.fundersTitle} note={t.analytics.fundersNote}>
          <FunderChart data={funders} lang={lang} />
        </Frame>
      </div>

      {/* The provisional baseline scores. This section, and only this section,
          bears machine scores, so the banner lives here rather than site-wide. */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl">{t.analytics.scoresTitle}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
            {t.analytics.scoresNote(n(frameScores.n_scored))}
          </p>
        </div>
        <ScoreBanner t={t} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label={t.analytics.tileScored} value={n(frameScores.n_scored)} note={t.analytics.tileScoredNote} />
          <Tile
            label={t.analytics.tileMeanSpread}
            value={dec(frameScores.mean_teacher_spread)}
            note={t.analytics.tileMeanSpreadNote}
            color="var(--contested)"
          />
          <Tile
            label={t.analytics.tileP99Spread}
            value={dec(frameScores.p99_teacher_spread)}
            note={t.analytics.tileP99SpreadNote}
            color="var(--contested)"
          />
          <Tile
            label={t.analytics.tileSplit}
            value={n(frameScores.n_works_where_teachers_would_split)}
            note={t.analytics.tileSplitNote}
            color="var(--mc-accent)"
          />
        </div>
      </section>

      <p className="text-xs" style={{ color: 'var(--ink-5)' }}>
        {t.analytics.apiNote(p)}
      </p>
    </div>
  )
}

/** Any-model and all-models-agree side by side, per bucket. */
function BarTable({
  t,
  head,
  rows,
  max,
  lang,
}: {
  t: Dictionary
  head: string
  rows: Array<{ key: string; label: string; any: number; all: number }>
  max: number
  lang: Lang
}) {
  return (
    <div className="scroll-x mt-3">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b" style={{ color: 'var(--ink-4)' }}>
            <th className="p-1.5 text-left text-xs font-medium uppercase tracking-wider">{head}</th>
            <th className="p-1.5 text-right text-xs font-medium uppercase tracking-wider">{t.landscape.thAny}</th>
            <th className="p-1.5 text-right text-xs font-medium uppercase tracking-wider">{t.landscape.thAll}</th>
            <th className="w-1/3 p-1.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b last:border-0">
              <td className="p-1.5">{r.label}</td>
              <td className="tabular p-1.5 text-right">{formatInt(lang, r.any)}</td>
              <td className="tabular p-1.5 text-right font-medium">{formatInt(lang, r.all)}</td>
              <td className="p-1.5">
                <div className="relative h-2.5 rounded-sm" style={{ background: 'var(--surface-3)' }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{ width: `${(r.any / max) * 100}%`, background: 'var(--mc)', opacity: 0.35 }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{ width: `${(r.all / max) * 100}%`, background: 'var(--mc)' }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** One of the four year-stat tiles under the histogram, per the design. */
function YearStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r px-5 py-3.5 last:border-r-0">
      <div className="micro-label">{label}</div>
      <div className="font-serif tabular mt-1" style={{ fontSize: 22, color: 'var(--ink)' }}>
        {value}
      </div>
    </div>
  )
}

function Tile({ label, value, note, color }: { label: string; value: string; note?: string; color?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
        {label}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold" style={{ color: color ?? 'var(--ink)' }}>
        {value}
      </div>
      {note && (
        <div className="mt-1 text-xs" style={{ color: 'var(--ink-5)' }}>
          {note}
        </div>
      )}
    </div>
  )
}

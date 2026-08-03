import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getSummary,
  getByRoute,
  getByYear,
  getLabelStats,
  getPredictionModelVersion,
  getTopCited,
} from '@/lib/stats'
import { getScreenSummary } from '@/lib/screen'
import { SNAPSHOT } from '@/lib/permalink'
import { HomeSearch } from '@/components/HomeSearch'
import { CopyPermalink } from '@/components/CopyPermalink'
import { WorkRow } from '@/components/WorkRow'
import { getDict } from '@/lib/i18n'
import { formatInt, formatPct, isLang, localePath, type Lang } from '@/lib/lang'

export const dynamic = 'force-dynamic'

/**
 * The front page: the design's landing screen. A serif hero, the search bar
 * that routes into the cohort builder, and a dashboard whose every figure is
 * a live database value: the frame size, the per-route counts, the metadata
 * coverage, the label coverage, and the three-model screen's consensus. No
 * number on this page is typed.
 *
 * The cohort builder itself lives at /cohort. Old bookmarked filter URLs on
 * "/" still work: any cohort parameter redirects there, query preserved.
 */

const LEGACY_COHORT_PARAMS = [
  'q',
  'year_from',
  'year_to',
  'lang',
  'type',
  'field',
  'topic',
  'venue',
  'route',
  'route_aff',
  'route_fund',
  'route_venue',
  'route_about',
  'retracted',
  'no_abstract',
  'abstract',
  'n_in',
  'category',
  'design',
  'agreement',
  'label_source',
  'prediction_mode',
  'labeled',
  'sort',
  'page',
  'per_page',
]

export default async function Home({
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

  // The cohort builder used to live here. Its filter URLs must keep working.
  if (LEGACY_COHORT_PARAMS.some((k) => typeof searchParams[k] === 'string' && searchParams[k] !== '')) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string' && v !== '') sp.set(k, v)
    }
    redirect(`${p('/cohort')}?${sp.toString()}`)
  }

  const [summary, byRoute, byYear, labelStats, screen, modelVersion, preview] = await Promise.all([
    getSummary(),
    getByRoute(),
    getByYear(),
    getLabelStats(),
    getScreenSummary(),
    getPredictionModelVersion(),
    getTopCited(3),
  ])

  const pctNoAff = formatPct(lang, (summary.no_aff / summary.works) * 100)
  const yearMin = byYear.length ? byYear[0]!.year : null
  const yearMax = byYear.length ? byYear[byYear.length - 1]!.year : null
  const maxRoute = Math.max(1, ...byRoute.marginals.map((r) => r.works))
  const routeNames: Record<string, string> = {
    aff: t.home.routeAffName,
    fund: t.home.routeFundName,
    venue: t.home.routeVenueName,
    about: t.home.routeAboutName,
  }
  const routeBars = [...byRoute.marginals].sort((a, b) => b.works - a.works)

  const cov = summary.coverage
  const pc = (x: number) => formatPct(lang, (x / summary.works) * 100)
  const frameStats: Array<{ l: string; v: number; color: string }> = [
    { l: t.home.sVenue, v: cov.has_venue, color: 'var(--teal)' },
    { l: t.home.sAbs, v: cov.has_abstract, color: 'var(--teal)' },
    { l: t.home.sFrench, v: cov.french, color: 'var(--teal)' },
    { l: t.home.sNoFund, v: cov.no_funder, color: 'var(--contested)' },
    { l: t.home.sNoAbs, v: summary.no_abstract, color: 'var(--contested)' },
  ]

  const contested = screen.n_in_1 + screen.n_in_2

  const kpiCell = 'border-b p-5 sm:p-6 lg:border-b-0 lg:border-r lg:last:border-r-0'

  return (
    <div className="pb-2">
      {/* Hero */}
      <div className="pt-10 sm:pt-14">
        <div className="eyebrow">{t.home.heroEyebrow}</div>
        <h1
          className="font-serif mt-3.5"
          style={{
            fontSize: 'clamp(34px, 5.4vw, 58px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            fontWeight: 400,
            color: 'var(--ink)',
            maxWidth: 920,
            textWrap: 'balance',
          }}
        >
          {t.home.heroTitle}
        </h1>
        <p className="mt-[18px] max-w-[700px] text-base leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.home.heroBody}
        </p>
      </div>

      {/* The search card: an entry point into the cohort builder. */}
      <div
        className="mt-8 max-w-[940px] overflow-hidden rounded-[14px] border"
        style={{ background: 'var(--surface)', boxShadow: '0 1px 0 var(--border)' }}
      >
        <HomeSearch lang={lang} />
        <div className="grid grid-cols-2 border-b sm:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="border-r px-[18px] py-3">
            <div className="micro-label mb-1.5">{t.home.fYear}</div>
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--ink-2)' }}>
              <span className="font-mono">{yearMin ?? '·'}</span>
              <div className="meter flex-1" style={{ height: 4 }}>
                <div style={{ width: '100%', background: 'var(--mc)' }} />
              </div>
              <span className="font-mono">{yearMax ?? '·'}</span>
            </div>
          </div>
          {[
            { l: t.home.fLang, v: t.home.anyLang, flag: '' },
            { l: t.home.fType, v: t.home.anyType, flag: '' },
            { l: t.home.fCat, v: t.home.anyLabel, flag: t.home.sparse },
          ].map((hf) => (
            <Link
              key={hf.l}
              href={p('/cohort')}
              className="border-r px-[18px] py-3 last:border-r-0"
              style={{ color: 'inherit' }}
            >
              <div className="micro-label mb-1.5">
                {hf.l}{' '}
                {hf.flag && (
                  <span style={{ color: 'var(--contested)', textTransform: 'none', letterSpacing: 0 }}>{hf.flag}</span>
                )}
              </div>
              <div className="flex items-center justify-between text-[13px]" style={{ color: 'var(--ink-2)' }}>
                <span>{hf.v}</span>
                <span style={{ color: 'var(--ink-4)' }}>▾</span>
              </div>
            </Link>
          ))}
        </div>
        <div
          className="flex flex-wrap items-center gap-2 px-[18px] py-3 text-xs"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}
        >
          <span className="micro-label">{t.home.routesWord}</span>
          {(['aff', 'fund', 'venue', 'about'] as const).map((r) => (
            <span key={r} className="chip chip-route">
              {r}
            </span>
          ))}
          <span>{t.home.routesTri}</span>
          <Link
            href={`${p('/cohort')}?route_fund=1&route_aff=0`}
            className="ml-auto font-medium"
            style={{ color: 'var(--teal)' }}
          >
            {t.home.routesEg}
          </Link>
        </div>
      </div>

      {/* KPI strip: four live database values. */}
      <div className="card mt-10 grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        <div className={kpiCell}>
          <div className="eyebrow">{t.home.k1l}</div>
          <Serif38>{n(summary.works)}</Serif38>
          <div className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
            {t.home.k1s(SNAPSHOT.built)}
          </div>
        </div>
        <div className={kpiCell}>
          <div className="eyebrow">{t.home.k2l}</div>
          <Serif38 color="var(--teal)">{n(summary.no_aff)}</Serif38>
          <div className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
            {t.home.k2s(pctNoAff)}
          </div>
        </div>
        <div className={kpiCell}>
          <div className="eyebrow">{t.home.k3l}</div>
          <Serif38>{n(cov.french)}</Serif38>
          <div className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
            {t.home.k3s}
          </div>
        </div>
        <div className={`${kpiCell} border-b-0`}>
          <div className="eyebrow">{t.home.k4l}</div>
          <Serif38>{n(labelStats.coverage.labeled_works)}</Serif38>
          <div className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
            {t.home.k4s(modelVersion ?? 'n/a')} <span style={{ color: 'var(--contested)' }}>{t.home.k4warn}</span>
          </div>
        </div>
      </div>

      {/* Routes into the frame, and what the frame can see. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="card-head">
            <h3>{t.home.routesTitle}</h3>
            <span className="mono-meta">{t.home.routesMeta(n(byRoute.total))}</span>
          </div>
          <div className="flex flex-col gap-[13px] px-5 py-4">
            {routeBars.map((r) => (
              <div key={r.route}>
                <div className="mb-[5px] flex justify-between text-xs">
                  <span style={{ color: 'var(--ink-2)' }}>
                    <span className="font-mono font-medium" style={{ color: 'var(--mc)' }}>
                      {r.route}
                    </span>{' '}
                    · {routeNames[r.route] ?? r.label}
                  </span>
                  <span className="font-mono tabular" style={{ color: 'var(--ink-3)' }}>
                    {n(r.works)}
                  </span>
                </div>
                <div className="meter">
                  <div style={{ width: `${Math.max((r.works / maxRoute) * 100, 2)}%`, background: 'var(--mc)' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="callout-teal mx-5 mb-4">
            <strong className="tabular">{n(byRoute.no_aff)}</strong> {t.home.calloutTail(pctNoAff)}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="card-head">
            <h3>{t.home.seeTitle}</h3>
            <span className="mono-meta">{t.home.seeMeta}</span>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4">
            {frameStats.map((fs) => (
              <div key={fs.l}>
                <div className="mb-[5px] flex justify-between text-xs">
                  <span style={{ color: 'var(--ink-2)' }}>{fs.l}</span>
                  <span className="font-mono tabular" style={{ color: 'var(--ink-3)' }}>
                    {n(fs.v)} · {pc(fs.v)}
                  </span>
                </div>
                <div className="meter">
                  <div style={{ width: `${Math.max((fs.v / summary.works) * 100, 2)}%`, background: fs.color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mx-5 mb-4 text-[11px] leading-normal" style={{ color: 'var(--ink-4)' }}>
            {t.home.seeNote}
          </p>
        </section>
      </div>

      {/* Cohort preview: the builder's unfiltered first page, most cited first. */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="micro-label mb-1">{t.home.prevMeta}</div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              {t.home.prevTitle}
            </h3>
          </div>
          <div className="flex gap-2">
            <a className="btn" href="/api/v1/cohort/export?format=csv" download>
              {t.cohort.exportCsvBtn}
            </a>
            <CopyPermalink query="" label={t.cohort.copyPermalinkBtn} copiedLabel={t.cohort.citeCopied} />
          </div>
        </div>
        {preview.map((w) => (
          <WorkRow key={w.id} lang={lang} w={{ ...w, labels: w.labels }} />
        ))}
        <div
          className="flex items-center justify-between gap-3 border-t px-5 py-3 text-xs"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-3)' }}
        >
          <span>{t.home.showingLine(n(preview.length), n(summary.works), n(labelStats.coverage.labeled_works))}</span>
          <Link href={p('/cohort')} className="shrink-0 text-[13px] font-medium" style={{ color: 'var(--mc)' }}>
            {t.home.seeAll} →
          </Link>
        </div>
      </div>

      {/* CTA band: the boundary, measured. Every figure is the screen's own. */}
      <div
        className="mt-11 grid overflow-hidden rounded-xl sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        <div className="p-7" style={{ borderRight: '1px solid var(--ink-3)' }}>
          <div className="eyebrow" style={{ color: 'var(--ink-4)' }}>
            {t.home.ctaEyebrow}
          </div>
          <div className="font-serif mt-2.5" style={{ fontSize: 23, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {t.home.ctaTitle}
          </div>
        </div>
        {[
          { v: n(screen.n_screened), v2: '', s: t.home.cta1s, color: undefined },
          {
            v: n(screen.n_in_3),
            v2: ` / ${n(screen.any_in)}`,
            s: t.home.cta2s(formatPct(lang, String(screen.pct_all_three))),
            color: undefined,
          },
          { v: n(contested), v2: '', s: t.home.cta3s, color: 'var(--contested)' },
        ].map((cs, i) => (
          <Link
            key={i}
            href={p('/screen')}
            className="p-6"
            style={{ borderRight: '1px solid var(--ink-3)', color: 'inherit' }}
          >
            <div className="font-serif tabular" style={{ fontSize: 34, lineHeight: 1.05, color: cs.color }}>
              {cs.v}
              {cs.v2 && (
                <span style={{ fontSize: 18, color: 'var(--ink-4)' }}>{cs.v2}</span>
              )}
            </div>
            <div className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--ink-5)' }}>
              {cs.s}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Serif38({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="font-serif tabular mt-1.5"
      style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: '-0.02em', color: color ?? 'var(--ink)' }}
    >
      {children}
    </div>
  )
}

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
import { getDict } from '@/lib/i18n'
import { formatInt, formatPct, isLang, langAlternates, localePath, numberLocale, type Lang } from '@/lib/lang'
import { ScoreBanner } from '@/components/ScoreBanner'
// The provisional baseline scores, summarized. This file is the scoring run's own
// output (pilot/results/frame_scores.json), synced by `make findings` exactly as
// findings.json is: the numbers on this page are read, never typed.
import frameScores from '@/data/frame_scores.json'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).meta.analytics, alternates: langAlternates(lang, '/analytics') }
}

/**
 * Every series on this page is a Postgres GROUP BY, cached for an hour, rendered
 * on the server and handed to Recharts as at most a few dozen points. The client
 * never receives a work row. The same functions back /api/v1/stats/*, so the
 * charts and the API cannot drift apart.
 */
export default async function Analytics({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)

  const [summary, byYear, byRoute, byField, byLang, gap, venues, funders, retractions] = await Promise.all([
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

  // The routes do not partition the frame; they overlap. Reporting the marginals
  // alone would make the columns sum past the total, which looks like an error.
  const sumMarginals = byRoute.marginals.reduce((a, r) => a + r.works, 0)
  const overcount = sumMarginals - byRoute.total

  const missedTotal = retractions.reduce((a, r) => a + r.openalex_missed, 0)
  const noticesTotal = retractions.reduce((a, r) => a + r.works, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">{t.analytics.title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          {t.analytics.sub(n(summary.works))}
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

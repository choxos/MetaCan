import Link from 'next/link'
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

export const metadata = { title: 'Analytics' }
export const dynamic = 'force-dynamic'

/**
 * Every series on this page is a Postgres GROUP BY, cached for an hour, rendered
 * on the server and handed to Recharts as at most a few dozen points. The client
 * never receives a work row. The same functions back /api/v1/stats/*, so the
 * charts and the API cannot drift apart.
 */
export default async function Analytics() {
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

  const n = (x: number) => x.toLocaleString('en-CA')
  const pctNoAff = ((summary.no_aff / summary.works) * 100).toFixed(1)
  const pctNoAbs = ((summary.no_abstract / summary.works) * 100).toFixed(1)

  // The routes do not partition the frame; they overlap. Reporting the marginals
  // alone would make the columns sum past the total, which looks like an error.
  const sumMarginals = byRoute.marginals.reduce((a, r) => a + r.works, 0)
  const overcount = sumMarginals - byRoute.total

  const missedTotal = retractions.reduce((a, r) => a + r.openalex_missed, 0)
  const noticesTotal = retractions.reduce((a, r) => a + r.works, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Analytics</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          The frame, described by itself. Every figure is a query against the {n(summary.works)} works, computed at
          request time and cached for an hour — nothing here is a number someone typed.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Works in the frame" value={n(summary.works)} />
        <Tile
          label="No Canadian affiliation"
          value={n(summary.no_aff)}
          note={`${pctNoAff}% of the frame`}
          color="var(--mc-accent)"
        />
        <Tile label="No abstract" value={n(summary.no_abstract)} note={`${pctNoAbs}% of the frame`} color="var(--contested)" />
        <Tile label="Retraction notices" value={n(summary.retraction_notices)} note="joined from Retraction Watch" color="var(--retraction)" />
      </section>

      <Frame
        title="Works by year"
        note={`The frame over time, with the works that carry NO Canadian affiliation drawn underneath. The gap between the two lines is what an affiliation-only frame silently loses — ${pctNoAff}% of the frame, ${n(summary.no_aff)} works.`}
        height={340}
      >
        <ByYearChart data={byYear} />
      </Frame>

      <div className="grid gap-6 lg:grid-cols-2">
        <Frame
          title="Works by route"
          note={`Why each work is in the frame. The four routes OVERLAP — a work can be admitted by several — so these bars sum to ${n(sumMarginals)}, which is ${n(overcount)} more than the ${n(byRoute.total)} works in the frame. That overlap is the next chart.`}
          height={260}
        >
          <ByRouteChart data={byRoute} />
        </Frame>

        <Frame
          title="The overlap: exact route combinations"
          note="Each work counted once, under the exact set of routes that admitted it. Teal bars are works admitted by a SINGLE route: remove that route from the design and those works vanish from the frame entirely."
          height={260}
        >
          <RouteOverlapChart data={byRoute} />
        </Frame>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Frame title="Works by field" note="OpenAlex's primary field, as recorded." height={360}>
          <ByFieldChart data={byField} />
        </Frame>

        <Frame
          title="Works by language"
          note="French is highlighted. It is 6% of the frame, it is oversampled in the screen on purpose, and it is the language the abstract cascade rescues worst (15.4% recovery against 38.8% for English)."
          height={360}
        >
          <ByLangChart data={byLang} />
        </Frame>
      </div>

      <Frame
        title="The abstract gap is structural, not noise"
        note={`Share of works with NO abstract, by type, worst first. ${pctNoAbs}% of the frame has no abstract, and the screen finds HALF as much metaresearch there. If the gap were random, a better index would fix it. It is not random: it is concentrated in types that never carry an abstract at all — so "just screen the works that have abstracts" is a selection on a covariate that predicts the outcome.`}
        height={400}
      >
        <AbstractGapChart data={gap} />
      </Frame>

      <Frame
        title="The post-publication record has four states, and OpenAlex has a boolean"
        note={`${n(noticesTotal)} works in the frame carry a Retraction Watch notice. The solid bar is what OpenAlex flags; the hatched bar is what it reports as “false” — ${n(missedTotal)} works whose notice OpenAlex does not carry, which a reader takes to mean “fine”. An expression of concern is not a retraction, and \`is_retracted\` has no way to say so.`}
        height={320}
      >
        <RetractionChart data={retractions} />
      </Frame>

      <div className="scroll-x">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b" style={{ color: 'var(--ink-4)' }}>
              <th className="p-2 text-left text-xs font-medium uppercase tracking-wider">State</th>
              <th className="p-2 text-right text-xs font-medium uppercase tracking-wider">Works</th>
              <th className="p-2 text-right text-xs font-medium uppercase tracking-wider">OpenAlex flags it</th>
              <th className="p-2 text-right text-xs font-medium uppercase tracking-wider">OpenAlex reports false</th>
            </tr>
          </thead>
          <tbody>
            {retractions.map((r) => (
              <tr key={r.nature} className="border-b last:border-0">
                <td className="p-2">{r.nature}</td>
                <td className="tabular p-2 text-right">{n(r.works)}</td>
                <td className="tabular p-2 text-right">{n(r.openalex_flagged)}</td>
                <td className="tabular p-2 text-right" style={{ color: r.openalex_missed ? 'var(--retraction)' : 'inherit' }}>
                  {n(r.openalex_missed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Frame title="Top venues" note="By work count in the frame." height={380}>
          <VenueChart data={venues} />
        </Frame>
        <Frame
          title="Top funders"
          note="Split from the semicolon-separated funder string. The funder route admits works that carry no Canadian affiliation at all."
          height={380}
        >
          <FunderChart data={funders} />
        </Frame>
      </div>

      <p className="text-xs" style={{ color: 'var(--ink-5)' }}>
        Every series here is available as JSON:{' '}
        <Link href="/api-docs" className="link">
          see the API
        </Link>
        .
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

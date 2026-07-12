import Link from 'next/link'
import { getScreened, getScreenSummary, type ScreenFilters } from '@/lib/screen'
import findings from '@/data/findings.json'

export const metadata = { title: 'The three-model screen' }
export const dynamic = 'force-dynamic'

/**
 * THE DELIVERABLE.
 *
 * Not the base rate. The base rate is a number three models cannot agree on to
 * within a factor of two, and reporting it alone would be exactly the false
 * precision this project was built to expose. The deliverable is the DISAGREEMENT
 * DOSSIER: the works that mark the field's empirical boundary, shown with all
 * three models' verdicts, confidences and reasons side by side, so a reader can
 * see WHERE the boundary is contested and WHY.
 *
 * Every number on this page is read from the database or from findings.json.
 * Nothing here is typed by hand.
 */

const TIER_LABEL: Record<string, string> = {
  T1: 'T1 — core metaresearch (counts as IN)',
  T2: 'T2 — metaresearch (counts as IN)',
  T3: 'T3 — adjacent. Does NOT count as in scope.',
  OUT: 'out of scope',
}

/**
 * T1 and T2 are in scope. T3 is ADJACENT and is NOT, which is the rubric's own
 * definition: `n_in` counts T1 and T2 only. Colouring T3 as in-scope would make the
 * table contradict the histogram above it -- a work all three models call T3 has
 * n_in = 0 and is not in the dossier at all.
 */
function tierColor(tier: string | null): string {
  if (tier === 'T1' || tier === 'T2') return 'var(--in-scope)'
  if (tier === 'T3') return 'var(--contested)'
  return 'var(--out)'
}

function Verdict({ tier, conf }: { tier: string | null; conf: string | null }) {
  const t = tier || 'OUT'
  const color = tierColor(tier)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="chip" title={TIER_LABEL[t] ?? t} style={{ borderColor: color, color, background: 'transparent' }}>
        {t}
      </span>
      {conf && (
        <span className="text-xs" style={{ color: 'var(--ink-5)' }}>
          {conf}
        </span>
      )}
    </span>
  )
}

const CONSENSUS_TABS = [
  { v: 'dossier', label: 'The dossier (any model said in)' },
  { v: '3', label: '3/3 — settled core' },
  { v: '2', label: '2/3 — contested' },
  { v: '1', label: '1/3 — one model only' },
  { v: '0', label: '0/3 — settled rejects' },
  { v: 'all', label: 'All 1,000' },
] as const

export default async function Screen({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const raw = typeof searchParams.view === 'string' ? searchParams.view : 'dossier'
  const view = CONSENSUS_TABS.find((t) => t.v === raw)?.v ?? 'dossier'
  const pageRaw = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const f: ScreenFilters = { page, per_page: view === 'all' || view === '0' ? 50 : 100 }
  if (view === 'dossier') f.contested_only = true
  else if (view !== 'all') f.n_in = Number(view)

  const [{ rows, total, perPage }, s] = await Promise.all([getScreened(f), getScreenSummary()])
  const pages = Math.ceil(total / perPage)

  // The screen's own finding, as written by the pipeline that produced the labels.
  const f22 = findings.three_model_screen

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-xs uppercase tracking-wider" style={{ color: 'var(--mc)' }}>
          {s.n_screened.toLocaleString('en-CA')} works · Opus 4.8 · GPT-5.6 (high) · Grok 4.5 · one locked rubric
        </p>
        <h1 className="font-serif text-4xl leading-tight" style={{ maxWidth: '26ch' }}>
          The field&apos;s boundary is not a line. It is a region.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Three frontier models screened the same {s.n_screened.toLocaleString('en-CA')} works, drawn from the real
          frame with known selection probabilities, against the same locked rubric on its full eight-field payload. Of
          the <strong style={{ color: 'var(--ink)' }}>{s.any_in}</strong> works <em>any</em> model called
          metaresearch, only <strong style={{ color: 'var(--in-scope)' }}>{s.n_in_3}</strong> (
          {s.pct_all_three}%) were called metaresearch by all three, and{' '}
          <strong style={{ color: 'var(--contested)' }}>{s.n_in_1}</strong> ({s.pct_single_model}%) rest on a single
          model&apos;s opinion.
        </p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Two screeners can agree on a <em>rate</em> while finding almost entirely different <em>works</em>. At a ~1%
          base rate, the settled rejects buy 98% agreement for free — which is why an agreement statistic computed
          over the whole sample tells you nothing about the boundary, and why the table below, not a percentage, is
          the deliverable.
        </p>
      </section>

      {/* The consensus histogram, computed, not asserted. */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Any model said metaresearch"
          value={String(s.any_in)}
          note="the disagreement dossier: the field's empirical boundary"
          color="var(--mc)"
        />
        <Stat
          label="All three agreed"
          value={`${s.n_in_3}`}
          note={`${s.pct_all_three}% of the dossier — the settled core`}
          color="var(--in-scope)"
        />
        <Stat
          label="Two of three"
          value={`${s.n_in_2}`}
          note="contested"
          color="var(--contested)"
        />
        <Stat
          label="One model only"
          value={`${s.n_in_1}`}
          note={`${s.pct_single_model}% of the dossier rests on one model's opinion`}
          color="var(--contested)"
        />
      </section>

      {/* Each model's own count. They are not interchangeable, and this is how you see it. */}
      <section className="card p-6">
        <h2 className="font-serif text-xl">The three models are not interchangeable</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-4)' }}>
          How many of the {s.n_screened.toLocaleString('en-CA')} works each model called metaresearch (tier T1 or T2),
          on identical input. T3 is <em>adjacent</em> and does not count as in scope, which is why a model&apos;s count
          can never exceed the {s.any_in} works in the dossier.
        </p>
        <div className="mt-4 space-y-2">
          {s.per_model.map((m) => {
            const max = Math.max(...s.per_model.map((x) => x.called_in), 1)
            return (
              <div key={m.model} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm">{m.model}</span>
                <div className="h-6 flex-1 rounded-sm" style={{ background: 'var(--surface-3)' }}>
                  <div
                    className="flex h-6 items-center justify-end rounded-sm px-2 text-xs font-medium text-white"
                    style={{ width: `${(m.called_in / max) * 100}%`, background: 'var(--mc)', minWidth: 32 }}
                  >
                    {m.called_in}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          Swap which model you call &ldquo;the screener&rdquo; and the size of the field moves. That spread — not the
          binomial confidence interval on any one model&apos;s labels — is the honest uncertainty on how big Canadian
          metaresearch is.
        </p>
      </section>

      {/* THE DOSSIER */}
      <section>
        <h2 className="font-serif text-2xl">The disagreement dossier</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          All three verdicts, confidences and reasons side by side. These are the works against which the inclusion
          criteria have to be written — because these are the works on which reasonable screeners, given the same
          rubric and the same evidence, disagree.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {CONSENSUS_TABS.map((t) => {
            const on = t.v === view
            return (
              <Link
                key={t.v}
                href={`/screen?view=${t.v}`}
                className="chip"
                style={{
                  borderColor: on ? 'var(--mc)' : 'var(--border)',
                  background: on ? 'var(--mc)' : 'var(--surface-2)',
                  color: on ? '#fff' : 'var(--ink-3)',
                }}
              >
                {t.label}
              </Link>
            )
          })}
        </div>

        <div className="mt-3 text-sm tabular" style={{ color: 'var(--ink-4)' }}>
          {total.toLocaleString('en-CA')} work{total === 1 ? '' : 's'}
        </div>

        {/* Wide table scrolls inside its own container; the page body never scrolls sideways. */}
        <div className="card scroll-x mt-3">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ background: 'var(--surface-2)' }}>
                <Th>Work</Th>
                <Th>Stratum</Th>
                <Th>n_in</Th>
                <Th>Opus 4.8</Th>
                <Th>GPT-5.6</Th>
                <Th>Grok 4.5</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center" style={{ color: 'var(--ink-4)' }}>
                    No works in this view.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  <td className="max-w-[26rem] p-3">
                    <Link href={`/works/${r.id}`} className="font-medium hover:underline">
                      {r.title || '[no title]'}
                    </Link>
                    <div className="mt-0.5 text-xs" style={{ color: 'var(--ink-5)' }}>
                      {r.year ?? '—'} · {r.type ?? '—'} · {r.lang ?? '—'}
                      {r.venue ? ` · ${r.venue}` : ''}
                    </div>
                  </td>
                  <td className="p-3 text-xs" style={{ color: 'var(--ink-4)' }}>
                    {r.stratum ?? '—'}
                    <div style={{ color: 'var(--ink-5)' }}>w={r.weight?.toFixed(0) ?? '—'}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className="chip tabular"
                      style={{
                        borderColor: r.nIn === 3 ? 'var(--in-scope)' : r.nIn ? 'var(--contested)' : 'var(--out)',
                        color: r.nIn === 3 ? 'var(--in-scope)' : r.nIn ? 'var(--contested)' : 'var(--out)',
                        background: 'transparent',
                      }}
                    >
                      {r.nIn ?? 0}/3
                    </span>
                  </td>
                  <Cell tier={r.opusTier} conf={r.opusConfidence} reason={r.opusReason} genre={r.opusGenre} />
                  <Cell tier={r.gptTier} conf={r.gptConfidence} reason={r.gptReason} genre={r.gptGenre} />
                  <Cell tier={r.grokTier} conf={r.grokConfidence} reason={r.grokReason} genre={r.grokGenre} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="mt-4 flex justify-between text-sm">
            {page > 1 ? (
              <Link className="link" href={`/screen?view=${view}&page=${page - 1}`}>
                ← previous
              </Link>
            ) : (
              <span />
            )}
            <span className="tabular" style={{ color: 'var(--ink-4)' }}>
              page {page} of {pages}
            </span>
            {page < pages ? (
              <Link className="link" href={`/screen?view=${view}&page=${page + 1}`}>
                next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">What the screen actually found</h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {f22.headline}
        </p>
        <p className="mt-4 text-xs" style={{ color: 'var(--ink-5)' }}>
          Computed {f22.computed_at_utc} ·{' '}
          <Link href="/findings" className="link">
            all 22 findings
          </Link>{' '}
          ·{' '}
          <a className="link" href="/api/v1/screened?contested_only=1">
            this dossier as JSON
          </a>
        </p>
      </section>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap p-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
      {children}
    </th>
  )
}

function Cell({
  tier,
  conf,
  reason,
  genre,
}: {
  tier: string | null
  conf: string | null
  reason: string | null
  genre: string | null
}) {
  return (
    <td className="max-w-[22rem] p-3">
      <Verdict tier={tier} conf={conf} />
      {genre && genre !== 'none' && (
        <div className="mt-1 text-xs" style={{ color: 'var(--ink-5)' }}>
          {genre}
        </div>
      )}
      {reason && (
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          {reason}
        </p>
      )}
    </td>
  )
}

function Stat({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
        {label}
      </div>
      <div className="tabular mt-2 text-3xl font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="mt-2 text-xs leading-snug" style={{ color: 'var(--ink-4)' }}>
        {note}
      </div>
    </div>
  )
}

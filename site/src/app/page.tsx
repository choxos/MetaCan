import Link from 'next/link'
import { prisma } from '@/lib/db'

export const revalidate = 3600

/**
 * The home page leads with the frame's own argument, not with a welcome.
 *
 * The number that matters is not 4.3M works. It is the 1.57M works an
 * affiliation-only frame would never have seen, because that gap is the reason
 * this project exists and it is measured rather than asserted.
 */
async function stats() {
  const [total, noAff, noAbstract, screened, retr, eoc] = await Promise.all([
    prisma.work.count(),
    prisma.work.count({ where: { routeCaAff: false } }),
    prisma.work.count({ where: { hasAbstract: false } }),
    prisma.screened.count(),
    prisma.retraction.count(),
    prisma.retraction.count({ where: { nature: 'Expression of concern' } }),
  ])
  return { total, noAff, noAbstract, screened, retr, eoc }
}

function n(x: number) {
  return x.toLocaleString('en-CA')
}

export default async function Home() {
  const s = await stats()
  const pctNoAff = ((s.noAff / s.total) * 100).toFixed(1)
  const pctNoAbs = ((s.noAbstract / s.total) * 100).toFixed(1)

  return (
    <div className="space-y-12">
      <section>
        <p className="mb-3 text-xs uppercase tracking-wider" style={{ color: 'var(--mc)' }}>
          A pinned OpenAlex snapshot · all 482 partitions · 2000–2025
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl" style={{ maxWidth: '24ch' }}>
          Don&apos;t search for metaresearch. Search for Canada, then screen.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          The usual design retrieves what <em>looks</em> like metaresearch, then asks whether it is Canadian. That
          makes the field boundary a property of your keyword list, and it is why such maps cannot be audited: you
          cannot measure what a lexicon never showed you. This frame is inverted. It is{' '}
          <strong style={{ color: 'var(--ink)' }}>all Canadian research</strong> — an external, checkable criterion —
          so field membership becomes a classification over an enumerable universe, not a retrieval over the
          literature.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Works in the frame" value={n(s.total)} note="every Canadian work in the snapshot, each exactly once" />
        <Stat
          label="Invisible to affiliation alone"
          value={n(s.noAff)}
          note={`${pctNoAff}% — an affiliation-only frame silently loses these`}
          tone="mc"
          href="/works?route=no_aff"
        />
        <Stat
          label="Carry no abstract"
          value={n(s.noAbstract)}
          note={`${pctNoAbs}% — the screen finds half as much metaresearch here`}
          tone="contested"
          href="/works?no_abstract=1"
        />
        <Stat
          label="Screened by three models"
          value={n(s.screened)}
          note="Opus 4.8 · GPT-5.6 · Grok 4.5, one locked rubric"
          href="/screen"
        />
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">The boundary is not a line. It is a region.</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Three frontier models screened the same 1,000 works against the same locked rubric, on the full eight-field
          payload the rubric always specified. Of the works <em>any</em> model called metaresearch, only{' '}
          <strong style={{ color: 'var(--ink)' }}>37% were called metaresearch by all three</strong>, and 47% rest on
          a single model&apos;s opinion. Two screeners can agree on a <em>rate</em> while finding almost entirely
          different <em>works</em>: at a ~1% base rate, the settled rejects buy 98% agreement for free.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          So the deliverable is not a base rate. It is the{' '}
          <Link href="/screen" className="link">
            disagreement dossier
          </Link>
          : the works that mark the empirical boundary of the field, and against which the inclusion criteria have to
          be written.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">A boolean over a four-state space</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          OpenAlex records retraction as <code className="font-mono text-xs">is_retracted</code>, a boolean. The
          post-publication record has at least four states. Joined to Retraction Watch, this frame carries{' '}
          <strong style={{ color: 'var(--ink)' }}>{n(s.retr)}</strong> works with a recorded notice, of which{' '}
          <strong style={{ color: 'var(--concern)' }}>{n(s.eoc)}</strong> are{' '}
          <em>expressions of concern</em> — a state OpenAlex has no field for at all, and silently reports as{' '}
          <code className="font-mono text-xs">false</code>, which reads as &ldquo;fine&rdquo;.
        </p>
        <Link href="/works?retracted=1" className="link mt-4 inline-block text-sm">
          Browse the retraction record →
        </Link>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  note,
  tone,
  href,
}: {
  label: string
  value: string
  note: string
  tone?: 'mc' | 'contested'
  href?: string
}) {
  const color = tone === 'mc' ? 'var(--mc)' : tone === 'contested' ? 'var(--contested)' : 'var(--ink)'
  const body = (
    <div className="card h-full p-5">
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
  return href ? <Link href={href}>{body}</Link> : body
}

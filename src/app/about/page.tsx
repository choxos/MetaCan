import Link from 'next/link'
import raw from '@/data/findings.json'

export const metadata = { title: 'About' }

interface Finding {
  headline: string
  values: Record<string, unknown>
  computed_at_utc: string
}
const findings = raw as unknown as Record<string, Finding>

const REPO = 'https://github.com/choxos/CaRN-data-challenge'

/**
 * The method, the frame flip, and the errors.
 *
 * The errors are not an appendix here. A project whose thesis is that research maps
 * cannot be audited, published without an account of its own mistakes, would be
 * making exactly the claim it accuses others of making. So DEVIATIONS.md is linked
 * as prominently as the method.
 */
export default function About() {
  const f = (k: string) => findings[k]

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-serif text-3xl">About MétaCan</h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          MétaCan is a map of Canadian metaresearch that can be audited. That sentence is doing more work than it
          looks: almost no research map can be, and the reason is structural rather than careless.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">The frame flip</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          The usual way to map a field is to retrieve what <em>looks</em> like the field — a keyword list, a topic
          classifier, a journal set — and then ask which of the results are Canadian. This makes the field&apos;s
          boundary a property of your query. And it has a fatal property for anyone who wants to check your work:{' '}
          <strong style={{ color: 'var(--ink)' }}>
            you cannot measure the recall of a lexicon against the works the lexicon never showed you
          </strong>
          . The misses are invisible by construction, so the map cannot report its own error, so it cannot be audited.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          So this project inverts the frame. It starts from{' '}
          <strong style={{ color: 'var(--ink)' }}>all Canadian research</strong> — an external, checkable criterion,
          enumerable from a pinned OpenAlex snapshot — and makes field membership a <em>classification over a known
          universe</em> rather than a <em>retrieval over the literature</em>. Once the universe is enumerable, recall
          becomes measurable, a sample has known selection probabilities, and a disagreement between screeners becomes
          a finding instead of an embarrassment.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          The cost is that &ldquo;Canadian&rdquo; must itself be defined, and it is: by{' '}
          <strong style={{ color: 'var(--ink)' }}>four routes</strong> — affiliation, funder, venue, and subject — each
          recorded on every work. A frame that forgets how it found something cannot be audited either, so every row
          on this site carries its provenance.{' '}
          <Link href="/works?route=no_aff" className="link">
            Browse the works no affiliation-only frame would ever have seen
          </Link>
          .
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">Why the deliverable is a disagreement</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Three frontier models screened the same 1,000 works against the same locked rubric. They did not agree. Of
          the works <em>any</em> model called metaresearch, only about a third were called metaresearch by all three,
          and nearly half rest on a single model&apos;s opinion.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          The tempting move is to average this away and publish a base rate. That would be false precision, and worse,
          it would be <em>hiding the only interesting thing the experiment found</em>. Two screeners can agree on a{' '}
          <em>rate</em> while finding almost entirely different <em>works</em>: at a ~1% base rate, the settled
          rejects buy 98% agreement for free. So the deliverable is not a number. It is the{' '}
          <Link href="/screen" className="link">
            disagreement dossier
          </Link>
          : the works that mark the field&apos;s empirical boundary, and against which inclusion criteria actually
          have to be written.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">What the data cannot say</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Three limits are measured rather than hedged, because a limit you have measured is a finding and a limit you
          have merely acknowledged is an excuse.
        </p>
        <ul className="mt-4 space-y-4">
          <Limit
            title="The abstract gap is structural"
            body={f('abstract_cascade')?.headline}
          />
          <Limit title="Retraction is not a boolean" body={f('retraction_record')?.headline} />
          <Limit title="Swap the screener, move the answer" body={f('agreement')?.headline} />
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/findings" className="link">
            All 22 findings, rendered from the pipeline&apos;s own output →
          </Link>
        </p>
      </section>

      {/* The errors. Prominent, not buried. */}
      <section className="card p-6" style={{ borderColor: 'var(--mc)' }}>
        <h2 className="font-serif text-2xl">The errors</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          This project records its own mistakes.{' '}
          <a className="link" href={`${REPO}/blob/main/DEVIATIONS.md`}>
            DEVIATIONS.md
          </a>{' '}
          lists them — deviations from the protocol, defects in the screening harness, an estimator that had to be cut
          rather than dressed up as a lower bound, a rescue path built around a source that turned out not to deposit
          the data at all. They were written down as they happened and before submission, not reconstructed
          afterwards.
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          This is not humility for its own sake. The whole argument of MétaCan is that a map which cannot report its
          own error is not a map you can trust. A project making that argument while quietly polishing its own record
          would refute itself in the act of publishing. So: the capture-recapture estimator implied Canada produces
          59% of the world&apos;s metaresearch, which is absurd, and it was{' '}
          <strong style={{ color: 'var(--ink)' }}>cut</strong>, not softened. The abstract cascade was built around
          Crossref as the discipline-agnostic rescue, and Crossref recovered 2 abstracts against PubMed&apos;s 180 —
          so that rescue <strong style={{ color: 'var(--ink)' }}>does not exist</strong>, and the gap is structural.
          GPT-5.6 violated the locked output schema on 18 of 1,000 records; the manifest validator caught it, and it
          is recorded rather than silently repaired.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">Method, in short</h2>
        <dl className="mt-3 space-y-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          <Row k="Frame">
            Every Canadian work in a pinned OpenAlex snapshot (all 482 partitions), each work exactly once, admitted by
            one or more of four routes: Canadian affiliation, Canadian funder, Canadian venue, or subject-about-Canada.
          </Row>
          <Row k="Screen">
            1,000 works drawn with known selection probabilities, stratified (French oversampled), screened by Claude
            Opus 4.8, GPT-5.6 (high) and Grok 4.5 against one locked rubric on its full eight-field payload. Chunks
            were randomized and manifest-logged before any model ran, and the harness writes the label files — never
            the model.
          </Row>
          <Row k="Weights">
            The sample is stratified, so every rate is design-weighted. A rate computed from the raw sample without
            the weight is wrong, and the weight ships with every screened record in the API.
          </Row>
          <Row k="Abstracts">
            Not stored. The inverted indexes are 8.6 GB of the frame&apos;s 9.3 GB of text and the host has 13 GB
            free, so the detail page fetches an abstract live from OpenAlex. Whether a work <em>has</em> one is stored,
            because that is itself a finding.
          </Row>
          <Row k="Retraction">
            Joined to Retraction Watch by DOI, and kept in its own table with four states, because OpenAlex&apos;s{' '}
            <code className="font-mono text-xs">is_retracted</code> is a boolean over a state space that has at least
            four values.
          </Row>
          <Row k="Reproducibility">
            Every number on this site is produced by a script in the repository and read from{' '}
            <code className="font-mono text-xs">findings.json</code>. Nothing is typed by hand, so the site and the
            analysis cannot drift apart.
          </Row>
        </dl>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">Sources, licence, contact</h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Data: OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT, data CC-BY-4.0. Built by Ahmad
          Sofi-Mahmudi for the Canadian Metaresearch Data Challenge (Canadian Reproducibility Network).
        </p>
        <p className="mt-3 text-sm">
          <a className="link" href={REPO}>
            The repository
          </a>{' '}
          ·{' '}
          <a className="link" href={`${REPO}/blob/main/DEVIATIONS.md`}>
            DEVIATIONS.md
          </a>{' '}
          ·{' '}
          <Link href="/api-docs" className="link">
            the public API
          </Link>
        </p>
      </section>
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="border-b pb-3 last:border-0">
      <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--mc)' }}>
        {k}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

function Limit({ title, body }: { title: string; body: string | undefined }) {
  if (!body) return null
  return (
    <li className="rounded-md p-4" style={{ background: 'var(--surface-2)' }}>
      <div className="font-medium" style={{ color: 'var(--contested)' }}>
        {title}
      </div>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        {body}
      </p>
    </li>
  )
}

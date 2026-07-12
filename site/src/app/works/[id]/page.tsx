import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getWork, fetchAbstract } from '@/lib/query'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const w = await getWork(params.id)
  return { title: w?.title?.slice(0, 60) ?? 'Work not found' }
}

const ROUTES = [
  {
    key: 'routeCaAff',
    name: 'Canadian affiliation',
    why: 'An author listed a Canadian institution. This is the only route the usual frame has.',
  },
  {
    key: 'routeCaFund',
    name: 'Canadian funder',
    why: 'A Canadian agency funded it. The work may carry no Canadian affiliation at all.',
  },
  {
    key: 'routeCaVenue',
    name: 'Canadian venue',
    why: 'It was published in a Canadian venue.',
  },
  {
    key: 'routeAboutCa',
    name: 'About Canada',
    why: 'Its subject is Canada, wherever its authors sit.',
  },
] as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b py-2.5 last:border-0">
      <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
        {label}
      </dt>
      <dd className="mt-0.5 break-words">{children ?? <span style={{ color: 'var(--ink-5)' }}>—</span>}</dd>
    </div>
  )
}

/** One model's verdict. The reason is the point: a tier without a reason is not evidence. */
function ModelCard({
  model,
  tier,
  genre,
  aboutCa,
  confidence,
  reason,
}: {
  model: string
  tier: string | null
  genre: string | null
  aboutCa: boolean | null
  confidence: string | null
  reason: string | null
}) {
  // T1/T2 are in scope; T3 is ADJACENT and is NOT (the rubric's `n_in` counts T1 and
  // T2 only). Painting T3 as in-scope would contradict the consensus banner above:
  // a work all three call T3 has n_in = 0.
  const isIn = tier === 'T1' || tier === 'T2'
  const color = isIn ? 'var(--in-scope)' : tier === 'T3' ? 'var(--contested)' : 'var(--out)'
  const label = tier === 'T3' ? 'T3 · adjacent, not in scope' : tier || 'OUT'
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{model}</span>
        <span className="chip" style={{ borderColor: color, color, background: 'transparent' }}>
          {label}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--ink-4)' }}>
        {genre && <div>genre: {genre}</div>}
        <div>about Canada: {aboutCa === null ? '—' : aboutCa ? 'yes' : 'no'}</div>
        <div>confidence: {confidence ?? '—'}</div>
      </div>
      {reason && (
        <p className="mt-3 border-t pt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {reason}
        </p>
      )}
    </div>
  )
}

export default async function WorkDetail({ params }: { params: { id: string } }) {
  const w = await getWork(params.id)
  if (!w) notFound()

  // The abstract is NOT in the database, by design: the inverted indexes are
  // 8.6 GB of the frame's 9.3 GB of text and the host has 13 GB free. So it is
  // fetched live, and cached for a day. If OpenAlex is down or the work has none,
  // this is null and the page says so rather than pretending.
  const abstract = w.screened?.abstract ?? (await fetchAbstract(w.id))
  const s = w.screened
  const r = w.retraction

  const admitted = ROUTES.filter((route) => w[route.key])
  const chips = (arr: string) =>
    arr
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)

  return (
    <div className="space-y-8">
      <div>
        <Link href="/works" className="link text-sm">
          ← all works
        </Link>
        <h1 className="mt-2 font-serif text-3xl leading-tight">{w.title || '[no title]'}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--ink-4)' }}>
          <span className="tabular">{w.year ?? '—'}</span>
          {w.type && <span>· {w.type}</span>}
          {w.lang && <span>· {w.lang}</span>}
          <span className="tabular">· {w.citedBy.toLocaleString('en-CA')} citations</span>
          <span>
            ·{' '}
            <a className="link" href={`https://openalex.org/${w.id}`} target="_blank" rel="noreferrer">
              {w.id} on OpenAlex
            </a>
          </span>
          {w.doi && (
            <span>
              ·{' '}
              <a className="link" href={`https://doi.org/${w.doi}`} target="_blank" rel="noreferrer">
                {w.doi}
              </a>
            </span>
          )}
        </div>
      </div>

      {/* THE ROUTES. This is the point of the project, so it goes first, above the
          bibliographic record, and it says why each route admitted the work. */}
      <section className="card p-6">
        <h2 className="font-serif text-xl">Why is this work in the frame?</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-4)' }}>
          A frame that forgets how it found something cannot be audited. These are the routes that admitted this work.
        </p>

        <div className="mt-4 space-y-2">
          {admitted.map((route) => (
            <div key={route.key} className="flex gap-3 rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
              <span className="chip shrink-0" style={{ borderColor: 'var(--mc)', color: 'var(--mc)', background: 'transparent' }}>
                {route.name}
              </span>
              <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
                {route.why}
              </span>
            </div>
          ))}
        </div>

        {!w.routeCaAff && (
          <p
            className="mt-4 rounded-md border p-3 text-sm leading-relaxed"
            style={{ borderColor: 'var(--mc-accent)', color: 'var(--ink-2)' }}
          >
            <strong style={{ color: 'var(--mc-accent)' }}>No Canadian affiliation.</strong> An affiliation-only frame
            — the usual design — would never have seen this work. It is one of the works that make the case for
            inverting the frame.
          </p>
        )}
      </section>

      {/* Retraction: the four-state record, not the boolean. */}
      {(r || w.isRetracted) && (
        <section className="card p-6" style={{ borderColor: 'var(--retraction)' }}>
          <h2 className="font-serif text-xl">Post-publication record</h2>
          {r ? (
            <>
              <dl className="mt-3">
                <Field label="Nature">{r.nature}</Field>
                <Field label="Reason">{r.reason}</Field>
                <Field label="Date">{r.retractionDate}</Field>
                <Field label="Flagged by OpenAlex?">
                  {r.openalexFlagged ? (
                    'Yes'
                  ) : (
                    <span style={{ color: 'var(--retraction)' }}>
                      No — Retraction Watch records this, and OpenAlex does not flag it.
                    </span>
                  )}
                </Field>
              </dl>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                Source: Retraction Watch, joined by DOI. OpenAlex records retraction as{' '}
                <code className="font-mono text-xs">is_retracted</code>, a boolean over a state space with at least
                four values, so it cannot express an expression of concern, a correction or a reinstatement — it
                reports them as <code className="font-mono text-xs">false</code>, which reads as &ldquo;fine&rdquo;.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>
              OpenAlex flags this work as retracted, but it carries no matching Retraction Watch record in this frame.
            </p>
          )}
        </section>
      )}

      {/* The screen. Only 1,000 of the 4.3M works have this. */}
      {s && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl">The three-model screen</h2>
            <Link href="/screen" className="link text-sm">
              all 1,000 screened works →
            </Link>
          </div>

          <div
            className="card mb-3 p-4"
            style={{ borderColor: s.nIn === 3 ? 'var(--in-scope)' : s.nIn && s.nIn > 0 ? 'var(--contested)' : 'var(--border)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              {s.nIn === 3 ? (
                <>
                  <strong style={{ color: 'var(--in-scope)' }}>All three models</strong> called this metaresearch. It
                  is in the settled core of the field.
                </>
              ) : s.nIn === 0 ? (
                <>
                  <strong style={{ color: 'var(--out)' }}>All three models</strong> called this out of scope.
                </>
              ) : (
                <>
                  <strong style={{ color: 'var(--contested)' }}>
                    {s.nIn} of 3 models called this metaresearch.
                  </strong>{' '}
                  This work is <em>contested</em>: it sits on the field&apos;s empirical boundary, and whether it
                  counts depends on which model you asked. It is one of the 51 works in the disagreement dossier.
                </>
              )}
            </p>
            <div className="mt-2 text-xs" style={{ color: 'var(--ink-4)' }}>
              stratum: {s.stratum ?? '—'} · design weight: {s.weight?.toFixed(2) ?? '—'} (the sample is stratified;
              any rate computed without the weight is wrong)
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ModelCard
              model="Claude Opus 4.8"
              tier={s.opusTier}
              genre={s.opusGenre}
              aboutCa={s.opusAboutCa}
              confidence={s.opusConfidence}
              reason={s.opusReason}
            />
            <ModelCard
              model="GPT-5.6 (high)"
              tier={s.gptTier}
              genre={s.gptGenre}
              aboutCa={s.gptAboutCa}
              confidence={s.gptConfidence}
              reason={s.gptReason}
            />
            <ModelCard
              model="Grok 4.5"
              tier={s.grokTier}
              genre={s.grokGenre}
              aboutCa={s.grokAboutCa}
              confidence={s.grokConfidence}
              reason={s.grokReason}
            />
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="font-serif text-xl">Abstract</h2>
        {abstract ? (
          <>
            <p className="mt-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              {abstract}
            </p>
            <p className="mt-3 text-xs" style={{ color: 'var(--ink-5)' }}>
              {s?.abstract
                ? 'Stored with the screening record, where it is evidence for the labels above.'
                : 'Fetched live from OpenAlex and de-inverted. Abstracts are not stored in this database: the inverted indexes are 8.6 GB of the frame’s 9.3 GB of text, and the host has 13 GB free.'}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
            {w.hasAbstract
              ? 'OpenAlex records an abstract for this work, but it could not be fetched just now.'
              : 'No abstract. This is not a gap in this database — OpenAlex has none either. 23.3% of the frame is in this state, and the screen finds HALF as much metaresearch here, so the absence is a measured bias rather than a missing field.'}
          </p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">The record</h2>
        <dl className="mt-2">
          <Field label="Venue">{w.venue}</Field>
          <Field label="Topic">{w.topic}</Field>
          <Field label="Field">{w.field}</Field>
          <Field label="Canadian institutions">
            {w.caInstitutions ? (
              <span className="flex flex-wrap gap-1">
                {chips(w.caInstitutions).map((i, k) => (
                  <span key={k} className="chip">
                    {i}
                  </span>
                ))}
              </span>
            ) : null}
          </Field>
          <Field label="Funders">
            {w.funders ? (
              <span className="flex flex-wrap gap-1">
                {chips(w.funders).map((i, k) => (
                  <span key={k} className="chip">
                    {i}
                  </span>
                ))}
              </span>
            ) : null}
          </Field>
          <Field label="Keywords">
            {w.keywords ? (
              <span className="flex flex-wrap gap-1">
                {chips(w.keywords).map((i, k) => (
                  <span key={k} className="chip">
                    {i}
                  </span>
                ))}
              </span>
            ) : null}
          </Field>
          <Field label="Has abstract in OpenAlex">{w.hasAbstract ? 'yes' : 'no'}</Field>
          <Field label="API">
            <a className="link font-mono text-xs" href={`/api/v1/works/${w.id}`}>
              /api/v1/works/{w.id}
            </a>
          </Field>
        </dl>
      </section>
    </div>
  )
}

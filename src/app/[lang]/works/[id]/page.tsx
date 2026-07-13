import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getWork, fetchAbstract } from '@/lib/query'
import { getDict, type Dictionary } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, type Lang } from '@/lib/lang'
import { localePath } from '@/lib/lang'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { lang: string; id: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const w = await getWork(params.id)
  return {
    title: w?.title?.slice(0, 60) ?? getDict(lang).meta.workNotFound,
    alternates: langAlternates(lang, `/works/${params.id}`),
  }
}

const ROUTE_KEYS = ['routeCaAff', 'routeCaFund', 'routeCaVenue', 'routeAboutCa'] as const

function routeDefs(t: Dictionary) {
  return [
    { key: 'routeCaAff', name: t.workDetail.routeAffName, why: t.workDetail.routeAffWhy },
    { key: 'routeCaFund', name: t.workDetail.routeFundName, why: t.workDetail.routeFundWhy },
    { key: 'routeCaVenue', name: t.workDetail.routeVenueName, why: t.workDetail.routeVenueWhy },
    { key: 'routeAboutCa', name: t.workDetail.routeAboutName, why: t.workDetail.routeAboutWhy },
  ] as Array<{ key: (typeof ROUTE_KEYS)[number]; name: string; why: string }>
}

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
  t,
  model,
  tier,
  genre,
  aboutCa,
  confidence,
  reason,
}: {
  t: Dictionary
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
  const label = tier === 'T3' ? t.workDetail.tierAdjacent : tier || 'OUT'
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{model}</span>
        <span className="chip" style={{ borderColor: color, color, background: 'transparent' }}>
          {label}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--ink-4)' }}>
        {genre && <div>{t.workDetail.genre(genre)}</div>}
        <div>
          {t.workDetail.aboutCanada}: {aboutCa === null ? '—' : aboutCa ? t.common.yes : t.common.no}
        </div>
        <div>
          {t.workDetail.confidence}: {confidence ?? '—'}
        </div>
      </div>
      {reason && (
        <p className="mt-3 border-t pt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {reason}
        </p>
      )}
    </div>
  )
}

export default async function WorkDetail({ params }: { params: { lang: string; id: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)

  const w = await getWork(params.id)
  if (!w) notFound()

  // The abstract is NOT in the database, by design: the inverted indexes are
  // 8.6 GB of the frame's 9.3 GB of text and the host has 13 GB free. So it is
  // fetched live, and cached for a day. If OpenAlex is down or the work has none,
  // this is null and the page says so rather than pretending.
  const abstract = w.screened?.abstract ?? (await fetchAbstract(w.id))
  const s = w.screened
  const r = w.retraction

  const admitted = routeDefs(t).filter((route) => w[route.key])
  const chips = (arr: string) =>
    arr
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)

  return (
    <div className="space-y-8">
      <div>
        <Link href={p('/works')} className="link text-sm">
          {t.workDetail.back}
        </Link>
        <h1 className="mt-2 font-serif text-3xl leading-tight">{w.title || t.common.noTitle}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--ink-4)' }}>
          <span className="tabular">{w.year ?? '—'}</span>
          {w.type && <span>· {w.type}</span>}
          {w.lang && <span>· {w.lang}</span>}
          <span className="tabular">· {t.workDetail.citations(formatInt(lang, w.citedBy))}</span>
          <span>
            ·{' '}
            <a className="link" href={`https://openalex.org/${w.id}`} target="_blank" rel="noreferrer">
              {t.workDetail.onOpenAlex(w.id)}
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
        <h2 className="font-serif text-xl">{t.workDetail.whyTitle}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-4)' }}>
          {t.workDetail.whySub}
        </p>

        <div className="mt-4 space-y-2">
          {admitted.map((route) => (
            <div key={route.key} className="flex gap-3 rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
              <span
                className="chip shrink-0"
                style={{ borderColor: 'var(--mc)', color: 'var(--mc)', background: 'transparent' }}
              >
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
            {t.workDetail.noAffCallout}
          </p>
        )}
      </section>

      {/* Retraction: the four-state record, not the boolean. */}
      {(r || w.isRetracted) && (
        <section className="card p-6" style={{ borderColor: 'var(--retraction)' }}>
          <h2 className="font-serif text-xl">{t.workDetail.postPubTitle}</h2>
          {r ? (
            <>
              <dl className="mt-3">
                <Field label={t.workDetail.nature}>{r.nature}</Field>
                <Field label={t.workDetail.reason}>{r.reason}</Field>
                <Field label={t.workDetail.date}>{r.retractionDate}</Field>
                <Field label={t.workDetail.flagged}>
                  {r.openalexFlagged ? (
                    t.workDetail.flaggedYes
                  ) : (
                    <span style={{ color: 'var(--retraction)' }}>{t.workDetail.flaggedNo}</span>
                  )}
                </Field>
              </dl>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                {t.workDetail.rwSource}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>
              {t.workDetail.openalexOnly}
            </p>
          )}
        </section>
      )}

      {/* The screen. Only 1,000 of the 4.3M works have this. */}
      {s && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl">{t.workDetail.screenTitle}</h2>
            <Link href={p('/screen')} className="link text-sm">
              {t.workDetail.screenAll}
            </Link>
          </div>

          <div
            className="card mb-3 p-4"
            style={{
              borderColor: s.nIn === 3 ? 'var(--in-scope)' : s.nIn && s.nIn > 0 ? 'var(--contested)' : 'var(--border)',
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              {s.nIn === 3
                ? t.workDetail.consensus3
                : s.nIn === 0
                  ? t.workDetail.consensus0
                  : t.workDetail.consensusN(s.nIn ?? 0)}
            </p>
            <div className="mt-2 text-xs" style={{ color: 'var(--ink-4)' }}>
              {t.workDetail.stratumLine(s.stratum ?? '—', s.weight?.toFixed(2) ?? '—')}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ModelCard
              t={t}
              model="Claude Opus 4.8"
              tier={s.opusTier}
              genre={s.opusGenre}
              aboutCa={s.opusAboutCa}
              confidence={s.opusConfidence}
              reason={s.opusReason}
            />
            <ModelCard
              t={t}
              model="GPT-5.6 (high)"
              tier={s.gptTier}
              genre={s.gptGenre}
              aboutCa={s.gptAboutCa}
              confidence={s.gptConfidence}
              reason={s.gptReason}
            />
            <ModelCard
              t={t}
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
        <h2 className="font-serif text-xl">{t.workDetail.abstractTitle}</h2>
        {abstract ? (
          <>
            <p className="mt-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              {abstract}
            </p>
            <p className="mt-3 text-xs" style={{ color: 'var(--ink-5)' }}>
              {s?.abstract ? t.workDetail.abstractStored : t.workDetail.abstractFetched}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
            {w.hasAbstract ? t.workDetail.abstractUnavailable : t.workDetail.abstractNone}
          </p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">{t.workDetail.recordTitle}</h2>
        <dl className="mt-2">
          <Field label={t.workDetail.venue}>{w.venue}</Field>
          <Field label={t.workDetail.topic}>{w.topic}</Field>
          <Field label={t.workDetail.field}>{w.field}</Field>
          <Field label={t.workDetail.institutions}>
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
          <Field label={t.workDetail.funders}>
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
          <Field label={t.workDetail.keywords}>
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
          <Field label={t.workDetail.hasAbstract}>{w.hasAbstract ? t.common.yes : t.common.no}</Field>
          <Field label={t.workDetail.api}>
            <a className="link font-mono text-xs" href={`/api/v1/works/${w.id}`}>
              /api/v1/works/{w.id}
            </a>
          </Field>
        </dl>
      </section>
    </div>
  )
}

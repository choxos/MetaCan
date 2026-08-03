import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getWork, fetchAbstract } from '@/lib/query'
import { getSummary } from '@/lib/stats'
import { getDict, type Dictionary } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, numberLocale, SITE_URL, type Lang } from '@/lib/lang'
import { localePath } from '@/lib/lang'
import { ScoreBanner } from '@/components/ScoreBanner'
import { CopyPermalink } from '@/components/CopyPermalink'
import { PREDICTION_CATEGORIES } from '@/lib/labels'
import { labelAgreement } from '@/lib/labels'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { lang: string; id: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const w = await getWork(params.id)
  return {
    title: w?.title?.slice(0, 60) ?? getDict(lang).meta.workNotFound,
    alternates: langAlternates(lang, `/works/${params.id}`),
  }
}

const REPO = 'https://github.com/choxos/CaRN-data-challenge'

function Card({
  title,
  meta,
  badge,
  sub,
  children,
  borderColor,
}: {
  title: string
  meta?: string
  badge?: string
  sub?: string
  children: React.ReactNode
  borderColor?: string
}) {
  return (
    <section className="card overflow-hidden" style={borderColor ? { borderColor } : undefined}>
      <div className="border-b px-5 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
              {title}
            </h2>
            {badge && (
              <span className="micro-label" style={{ color: 'var(--contested)' }}>
                {badge}
              </span>
            )}
          </div>
          {meta && <span className="mono-meta shrink-0">{meta}</span>}
        </div>
        {sub && (
          <p className="mt-1 text-xs" style={{ color: 'var(--ink-4)' }}>
            {sub}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function MetaRow({ label, children, emptyLabel }: { label: string; children: React.ReactNode; emptyLabel: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 border-b px-5 py-[11px] text-[13px] last:border-0 sm:grid-cols-[160px_1fr]">
      <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
        {label}
      </span>
      <span className="min-w-0 break-words leading-normal" style={{ color: 'var(--ink-2)' }}>
        {children ?? <span style={{ color: 'var(--ink-5)' }}>{emptyLabel}</span>}
      </span>
    </div>
  )
}

/** A score in [0, 1] as a bar. The number is the datum; the bar only makes two of them comparable at a glance. */
function ScoreBar({
  label,
  value,
  lang,
  color,
  emptyLabel,
}: {
  label: string
  value: number | null
  lang: Lang
  color: string
  emptyLabel: string
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100
  const shown =
    value === null
      ? emptyLabel
      : value.toLocaleString(numberLocale(lang), { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  return (
    <div>
      <div className="mb-[5px] flex items-baseline justify-between gap-2 text-xs">
        <span style={{ color: 'var(--ink-2)' }}>{label}</span>
        <span className="font-mono tabular" style={{ color: 'var(--ink)' }}>
          {shown}
        </span>
      </div>
      <div className="meter">
        <div style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

/** One screening model's verdict. The reason is the point: a tier without a reason is not evidence. */
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
  const cls = isIn ? 'chip chip-teal' : tier === 'T3' ? 'chip chip-amber' : 'chip'
  const label = tier === 'T3' ? t.workDetail.tierAdjacent : tier || 'OUT'
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
          {model}
        </span>
        <span className={cls}>{label}</span>
      </div>
      <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--ink-4)' }}>
        {genre && <div>{t.workDetail.genre(genre)}</div>}
        <div>
          {t.workDetail.aboutCanada}: {aboutCa === null ? t.common.none : aboutCa ? t.common.yes : t.common.no}
        </div>
        <div>
          {t.workDetail.confidence}: {confidence ?? t.common.none}
        </div>
      </div>
      {reason && (
        <p className="mt-3 border-t pt-3 text-[13px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
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
  const n = (x: number) => formatInt(lang, x)
  const dec3 = (x: number) =>
    x.toLocaleString(numberLocale(lang), { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <MetaRow label={label} emptyLabel={t.common.none}>
      {children}
    </MetaRow>
  )

  const w = await getWork(params.id)
  if (!w) notFound()

  // The abstract is NOT in the database, by design: the inverted indexes are
  // 8.6 GB of the frame's 9.3 GB of text and the host has 13 GB free. So it is
  // fetched live, and cached for a day. If OpenAlex is down or the work has none,
  // this is null and the page says so rather than pretending.
  const [abstract, summary] = await Promise.all([
    w.screened?.abstract ? Promise.resolve(w.screened.abstract) : fetchAbstract(w.id),
    getSummary(),
  ])
  const s = w.screened
  const r = w.retraction
  const sc = w.score
  const pr = w.prediction

  const routeRows: Array<{ code: string; chip: string; exp: string }> = []
  if (w.routeCaAff) routeRows.push({ code: 'aff', chip: 'chip chip-route', exp: t.workDetail.expAff })
  if (w.routeCaFund) routeRows.push({ code: 'fund', chip: 'chip chip-route', exp: t.workDetail.expFund })
  if (w.routeCaVenue) routeRows.push({ code: 'venue', chip: 'chip chip-route', exp: t.workDetail.expVenue })
  if (w.routeAboutCa) routeRows.push({ code: 'about', chip: 'chip chip-route', exp: t.workDetail.expAbout })
  if (!w.routeCaAff) routeRows.push({ code: 'no aff', chip: 'chip chip-teal', exp: t.workDetail.expNoAff })

  const chips = (arr: string) =>
    arr
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)

  const agreement =
    w.labels.length > 0
      ? labelAgreement(w.labels.map((l) => ({ categories: l.categories, studyDesign: l.studyDesign })))
      : null
  const agreementLabel =
    agreement === 'agree'
      ? t.workRow.agreementAgree
      : agreement === 'split'
        ? t.workRow.agreementSplit
        : t.workRow.agreementSingle
  const agreementChip = agreement === 'split' ? 'chip chip-amber-bg' : agreement === 'agree' ? 'chip chip-teal' : 'chip'

  // The metaresearch head is the first entry of the category score vectors
  // (PREDICTION_CATEGORIES order, verbatim from the model artifact).
  const metaIdx = PREDICTION_CATEGORIES.indexOf('metaresearch')
  const codexMeta = pr?.categoryScoresCodex[metaIdx] ?? null
  const gemmaMeta = pr?.categoryScoresGemma[metaIdx] ?? null

  // The FINAL classification, for the reader who came to learn what this work
  // IS rather than how the pipeline decided. Direct model labels outrank
  // predictions; consensus predictions outrank candidates; and the status of
  // whatever is shown travels with it, in words, not in a score table. The
  // score tables still exist, collapsed at the end of the page.
  const directCats = Array.from(new Set(w.labels.flatMap((l) => l.categories)))
  const directDesigns = Array.from(new Set(w.labels.map((l) => l.studyDesign).filter((x): x is string => !!x)))
  const directDomains = Array.from(new Set(w.labels.map((l) => l.domain).filter((x): x is string => !!x)))
  const directGenres = Array.from(new Set(w.labels.map((l) => l.genre).filter((x): x is string => !!x)))
  const clsSource: 'direct' | 'consensus' | 'candidate' | null =
    w.labels.length > 0 ? 'direct' : pr ? (pr.consensusCategories.length ? 'consensus' : 'candidate') : null
  const clsCats =
    clsSource === 'direct'
      ? directCats
      : clsSource === 'consensus'
        ? (pr?.consensusCategories ?? [])
        : clsSource === 'candidate'
          ? (pr?.candidateCategories ?? [])
          : []
  const clsDesigns =
    clsSource === 'direct'
      ? directDesigns
      : pr
        ? [pr.studyDesignConsensus ?? pr.studyDesignCandidate].filter((x): x is string => !!x)
        : []
  const clsDomains =
    clsSource === 'direct'
      ? directDomains
      : pr
        ? [pr.domainConsensus ?? pr.domainCandidate].filter((x): x is string => !!x)
        : []
  const clsGenres =
    clsSource === 'direct'
      ? directGenres
      : pr
        ? [pr.genreConsensus ?? pr.genreCandidate].filter((x): x is string => !!x)
        : []

  const exploreRows: Array<{ l: string; s: string; href: string }> = []
  if (w.venue)
    exploreRows.push({ l: t.workDetail.exVenueL, s: w.venue, href: `${p('/cohort')}?venue=${encodeURIComponent(w.venue)}` })
  if (w.topic)
    exploreRows.push({ l: t.workDetail.exTopicL, s: w.topic, href: `${p('/cohort')}?topic=${encodeURIComponent(w.topic)}` })
  const firstCat = w.labels.find((l) => l.categories.length > 0)?.categories[0]
  if (firstCat)
    exploreRows.push({
      l: t.workDetail.exCatL,
      s: t.cohort.categoryNames[firstCat] ?? firstCat,
      href: `${p('/cohort')}?category=${encodeURIComponent(firstCat)}`,
    })
  exploreRows.push({ l: t.workDetail.exFrL, s: n(summary.coverage.french), href: `${p('/cohort')}?lang=fr` })

  return (
    <div>
      {/* Breadcrumb, record line, serif title */}
      <div className="pt-6">
        <Link href={p('/cohort')} className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
          ← {t.workDetail.backCohort}
        </Link>
        <div className="mono-meta mt-4" style={{ letterSpacing: '0.06em' }}>
          <span className="uppercase">
            {t.workDetail.record} {w.id}
          </span>
          {w.doi && (
            <>
              {' · '}
              <a className="link" href={`https://doi.org/${w.doi}`} target="_blank" rel="noreferrer">
                doi:{w.doi}
              </a>
            </>
          )}
        </div>
        <h1
          className="font-serif mt-2.5 max-w-[900px]"
          style={{
            fontSize: 'clamp(26px, 3.2vw, 34px)',
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
            fontWeight: 400,
            textWrap: 'balance',
          }}
        >
          {w.title || t.common.noTitle}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--ink-3)' }}>
          <span className="tabular">{w.year ?? t.common.none}</span>
          {w.type && <span>· {w.type}</span>}
          {w.lang && <span>· {w.lang}</span>}
          <span>
            ·{' '}
            <a className="link" href={`https://openalex.org/${w.id}`} target="_blank" rel="noreferrer">
              {t.workDetail.onOpenAlex(w.id)}
            </a>
          </span>
          {/* The routes, as hoverable chips: the explanation that used to be a
              whole card now rides the tooltip of each chip. */}
          {routeRows.map((rr) => (
            <span key={rr.code} className={rr.chip} title={rr.exp} style={{ cursor: 'help' }}>
              {rr.code}
            </span>
          ))}
        </div>
        {w.authorsFull.length > 0 && (
          <div className="mt-1.5 max-w-[900px] text-[13px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            {w.authorsFull.map((a, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {a.is_ca ? (
                  <span
                    title={t.workRow.caAuthorTitle}
                    style={{
                      color: 'var(--mc)',
                      textDecorationLine: 'underline',
                      textDecorationStyle: 'dotted',
                      textUnderlineOffset: 2,
                    }}
                  >
                    {a.name}
                  </span>
                ) : (
                  a.name
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid items-start gap-8 pt-6 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Retraction: the four-state record, not the boolean. */}
          {(r || w.isRetracted) && (
            <Card title={t.workDetail.postPubTitle} borderColor="var(--retraction)">
              {r ? (
                <>
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
                  <p className="px-5 py-3 text-[13px] leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                    {t.workDetail.rwSource}
                  </p>
                </>
              ) : (
                <p className="px-5 py-3 text-sm" style={{ color: 'var(--ink-3)' }}>
                  {t.workDetail.openalexOnly}
                </p>
              )}
            </Card>
          )}

          {/* Bibliographic record */}
          <Card title={t.workDetail.metaTitle}>
            <Field label={t.workDetail.venue}>{w.venue ? `${w.venue}${w.year ? ` · ${w.year}` : ''}` : null}</Field>
            <Field label={t.filters.type}>{w.type}</Field>
            <Field label={t.filters.language}>{w.lang}</Field>
            <Field label={t.workDetail.field}>{w.field}</Field>
            <Field label={t.workDetail.topic}>{w.topic}</Field>
            <Field label={t.workDetail.institutions}>
              {w.caInstitutions ? (
                <span className="flex flex-wrap gap-1">
                  {chips(w.caInstitutions).map((i, k) => (
                    <span key={k} className="chip" style={{ whiteSpace: 'normal' }}>
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
                    <span key={k} className="chip" style={{ whiteSpace: 'normal' }}>
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
                    <span key={k} className="chip" style={{ whiteSpace: 'normal' }}>
                      {i}
                    </span>
                  ))}
                </span>
              ) : null}
            </Field>
            <Field label="DOI">
              {w.doi ? (
                <a className="link font-mono text-xs" href={`https://doi.org/${w.doi}`} target="_blank" rel="noreferrer">
                  {w.doi}
                </a>
              ) : null}
            </Field>
          </Card>

          {/* Abstract */}
          <Card title={t.workDetail.abstractTitle} meta={s?.abstract ? undefined : t.workDetail.absSrc}>
            {abstract ? (
              <>
                <p className="px-5 pt-4 text-[15px] leading-[1.8]" style={{ color: 'var(--ink-2)', textWrap: 'pretty' }}>
                  {abstract}
                </p>
                <p className="px-5 pb-4 pt-3 text-xs" style={{ color: 'var(--ink-5)' }}>
                  {s?.abstract ? t.workDetail.abstractStored : t.workDetail.abstractFetched}
                </p>
              </>
            ) : w.hasAbstract ? (
              <p className="px-5 py-4 text-sm leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                {t.workDetail.abstractUnavailable}
              </p>
            ) : (
              <>
                <div className="callout-amber mx-5 my-4">{t.workDetail.absNoneShort}</div>
                <p className="px-5 pb-4 text-xs leading-relaxed" style={{ color: 'var(--ink-5)' }}>
                  {t.workDetail.abstractNone}
                </p>
              </>
            )}
          </Card>

          {/* THE MACHINERY, collapsed. Everything below existed on the open
              page before and lost none of its honesty by folding: the general
              reader cares what the work IS; the professional expands this to
              audit how the classification was reached. */}
          {(s || w.labels.length > 0 || pr || sc) && (
            <details className="card overflow-hidden">
              <summary
                className="flex cursor-pointer items-baseline justify-between gap-3 px-5 py-3.5"
                style={{ listStyle: 'none' }}
              >
                <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                  {t.workDetail.methodsTitle}
                </span>
                <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                  {t.workDetail.methodsToggle}
                </span>
              </summary>
              <div className="flex flex-col gap-6 border-t px-4 py-4">

          {/* The screen. Only the screened sample has this. */}
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
                  borderColor:
                    s.nIn === 3 ? 'var(--in-scope)' : s.nIn && s.nIn > 0 ? 'var(--contested)' : 'var(--border)',
                }}
              >
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {s.nIn === 3
                    ? t.workDetail.consensus3
                    : s.nIn === 0
                      ? t.workDetail.consensus0
                      : t.workDetail.consensusN(s.nIn ?? 0)}
                </p>
                <div className="mono-meta mt-2">
                  {t.workDetail.stratumLine(s.stratum ?? t.common.none, s.weight?.toFixed(2) ?? t.common.none)}
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

          {/* Direct machine labels, per model, disagreement visible. Their
              ABSENCE renders nothing at all here: on a detail page silence is
              honest, whereas the cohort list annotates absence explicitly. */}
          {w.labels.length > 0 && (
            <Card title={t.workDetail.labelsTitle} sub={t.workDetail.labelsSub}>
              <div className="scroll-x">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead>
                    <tr className="border-b" style={{ background: 'var(--surface-2)' }}>
                      {[t.workDetail.colModel, t.workDetail.colCats, t.workDetail.colDesign, t.workDetail.colConf].map(
                        (h) => (
                          <th key={h} className="micro-label px-5 py-2.5 text-left font-medium">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {w.labels.map((l) => (
                      <tr key={l.model} className="border-b align-top last:border-0">
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--ink-2)' }}>
                          {l.model}
                        </td>
                        <td className="px-5 py-3">
                          <span className="flex flex-wrap gap-[5px]">
                            {l.categories.length ? (
                              l.categories.map((c) => (
                                <span key={c} className="chip chip-cat">
                                  {t.cohort.categoryNames[c] ?? c}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--ink-5)' }}>{t.workRow.labelNoCats}</span>
                            )}
                          </span>
                          <div className="mt-1.5 text-xs" style={{ color: 'var(--ink-4)' }}>
                            {t.workDetail.labelDomain}:{' '}
                            {l.domain ? (t.cohort.domainNames[l.domain] ?? l.domain) : t.common.none} ·{' '}
                            {t.workDetail.labelGenre}:{' '}
                            {l.genre ? (t.cohort.genreNames[l.genre] ?? l.genre) : t.common.none}
                            <br />
                            {t.workDetail.labelAboutSystem}:{' '}
                            {l.aboutCaSystem === null ? t.common.none : l.aboutCaSystem ? t.common.yes : t.common.no} ·{' '}
                            {t.workDetail.labelAboutTopic}:{' '}
                            {l.aboutCaTopic === null ? t.common.none : l.aboutCaTopic ? t.common.yes : t.common.no}
                          </div>
                        </td>
                        <td className="px-5 py-3" style={{ color: 'var(--ink-3)' }}>
                          {l.studyDesign ? (t.cohort.designNames[l.studyDesign] ?? l.studyDesign) : t.common.none}
                        </td>
                        <td className="px-5 py-3" style={{ color: 'var(--ink-3)' }}>
                          {l.confidence ?? t.common.none}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 px-5 py-3" style={{ background: 'var(--surface-2)' }}>
                <span className={agreementChip}>{agreementLabel}</span>
                <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                  {t.workDetail.agreeNote}
                </span>
              </div>
            </Card>
          )}

          {/* Prediction signals: machine_predicted_unvalidated, and it says so. */}
          {pr && (
            <Card
              title={t.workDetail.predictionTitle}
              badge={t.workDetail.predBadge}
              sub={`${t.workDetail.predNote} ${t.workDetail.predictionSub}`}
              borderColor="var(--amber-border)"
            >
              <div className="flex flex-col gap-3 px-5 py-4">
                <ScoreBar
                  label={t.workDetail.predScore('Codex')}
                  value={codexMeta}
                  lang={lang}
                  color="var(--teal)"
                  emptyLabel={t.common.none}
                />
                <ScoreBar
                  label={t.workDetail.predScore('Gemma')}
                  value={gemmaMeta}
                  lang={lang}
                  color="var(--teal)"
                  emptyLabel={t.common.none}
                />
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--ink-3)' }}>
                  <span>
                    {t.workDetail.predVersion}:{' '}
                    <span className="font-mono" style={{ color: 'var(--ink-2)' }}>
                      {pr.modelVersion}
                    </span>
                  </span>
                  <span>
                    {t.workDetail.validationStatus}:{' '}
                    <span className="font-mono" style={{ color: 'var(--contested)' }}>
                      {pr.predictionStatus}
                    </span>
                  </span>
                </div>
              </div>
              <Field label={t.workDetail.predictionCandidate}>
                {pr.candidateCategories.length
                  ? pr.candidateCategories.map((c) => t.cohort.categoryNames[c] ?? c).join(', ')
                  : t.workRow.predictionNone}
              </Field>
              <Field label={t.workDetail.predictionConsensus}>
                {pr.consensusCategories.length
                  ? pr.consensusCategories.map((c) => t.cohort.categoryNames[c] ?? c).join(', ')
                  : t.workRow.predictionNone}
              </Field>
              <Field label={t.workDetail.labelDomain}>
                {`${t.workDetail.predictionCandidateValue}: ${
                  pr.domainCandidate ? (t.cohort.domainNames[pr.domainCandidate] ?? pr.domainCandidate) : t.workRow.predictionNone
                } · ${t.workDetail.predictionConsensusValue}: ${
                  pr.domainConsensus ? (t.cohort.domainNames[pr.domainConsensus] ?? pr.domainConsensus) : t.workRow.predictionNone
                }`}
              </Field>
              <Field label={t.workDetail.labelDesign}>
                {`${t.workDetail.predictionCandidateValue}: ${
                  t.cohort.designNames[pr.studyDesignCandidate] ?? pr.studyDesignCandidate
                } · ${t.workDetail.predictionConsensusValue}: ${
                  pr.studyDesignConsensus
                    ? (t.cohort.designNames[pr.studyDesignConsensus] ?? pr.studyDesignConsensus)
                    : t.workRow.predictionNone
                }`}
              </Field>
              <Field label={t.workDetail.labelGenre}>
                {`${t.workDetail.predictionCandidateValue}: ${
                  t.cohort.genreNames[pr.genreCandidate] ?? pr.genreCandidate
                } · ${t.workDetail.predictionConsensusValue}: ${
                  pr.genreConsensus ? (t.cohort.genreNames[pr.genreConsensus] ?? pr.genreConsensus) : t.workRow.predictionNone
                }`}
              </Field>
              <Field label={t.workDetail.predictionDisagreement}>{dec3(pr.teacherDisagreementScore)}</Field>
              <Field label={t.workDetail.predictionUncertainty}>{dec3(pr.thresholdUncertaintyScore)}</Field>
              <div className="px-5 py-4">
                <h3 className="text-[13px] font-semibold">{t.workDetail.predictionTeacherScores}</h3>
                <div className="scroll-x mt-2">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="micro-label border-b text-left">
                        <th className="py-2 pr-3 font-medium">{t.cohort.category}</th>
                        <th className="py-2 pr-3 font-medium">Codex</th>
                        <th className="py-2 font-medium">Gemma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PREDICTION_CATEGORIES.map((category, index) => (
                        <tr key={category} className="border-b last:border-0">
                          <td className="py-2 pr-3">{t.cohort.categoryNames[category] ?? category}</td>
                          <td className="tabular font-mono py-2 pr-3 text-xs">
                            {pr.categoryScoresCodex[index] !== undefined
                              ? dec3(pr.categoryScoresCodex[index]!)
                              : t.workRow.predictionNone}
                          </td>
                          <td className="tabular font-mono py-2 text-xs">
                            {pr.categoryScoresGemma[index] !== undefined
                              ? dec3(pr.categoryScoresGemma[index]!)
                              : t.workRow.predictionNone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* The machine scores: a PROVISIONAL baseline from an immature model. The
              banner is not decoration; it is the contract under which these numbers
              may be shown at all. See ScoreBanner and pilot/results/maturity.json. */}
          {sc && (
            <Card title={t.workDetail.scoresTitle} sub={t.workDetail.scoresSub} borderColor="var(--amber-border)">
              <div className="px-5 pt-4">
                <ScoreBanner t={t} />
              </div>
              <div className="flex flex-col gap-4 px-5 py-4">
                <ScoreBar
                  label={t.workDetail.scoreOpus}
                  value={sc.scoreOpus}
                  lang={lang}
                  color="var(--mc)"
                  emptyLabel={t.common.none}
                />
                <ScoreBar
                  label={t.workDetail.scoreGpt}
                  value={sc.scoreGpt}
                  lang={lang}
                  color="var(--teal)"
                  emptyLabel={t.common.none}
                />
              </div>
              <Field label={t.workDetail.scoreSpread}>
                {sc.scoreSpread === null ? null : (
                  <>
                    <span className="tabular" style={{ color: 'var(--contested)' }}>
                      {dec3(sc.scoreSpread)}
                    </span>{' '}
                    <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                      · {t.workDetail.scoreSpreadNote}
                    </span>
                  </>
                )}
              </Field>
              <Field label={t.workDetail.validationStatus}>
                {sc.validationStatus === null ? null : (
                  <>
                    <code className="font-mono text-xs">{sc.validationStatus}</code>{' '}
                    <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                      · {t.workDetail.validationStatusNote}
                    </span>
                  </>
                )}
              </Field>
            </Card>
          )}
              </div>
            </details>
          )}
        </div>

        {/* Right rail: classification first, then quick stats, actions,
            explore. Sticky on desktop. */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-[76px]">
          {/* THE CLASSIFICATION. What most readers came for: the categories,
              in words, with their status in words. The machinery that produced
              them lives in the collapsed section at the end of the page. */}
          <Card
            title={t.workDetail.clsTitle}
            badge={clsSource ? t.workDetail.clsBadge : undefined}
            sub={
              clsSource === 'direct'
                ? t.workDetail.clsSubDirect(w.labels.length)
                : clsSource === 'consensus'
                  ? t.workDetail.clsSubConsensus
                  : clsSource === 'candidate'
                    ? t.workDetail.clsSubCandidate
                    : undefined
            }
          >
            {clsSource ? (
              <>
                <div className="px-5 pb-1 pt-4">
                  <span className="flex flex-wrap gap-1.5">
                    {clsCats.length ? (
                      clsCats.map((c) => (
                        <Link
                          key={c}
                          href={`${p('/cohort')}?category=${encodeURIComponent(c)}`}
                          className="chip chip-cat"
                          style={{ fontSize: 13, padding: '5px 11px' }}
                        >
                          {t.cohort.categoryNames[c] ?? c}
                        </Link>
                      ))
                    ) : (
                      <span className="text-[13px]" style={{ color: 'var(--ink-4)' }}>
                        {t.workDetail.clsNoCats}
                      </span>
                    )}
                  </span>
                  {clsSource === 'direct' && agreement === 'split' && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--contested)' }}>
                      {t.workDetail.clsSplitNote}
                    </p>
                  )}
                </div>
                <div className="mt-3">
                  <Field label={t.cohort.design}>
                    {clsDesigns.length
                      ? clsDesigns.map((d) => t.cohort.designNames[d] ?? d).join(' · ')
                      : null}
                  </Field>
                  <Field label={t.workDetail.labelDomain}>
                    {clsDomains.length
                      ? clsDomains.map((d) => t.cohort.domainNames[d] ?? d).join(' · ')
                      : null}
                  </Field>
                  <Field label={t.workDetail.labelGenre}>
                    {clsGenres.length
                      ? clsGenres.map((g) => t.cohort.genreNames[g] ?? g).join(' · ')
                      : null}
                  </Field>
                </div>
                <p className="px-5 py-3 text-xs leading-relaxed" style={{ color: 'var(--ink-5)' }}>
                  {t.workDetail.clsMethodsHint}
                </p>
              </>
            ) : (
              <p className="px-5 py-4 text-[13px] leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                {t.workDetail.clsNone}
              </p>
            )}
          </Card>

          <Card title={t.workDetail.quickStats}>
            {[
              { l: t.workDetail.qsCites, v: n(w.citedBy) },
              { l: t.workDetail.qsYear, v: w.year !== null ? String(w.year) : t.common.none },
              { l: t.workDetail.qsRoutes, v: String(routeRows.filter((x) => x.code !== 'no aff').length) },
              { l: t.workDetail.qsAbstract, v: w.hasAbstract ? t.common.yes : t.common.no },
            ].map((qr) => (
              <div key={qr.l} className="flex items-baseline justify-between border-b px-5 py-2.5 last:border-0">
                <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                  {qr.l}
                </span>
                <span className="font-mono tabular text-[13px]" style={{ color: 'var(--ink)' }}>
                  {qr.v}
                </span>
              </div>
            ))}
          </Card>

          <div className="card flex flex-col gap-2 p-5">
            <a className="btn btn-primary" href={`/api/v1/works/${w.id}`}>
              {t.workDetail.actJson}
            </a>
            <CopyPermalink
              url={`${SITE_URL}${p(`/works/${w.id}`)}`}
              label={t.workDetail.actPerma}
              copiedLabel={t.workDetail.actPermaCopied}
            />
            <a
              className="pt-1 text-center text-xs"
              style={{ color: 'var(--ink-4)' }}
              href={`${REPO}/issues/new?title=${encodeURIComponent(`Record ${w.id}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              {t.workDetail.actReport}
            </a>
          </div>

          <Card title={t.workDetail.explore}>
            {exploreRows.map((er) => (
              <Link
                key={er.l}
                href={er.href}
                className="row-hover flex w-full items-center gap-2.5 border-b px-5 py-[11px] text-left last:border-0"
                style={{ color: 'inherit' }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                    {er.l}
                  </span>
                  <span className="mt-px block truncate text-[11px]" style={{ color: 'var(--ink-4)' }}>
                    {er.s}
                  </span>
                </span>
                <span style={{ color: 'var(--ink-4)' }}>→</span>
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

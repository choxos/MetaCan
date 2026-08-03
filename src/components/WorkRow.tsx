import Link from 'next/link'
import { getDict, type Dictionary } from '@/lib/i18n'
import { formatInt, localePath, type Lang } from '@/lib/lang'
import { labelAgreement } from '@/lib/labels'

/**
 * One work in a results list, per the design: a chip row first (the ROUTES
 * that admitted the work, because "why is this here?" is the question this
 * frame exists to answer), then the serif title, then the metadata line, with
 * the citation count in serif numerals on the right. Rows are meant to sit
 * inside a `.card` container and divide with border-b.
 *
 * The short chip texts (aff, fund, venue, about, no aff) are deliberately NOT
 * translated: they are the same tokens the API and the route filters use, so
 * they read as code in both languages. Their title attributes carry the
 * explanation in the reader's language.
 */

export interface WorkRowData {
  id: string
  title: string
  doi?: string | null
  year: number | null
  lang: string | null
  type: string | null
  venue: string | null
  field: string | null
  citedBy: number
  isRetracted?: boolean
  hasAbstract: boolean
  routeCaAff: boolean
  routeCaFund: boolean
  routeCaVenue: boolean
  routeAboutCa: boolean
  retraction?: { nature: string | null; openalexFlagged: boolean } | null
  screened?: { nIn: number | null } | null
  /**
   * Machine labels, when the caller hydrated them. `undefined` = the caller
   * did not ask, so show nothing. `[]` = the caller asked and the work is
   * UNLABELED, which is shown as exactly that, never as a negative.
   */
  labels?: Array<{
    model: string
    categories: string[]
    studyDesign: string | null
    confidence?: string | null
  }>
  /**
   * Byline from the author layer, when the caller hydrated it. `undefined` =
   * not asked for; `[]` = the release records no disambiguated authorships
   * for this work, which is shown as nothing rather than invented.
   */
  authors?: Array<{ name: string; is_ca: boolean }>
  prediction?: {
    modelVersion: string
    candidateCategories: string[]
    consensusCategories: string[]
    teacherDisagreementScore: number
    thresholdUncertaintyScore: number
    predictionStatus: string
  } | null
}

const ROUTE_DEFS = [
  { key: 'routeCaAff', short: 'aff', title: (t: Dictionary) => t.workRow.routeAffTitle },
  { key: 'routeCaFund', short: 'fund', title: (t: Dictionary) => t.workRow.routeFundTitle },
  { key: 'routeCaVenue', short: 'venue', title: (t: Dictionary) => t.workRow.routeVenueTitle },
  { key: 'routeAboutCa', short: 'about', title: (t: Dictionary) => t.workRow.routeAboutTitle },
] as const

export function RouteChips({ w, t }: { w: WorkRowData; t: Dictionary }) {
  const hit = ROUTE_DEFS.filter((r) => w[r.key])
  return (
    <>
      {hit.map((r) => (
        <span key={r.short} className="chip chip-route" title={r.title(t)}>
          {r.short}
        </span>
      ))}
      {/* The frame's whole argument: an affiliation-only frame never sees this work. */}
      {!w.routeCaAff && (
        <span className="chip chip-teal" title={t.workRow.noAffTitle}>
          no&nbsp;aff
        </span>
      )}
    </>
  )
}

function ConsensusChip({ nIn, t }: { nIn: number; t: Dictionary }) {
  if (nIn === 0) return null
  const cls = nIn === 3 ? 'chip chip-teal' : 'chip chip-amber'
  const label = nIn === 3 ? t.workRow.consensusAll : t.workRow.consensusN(nIn)
  const title = nIn === 3 ? t.workRow.consensusAllTitle : t.workRow.consensusNTitle(nIn)
  return (
    <span className={cls} title={title}>
      {label}
    </span>
  )
}

/**
 * Label provenance, on every cohort row: which models labeled the work, what
 * they said (in the tooltip), whether they agree, at what confidence. The
 * chips identify direct model labels as unvalidated in their titles because
 * the framing is part of the data. An empty label set renders as "unlabeled"
 * with the sparsity explained, never as silence a reader could mistake for a
 * negative.
 */
function LabelChips({ labels, t }: { labels: NonNullable<WorkRowData['labels']>; t: Dictionary }) {
  if (labels.length === 0) {
    return (
      <span className="text-xs" title={t.workRow.unlabelledTitle} style={{ color: 'var(--ink-5)' }}>
        {t.workRow.unlabeled}
      </span>
    )
  }

  const agreement = labelAgreement(labels.map((l) => ({ categories: l.categories, studyDesign: l.studyDesign })))
  const agreementLabel =
    agreement === 'agree'
      ? t.workRow.agreementAgree
      : agreement === 'split'
        ? t.workRow.agreementSplit
        : t.workRow.agreementSingle
  const agreementTitle =
    agreement === 'agree'
      ? t.workRow.agreementAgreeTitle
      : agreement === 'split'
        ? t.workRow.agreementSplitTitle
        : t.workRow.agreementSingleTitle

  return (
    <>
      {labels.map((l) => (
        <span
          key={l.model}
          className="chip chip-cat"
          title={t.workRow.labelChipTitle(
            l.model,
            l.categories.join(', '),
            l.studyDesign ?? '',
            l.confidence ?? '',
          )}
        >
          {l.model}
          {l.categories.length > 0 ? ` · ${l.categories.join('+')}` : ` · ${t.workRow.labelNoCats}`}
        </span>
      ))}
      <span className={agreement === 'split' ? 'chip chip-amber-bg' : 'chip chip-teal'} title={agreementTitle}>
        {agreementLabel}
      </span>
    </>
  )
}

function PredictionChips({
  prediction,
  t,
}: {
  prediction: NonNullable<WorkRowData['prediction']>
  t: Dictionary
}) {
  const candidate = prediction.candidateCategories.join('+') || t.workRow.predictionNone
  const consensus = prediction.consensusCategories.join('+') || t.workRow.predictionNone
  const title = t.workRow.predictionTitle(
    prediction.modelVersion,
    prediction.teacherDisagreementScore.toFixed(3),
    prediction.thresholdUncertaintyScore.toFixed(3),
    prediction.predictionStatus,
  )
  return (
    <span className="inline-flex flex-wrap items-center gap-1" title={title}>
      <span className="text-xs" style={{ color: 'var(--ink-5)' }}>
        {t.workRow.predictionPrefix}:
      </span>
      <span className="chip chip-amber">
        {t.workRow.predictionCandidate} · {candidate}
      </span>
      <span className="chip">
        {t.workRow.predictionConsensus} · {consensus}
      </span>
    </span>
  )
}

function RetractionChip({ w, t }: { w: WorkRowData; t: Dictionary }) {
  const r = w.retraction
  if (!r && !w.isRetracted) return null

  // The four-state space. OpenAlex's boolean can hold exactly one of these.
  // The nature string is Retraction Watch's own data and stays verbatim.
  const nature = r?.nature ?? 'Retraction'
  const color = nature.toLowerCase().includes('concern')
    ? 'var(--concern)'
    : nature.toLowerCase().includes('correction')
      ? 'var(--correction)'
      : nature.toLowerCase().includes('reinstat')
        ? 'var(--reinstatement)'
        : 'var(--retraction)'

  const missed = r && !r.openalexFlagged
  return (
    <span
      className="chip"
      title={missed ? t.workRow.retractionMissedTitle(nature) : nature}
      style={{ borderColor: color, color }}
    >
      {nature}
      {missed ? t.workRow.retractionMissedSuffix : ''}
    </span>
  )
}

export function WorkRow({ w, lang }: { w: WorkRowData; lang: Lang }) {
  const t = getDict(lang)
  return (
    <article className="row-hover border-b px-5 py-4 last:border-0">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-[7px] flex flex-wrap items-center gap-[5px]">
            <RouteChips w={w} t={t} />
            {!w.hasAbstract && (
              <span className="chip chip-amber" title={t.workRow.noAbstractTitle}>
                {t.workRow.noAbstractChip}
              </span>
            )}
            <RetractionChip w={w} t={t} />
            {w.screened?.nIn != null && <ConsensusChip nIn={w.screened.nIn} t={t} />}
            {w.labels !== undefined && <LabelChips labels={w.labels} t={t} />}
          </div>

          <Link
            href={localePath(lang, `/works/${w.id}`)}
            className="font-serif block hover:underline"
            style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.3, color: 'var(--ink)' }}
          >
            {w.title || <span style={{ color: 'var(--ink-4)' }}>{t.common.noTitle}</span>}
          </Link>

          {w.authors !== undefined && w.authors.length > 0 && (
            <div className="mt-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
              {w.authors.slice(0, 6).map((a, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  {a.is_ca ? (
                    <span
                      title={t.workRow.caAuthorTitle}
                      style={{ color: 'var(--mc)', textDecorationLine: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
                    >
                      {a.name}
                    </span>
                  ) : (
                    a.name
                  )}
                </span>
              ))}
              {w.authors.length > 6 && (
                <span style={{ color: 'var(--ink-4)' }}> {t.workRow.moreAuthors(w.authors.length - 6)}</span>
              )}
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
            {w.year !== null && <span className="tabular">{w.year}</span>}
            {w.type && <span>· {w.type}</span>}
            {w.lang && <span>· {w.lang}</span>}
            {w.venue && (
              <em className="truncate" style={{ maxWidth: '38ch' }} title={w.venue}>
                · {w.venue}
              </em>
            )}
            {w.field && <span>· {w.field}</span>}
          </div>

          {w.prediction && (
            <div className="mt-1.5">
              <PredictionChips prediction={w.prediction} t={t} />
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="font-serif tabular" style={{ fontSize: 20, color: 'var(--ink)' }}>
            {formatInt(lang, w.citedBy)}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
            {t.common.citations}
          </div>
        </div>
      </div>
    </article>
  )
}

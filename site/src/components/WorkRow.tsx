import Link from 'next/link'
import { getDict, type Dictionary } from '@/lib/i18n'
import { formatInt, localePath, type Lang } from '@/lib/lang'

/**
 * One work in the browse list.
 *
 * The row leads with the ROUTES that admitted the work, not with the metadata,
 * because "why is this here?" is the question this frame exists to answer. A row
 * that showed only title and year would be a search result; this is a provenance
 * record.
 *
 * The short chip texts (aff, fund, venue, about, no aff) are deliberately NOT
 * translated: they are the same tokens the API and the ?route= filter use, so
 * they read as code in both languages. Their title attributes carry the
 * explanation in the reader's language.
 */

export interface WorkRowData {
  id: string
  title: string
  doi: string | null
  year: number | null
  lang: string | null
  type: string | null
  venue: string | null
  field: string | null
  citedBy: number
  isRetracted: boolean
  hasAbstract: boolean
  routeCaAff: boolean
  routeCaFund: boolean
  routeCaVenue: boolean
  routeAboutCa: boolean
  retraction?: { nature: string | null; openalexFlagged: boolean } | null
  screened?: { nIn: number | null } | null
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
    <span className="inline-flex flex-wrap gap-1">
      {hit.map((r) => (
        <span
          key={r.short}
          className="chip"
          title={r.title(t)}
          style={{ borderColor: 'var(--mc)', color: 'var(--mc)', background: 'transparent' }}
        >
          {r.short}
        </span>
      ))}
      {/* The frame's whole argument: an affiliation-only frame never sees this work. */}
      {!w.routeCaAff && (
        <span
          className="chip"
          title={t.workRow.noAffTitle}
          style={{ borderColor: 'var(--mc-accent)', color: 'var(--mc-accent)', background: 'transparent' }}
        >
          no&nbsp;aff
        </span>
      )}
    </span>
  )
}

/** The screen's consensus, when the work happens to be one of the 1,000 screened. */
function ConsensusChip({ nIn, t }: { nIn: number; t: Dictionary }) {
  if (nIn === 0) return null
  const color = nIn === 3 ? 'var(--in-scope)' : 'var(--contested)'
  const label = nIn === 3 ? t.workRow.consensusAll : t.workRow.consensusN(nIn)
  const title = nIn === 3 ? t.workRow.consensusAllTitle : t.workRow.consensusNTitle(nIn)
  return (
    <span className="chip" title={title} style={{ borderColor: color, color, background: 'transparent' }}>
      {label}
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
      style={{ borderColor: color, color, background: 'transparent' }}
    >
      {nature}
      {missed ? t.workRow.retractionMissedSuffix : ''}
    </span>
  )
}

export function WorkRow({ w, lang }: { w: WorkRowData; lang: Lang }) {
  const t = getDict(lang)
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href={localePath(lang, `/works/${w.id}`)} className="font-medium leading-snug hover:underline">
            {w.title || <span style={{ color: 'var(--ink-4)' }}>{t.common.noTitle}</span>}
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: 'var(--ink-4)' }}>
            {w.year !== null && <span className="tabular">{w.year}</span>}
            {w.type && <span>· {w.type}</span>}
            {w.lang && <span>· {w.lang}</span>}
            {w.venue && (
              <span className="truncate" style={{ maxWidth: '38ch' }} title={w.venue}>
                · {w.venue}
              </span>
            )}
            {w.field && <span>· {w.field}</span>}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <RouteChips w={w} t={t} />
            {!w.hasAbstract && (
              <span
                className="chip"
                title={t.workRow.noAbstractTitle}
                style={{ borderColor: 'var(--contested)', color: 'var(--contested)', background: 'transparent' }}
              >
                {t.workRow.noAbstractChip}
              </span>
            )}
            <RetractionChip w={w} t={t} />
            {w.screened?.nIn != null && <ConsensusChip nIn={w.screened.nIn} t={t} />}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="tabular text-lg font-semibold">{formatInt(lang, w.citedBy)}</div>
          <div className="text-xs" style={{ color: 'var(--ink-5)' }}>
            {t.common.citations}
          </div>
        </div>
      </div>
    </article>
  )
}

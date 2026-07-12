import Link from 'next/link'

/**
 * One work in the browse list.
 *
 * The row leads with the ROUTES that admitted the work, not with the metadata,
 * because "why is this here?" is the question this frame exists to answer. A row
 * that showed only title and year would be a search result; this is a provenance
 * record.
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
  { key: 'routeCaAff', short: 'aff', title: 'Admitted by a Canadian affiliation' },
  { key: 'routeCaFund', short: 'fund', title: 'Admitted by a Canadian funder' },
  { key: 'routeCaVenue', short: 'venue', title: 'Admitted by a Canadian venue' },
  { key: 'routeAboutCa', short: 'about', title: 'Admitted by being about Canada' },
] as const

export function RouteChips({ w }: { w: WorkRowData }) {
  const hit = ROUTE_DEFS.filter((r) => w[r.key])
  return (
    <span className="inline-flex flex-wrap gap-1">
      {hit.map((r) => (
        <span
          key={r.short}
          className="chip"
          title={r.title}
          style={{ borderColor: 'var(--mc)', color: 'var(--mc)', background: 'transparent' }}
        >
          {r.short}
        </span>
      ))}
      {/* The frame's whole argument: an affiliation-only frame never sees this work. */}
      {!w.routeCaAff && (
        <span
          className="chip"
          title="No Canadian affiliation. An affiliation-only frame would never have seen this work."
          style={{ borderColor: 'var(--mc-accent)', color: 'var(--mc-accent)', background: 'transparent' }}
        >
          no&nbsp;aff
        </span>
      )}
    </span>
  )
}

/** The screen's consensus, when the work happens to be one of the 1,000 screened. */
function ConsensusChip({ nIn }: { nIn: number }) {
  if (nIn === 0) return null
  const color =
    nIn === 3 ? 'var(--in-scope)' : 'var(--contested)'
  const label = nIn === 3 ? '3/3 metaresearch' : `${nIn}/3 metaresearch`
  const title =
    nIn === 3
      ? 'All three models called this metaresearch.'
      : `Only ${nIn} of 3 models called this metaresearch: a contested work, on the field's empirical boundary.`
  return (
    <span className="chip" title={title} style={{ borderColor: color, color, background: 'transparent' }}>
      {label}
    </span>
  )
}

function RetractionChip({ w }: { w: WorkRowData }) {
  const r = w.retraction
  if (!r && !w.isRetracted) return null

  // The four-state space. OpenAlex's boolean can hold exactly one of these.
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
      title={missed ? `${nature} — recorded by Retraction Watch, NOT flagged by OpenAlex.` : nature}
      style={{ borderColor: color, color, background: 'transparent' }}
    >
      {nature}
      {missed ? ' · OpenAlex missed it' : ''}
    </span>
  )
}

export function WorkRow({ w }: { w: WorkRowData }) {
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href={`/works/${w.id}`} className="font-medium leading-snug hover:underline">
            {w.title || <span style={{ color: 'var(--ink-4)' }}>[no title]</span>}
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
            <RouteChips w={w} />
            {!w.hasAbstract && (
              <span
                className="chip"
                title="No abstract in OpenAlex. The screen finds half as much metaresearch in this stratum, so this is a measured bias, not a missing field."
                style={{ borderColor: 'var(--contested)', color: 'var(--contested)', background: 'transparent' }}
              >
                no abstract
              </span>
            )}
            <RetractionChip w={w} />
            {w.screened?.nIn != null && <ConsensusChip nIn={w.screened.nIn} />}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="tabular text-lg font-semibold">{w.citedBy.toLocaleString('en-CA')}</div>
          <div className="text-xs" style={{ color: 'var(--ink-5)' }}>
            citations
          </div>
        </div>
      </div>
    </article>
  )
}

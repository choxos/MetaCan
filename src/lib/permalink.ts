import { createHash } from 'crypto'
import { prisma } from '@/lib/db'
import type { WorkFilters } from '@/lib/query'

/**
 * Citable cohort queries.
 *
 * A cohort is DEFINED by its filters, not by its page number or sort order, so
 * the canonical form drops pagination and presentation and keeps only the keys
 * that change membership. Two researchers who build the same cohort in a
 * different filter order, or read it sorted differently, get the SAME hash;
 * that is what makes /q/<hash> citable rather than merely shareable.
 *
 * The permalink row stores the filters, never the results. The frame is a
 * pinned snapshot, so re-running the query is the honest way to reproduce the
 * counts, and the /q page recomputes them live on every view.
 */

/** What the frame actually is, stated wherever a cohort is cited. */
export const SNAPSHOT = {
  /** The pinned OpenAlex release the frame was built from (R/snapshot.R). */
  release: '2026-06-24',
  /** When the frame itself was built (data/frame/frame_summary.json). */
  built: '2026-07-12',
} as const

/**
 * The author layer's version: the OpenAlex release it was harvested from
 * (data/authors/authors_manifest.json). Today that is the frame's OWN pinned
 * release, so the layer shares the snapshot's semantics; the version is
 * stamped anyway because a future re-harvest against a newer release would
 * change author-filtered cohorts, and it must mint NEW hashes for them
 * instead of silently changing what an old /q/<hash> counts. Cohorts without
 * author filters are untouched by design; their hashes must not change
 * because a layer they never read was refreshed.
 */
export const AUTHOR_LAYER = { release: '2026-06-26' } as const

/** The keys that define cohort membership, in canonical order. */
const COHORT_KEYS = [
  'q',
  'author',
  'author_id',
  'year_from',
  'year_to',
  'lang',
  'type',
  'field',
  'topic',
  'venue',
  'route',
  'route_aff',
  'route_fund',
  'route_venue',
  'route_about',
  'retracted',
  'no_abstract',
  'abstract',
  'n_in',
  'category',
  'design',
  'agreement',
  'label_source',
  'prediction_mode',
  'labeled',
  'cited_min',
] as const

type CohortKey = (typeof COHORT_KEYS)[number]

export type CanonicalFilters = Partial<Record<CohortKey, string | number | boolean>> & {
  /** Stamped, never parsed: the AUTHOR_LAYER version an author cohort was minted against. */
  author_layer?: string
}

export function canonicalFilters(f: WorkFilters): CanonicalFilters {
  const out: CanonicalFilters = {}
  for (const k of COHORT_KEYS) {
    const v = f[k]
    if (v === undefined || v === '') continue
    out[k] = v as string | number | boolean
  }
  // Author-filtered cohorts read the author layer, so their canonical form
  // (and therefore their hash) carries its version. NOT a COHORT_KEY: it is
  // stamped by the server, never parsed from a URL, and must not appear in
  // the query strings handed to the API and export.
  if (out.author || out.author_id) out.author_layer = AUTHOR_LAYER.release
  // `agreement` only means something next to a label facet; alone it does not
  // change membership and must not mint a distinct hash for the same cohort.
  if (!out.category && !out.design) {
    delete out.agreement
    delete out.label_source
    delete out.prediction_mode
  }
  if (out.label_source !== 'predicted') delete out.prediction_mode
  if (out.label_source === 'predicted') delete out.agreement
  return out
}

/** The canonical string is the JSON of the sorted canonical object. */
function canonicalString(c: CanonicalFilters): string {
  const sorted = Object.fromEntries(Object.entries(c).sort(([a], [b]) => (a < b ? -1 : 1)))
  return JSON.stringify(sorted)
}

export function hashFilters(f: WorkFilters): string {
  return createHash('sha256').update(canonicalString(canonicalFilters(f))).digest('hex').slice(0, 12)
}

/** The canonical filters as a query string, for builder and API links. */
export function filtersToQuery(c: CanonicalFilters): string {
  const p = new URLSearchParams()
  for (const k of COHORT_KEYS) {
    const v = c[k]
    if (v === undefined || v === '') continue
    p.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  return p.toString()
}

/** Create (or re-affirm) the permalink for a filter state. Idempotent. */
export async function savePermalink(f: WorkFilters): Promise<{ hash: string; filters: CanonicalFilters }> {
  const filters = canonicalFilters(f)
  const hash = hashFilters(f)
  await prisma.queryPermalink.upsert({
    where: { hash },
    create: { hash, filters },
    // The hash is a function of the filters, so an existing row already holds
    // exactly this object; there is nothing to update.
    update: {},
  })
  return { hash, filters }
}

export async function getPermalink(hash: string): Promise<CanonicalFilters | null> {
  const row = await prisma.queryPermalink.findUnique({ where: { hash } })
  if (!row) return null
  return row.filters as CanonicalFilters
}

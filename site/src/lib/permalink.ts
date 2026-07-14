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

/** The keys that define cohort membership, in canonical order. */
const COHORT_KEYS = [
  'q',
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
  'labeled',
] as const

type CohortKey = (typeof COHORT_KEYS)[number]

export type CanonicalFilters = Partial<Record<CohortKey, string | number | boolean>>

export function canonicalFilters(f: WorkFilters): CanonicalFilters {
  const out: CanonicalFilters = {}
  for (const k of COHORT_KEYS) {
    const v = f[k]
    if (v === undefined || v === '') continue
    out[k] = v as string | number | boolean
  }
  // `agreement` only means something next to a label facet; alone it does not
  // change membership and must not mint a distinct hash for the same cohort.
  if (!out.category && !out.design) delete out.agreement
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

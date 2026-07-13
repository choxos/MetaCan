import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * The search/filter contract, shared by the browse page and the public API.
 *
 * Both surfaces read the SAME function. A public API that answers a different
 * question from the page above it is a bug that nobody notices for a year, and
 * on a project whose thesis is "prose must not drift from the code", two
 * implementations of one query would be self-refuting.
 */
export interface WorkFilters {
  q?: string
  year_from?: number
  year_to?: number
  lang?: string
  type?: string
  field?: string
  /** Provenance: which route admitted the work. `no_aff` is the interesting one. */
  route?: 'aff' | 'fund' | 'venue' | 'about' | 'no_aff'
  retracted?: boolean
  /** Works with no abstract: the stratum where the screen finds half as much. */
  no_abstract?: boolean
  /** Screening consensus: how many of the three models called it metaresearch. */
  n_in?: number
  sort?: 'relevance' | 'cited' | 'year_desc' | 'year_asc'
  page?: number
  per_page?: number
}

export const MAX_PER_PAGE = 100

/** Past this, the count stops. See `searchWorks`. */
export const COUNT_CAP = 10_000

/**
 * The full-text predicate.
 *
 * This MUST be `title_tsv @@ ...` and nothing else. `title_tsv` is the STORED
 * generated column that indexes.sql puts a GIN index on, and any other spelling of
 * the same idea -- to_tsvector('simple', title) computed inline, an ILIKE, a
 * trigram match -- produces a predicate the planner cannot answer from that index.
 * The search box would then sequentially scan 4,299,418 rows.
 *
 * This is exactly why the query below is raw SQL rather than Prisma's `search`
 * operator: Prisma emits an INLINE to_tsvector() call, which does not match the
 * index expression, so it type-checks, returns correct rows, and silently degrades
 * to a seq scan on the site's main entry point. Correct and unusably slow.
 *
 * `websearch_to_tsquery` parses arbitrary user text safely -- it ANDs bare words,
 * honours "quoted phrases" and OR, and cannot be injected -- so nothing here needs
 * hand-escaping.
 */
function tsquery(q: string): Prisma.Sql {
  return Prisma.sql`websearch_to_tsquery('simple', ${q})`
}

/** Every filter, as SQL predicates ANDed together. */
function conditions(f: WorkFilters): Prisma.Sql[] {
  const c: Prisma.Sql[] = []

  const q = f.q?.trim()
  if (q) c.push(Prisma.sql`w.title_tsv @@ ${tsquery(q)}`)

  if (f.year_from !== undefined) c.push(Prisma.sql`w.year >= ${f.year_from}`)
  if (f.year_to !== undefined) c.push(Prisma.sql`w.year <= ${f.year_to}`)
  if (f.lang) c.push(Prisma.sql`w.lang = ${f.lang}`)
  if (f.type) c.push(Prisma.sql`w.type = ${f.type}`)
  if (f.field) c.push(Prisma.sql`w.field = ${f.field}`)
  if (f.retracted) c.push(Prisma.sql`w.is_retracted`)
  if (f.no_abstract) c.push(Prisma.sql`NOT w.has_abstract`)

  switch (f.route) {
    case 'aff':
      c.push(Prisma.sql`w.route_ca_aff`)
      break
    case 'fund':
      c.push(Prisma.sql`w.route_ca_fund`)
      break
    case 'venue':
      c.push(Prisma.sql`w.route_ca_venue`)
      break
    case 'about':
      c.push(Prisma.sql`w.route_about_ca`)
      break
    // The 1,565,226 works an affiliation-only frame would never have seen. This is
    // the frame's whole argument, so it is a first-class filter.
    case 'no_aff':
      c.push(Prisma.sql`NOT w.route_ca_aff`)
      break
  }

  if (f.n_in !== undefined) {
    c.push(Prisma.sql`EXISTS (SELECT 1 FROM screened s WHERE s.id = w.id AND s.n_in = ${f.n_in})`)
  }

  return c
}

function whereSql(f: WorkFilters): Prisma.Sql {
  const c = conditions(f)
  return c.length ? Prisma.sql`WHERE ${Prisma.join(c, ' AND ')}` : Prisma.empty
}

function orderSql(f: WorkFilters): Prisma.Sql {
  const q = f.q?.trim()
  // Relevance only means anything when there is a query to be relevant to.
  if (f.sort === 'relevance' && q) {
    return Prisma.sql`ORDER BY ts_rank(w.title_tsv, ${tsquery(q)}) DESC, w.cited_by DESC`
  }
  switch (f.sort) {
    case 'year_asc':
      return Prisma.sql`ORDER BY w.year ASC NULLS LAST, w.cited_by DESC`
    case 'year_desc':
      return Prisma.sql`ORDER BY w.year DESC NULLS LAST, w.cited_by DESC`
    default:
      return Prisma.sql`ORDER BY w.cited_by DESC`
  }
}

export async function searchWorks(f: WorkFilters) {
  const perPage = Math.min(Math.max(f.per_page ?? 25, 1), MAX_PER_PAGE)
  const page = Math.max(f.page ?? 1, 1)
  const offset = (page - 1) * perPage

  const where = whereSql(f)

  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT w.id FROM works w ${where} ${orderSql(f)} LIMIT ${perPage} OFFSET ${offset}`,

    // COUNTING 4.3M ROWS IS SLOW, and an exact count nobody reads is not worth a
    // two-second page. The subquery stops at the cap, so this costs about the same
    // whether the filter matches ten rows or four million; past the cap the UI says
    // "10,000+" rather than lying or stalling.
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n
      FROM (SELECT 1 FROM works w ${where} LIMIT ${COUNT_CAP}) t`,
  ])

  const total = Number(countRows[0]?.n ?? 0)
  const ids = idRows.map((r) => r.id)

  // Hydrate the page through Prisma so the rows arrive typed, with their relations.
  // Only `perPage` ids, so this is a primary-key lookup and not another scan.
  const hydrated = ids.length
    ? await prisma.work.findMany({
        where: { id: { in: ids } },
        include: {
          retraction: { select: { nature: true, openalexFlagged: true } },
          screened: { select: { nIn: true, opusTier: true, gptTier: true, grokTier: true } },
        },
      })
    : []

  // `WHERE id IN (...)` does not preserve order. The ORDER BY above is the sort the
  // user actually asked for, so restore it rather than letting the fetch order win.
  const byId = new Map(hydrated.map((w) => [w.id, w]))
  const rows = ids.flatMap((id) => {
    const w = byId.get(id)
    return w ? [w] : []
  })

  return { rows, total, page, perPage, capped: total >= COUNT_CAP }
}

export async function getWork(id: string) {
  return prisma.work.findUnique({
    where: { id },
    include: { retraction: true, screened: true },
  })
}

/**
 * The abstract, fetched live from OpenAlex.
 *
 * Not stored: the inverted indexes are 8.6 GB of the frame's 9.3 GB of text and
 * the host has 13 GB free (see deploy/schema.sql). OpenAlex returns the abstract
 * as an INVERTED INDEX (token -> positions), so it is de-inverted here.
 */
export async function fetchAbstract(id: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.openalex.org/works/${id}?mailto=ahmad.pub@gmail.com`, {
      next: { revalidate: 86_400 },
    })
    if (!r.ok) return null
    const j = (await r.json()) as { abstract_inverted_index?: Record<string, number[]> }
    const idx = j.abstract_inverted_index
    if (!idx) return null
    const words: string[] = []
    for (const [token, positions] of Object.entries(idx)) {
      for (const p of positions) words[p] = token
    }
    const text = words.filter(Boolean).join(' ').trim()
    return text.length ? text : null
  } catch {
    return null
  }
}

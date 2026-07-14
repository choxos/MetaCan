import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { LABEL_CATEGORIES, STUDY_DESIGNS, labelAgreement } from '@/lib/labels'

// Re-exported so server-side callers keep one import path; client components
// import from '@/lib/labels' directly, which carries no Prisma.
export { LABEL_CATEGORIES, STUDY_DESIGNS, labelAgreement }

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
  /** Exact OpenAlex primary topic, picked from the typeahead. */
  topic?: string
  /** Exact venue string, picked from the typeahead. */
  venue?: string
  /** Provenance: which route admitted the work. `no_aff` is the interesting one. */
  route?: 'aff' | 'fund' | 'venue' | 'about' | 'no_aff'
  /**
   * Per-route tri-states, the cohort builder's vocabulary: undefined = any,
   * true = the route must have admitted the work, false = it must not have.
   * They compose (route_fund=1 AND route_aff=0 is the funder-only stratum),
   * which the single legacy `route` select cannot express.
   */
  route_aff?: boolean
  route_fund?: boolean
  route_venue?: boolean
  route_about?: boolean
  /** Tri-state: true = retracted only, false = exclude retracted. */
  retracted?: boolean
  /** Works with no abstract: the stratum where the screen finds half as much. */
  no_abstract?: boolean
  /** Tri-state cousin of no_abstract for the cohort builder. */
  abstract?: 'has' | 'none'
  /** Screening consensus: how many of the three models called it metaresearch. */
  n_in?: number
  /**
   * Label facets. MACHINE LABELS from frontier LLMs, unvalidated, and sparse:
   * a category filter selects works where at least one model (`agreement=any`,
   * the default) or every model that labelled the work (`agreement=all`)
   * applied the category. Absence of a label is NEVER a negative label, which
   * is why `labeled` exists as its own facet instead of being implied.
   */
  category?: string
  design?: string
  agreement?: 'any' | 'all'
  /** true = only works with at least one label row; false = only unlabelled. */
  labeled?: boolean
  sort?: 'relevance' | 'cited' | 'year_desc' | 'year_asc'
  page?: number
  per_page?: number
}

export const MAX_PER_PAGE = 100

/** Past this, the count stops. See `searchWorks`. */
export const COUNT_CAP = 10_000

/** Exports stop here, with the truncation declared in meta and headers. */
export const EXPORT_CAP = 100_000

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
  // Exact-value facets fed by the typeaheads. Both columns carry a btree index
  // (indexes.sql), so these are lookups, not 700 ms seq scans over 4.3M rows.
  if (f.topic) c.push(Prisma.sql`w.topic = ${f.topic}`)
  if (f.venue) c.push(Prisma.sql`w.venue = ${f.venue}`)

  if (f.retracted === true) c.push(Prisma.sql`w.is_retracted`)
  if (f.retracted === false) c.push(Prisma.sql`NOT w.is_retracted`)
  if (f.no_abstract || f.abstract === 'none') c.push(Prisma.sql`NOT w.has_abstract`)
  else if (f.abstract === 'has') c.push(Prisma.sql`w.has_abstract`)

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

  // The tri-state route facets compose: route_fund=1 with route_aff=0 is the
  // funder-only stratum, which the single `route` select cannot express.
  if (f.route_aff === true) c.push(Prisma.sql`w.route_ca_aff`)
  if (f.route_aff === false) c.push(Prisma.sql`NOT w.route_ca_aff`)
  if (f.route_fund === true) c.push(Prisma.sql`w.route_ca_fund`)
  if (f.route_fund === false) c.push(Prisma.sql`NOT w.route_ca_fund`)
  if (f.route_venue === true) c.push(Prisma.sql`w.route_ca_venue`)
  if (f.route_venue === false) c.push(Prisma.sql`NOT w.route_ca_venue`)
  if (f.route_about === true) c.push(Prisma.sql`w.route_about_ca`)
  if (f.route_about === false) c.push(Prisma.sql`NOT w.route_about_ca`)

  if (f.n_in !== undefined) {
    c.push(Prisma.sql`EXISTS (SELECT 1 FROM screened s WHERE s.id = w.id AND s.n_in = ${f.n_in})`)
  }

  // Label facets. work_label is a few thousand rows with a (id, model) primary
  // key, so the planner drives these from the label side in milliseconds.
  if (f.category && (LABEL_CATEGORIES as readonly string[]).includes(f.category)) {
    c.push(
      Prisma.sql`EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id AND ${f.category} = ANY(wl.categories))`,
    )
    if (f.agreement === 'all') {
      // Every model that labelled the work applied the category: agreement,
      // not one model's opinion.
      c.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id AND NOT (${f.category} = ANY(wl.categories)))`,
      )
    }
  }
  if (f.design && (STUDY_DESIGNS as readonly string[]).includes(f.design)) {
    c.push(
      Prisma.sql`EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id AND wl.study_design = ${f.design})`,
    )
    if (f.agreement === 'all') {
      c.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id AND wl.study_design IS DISTINCT FROM ${f.design})`,
      )
    }
  }
  if (f.labeled === true) c.push(Prisma.sql`EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id)`)
  if (f.labeled === false) c.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id)`)

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

/** One label row, as the API and the export serialize it. */
export interface LabelOut {
  model: string
  categories: string[]
  domain: string | null
  study_design: string | null
  genre: string | null
  about_ca_system: boolean | null
  about_ca_topic: boolean | null
  confidence: string | null
}

/**
 * The cohort query: `searchWorks` semantics with the counts a citable cohort
 * needs. Differences, both deliberate:
 *
 *   1. The count is EXACT, not capped. A cohort exists to be cited ("N works
 *      matching these criteria"), and "10,000+" is not a citable N. A filtered
 *      count over the whole frame is sub-second here (measured; the table and
 *      its indexes stay in the page cache), which is a fair price for a number
 *      that means something.
 *
 *   2. Every response carries `labeled`: how many works IN THIS COHORT have at
 *      least one label row. The label table is sparse, and a reader must never
 *      be allowed to mistake "no label" for "not in the category", so the
 *      coverage travels with every result set.
 */
export async function cohortSearch(f: WorkFilters) {
  const perPage = Math.min(Math.max(f.per_page ?? 50, 1), MAX_PER_PAGE)
  const page = Math.max(f.page ?? 1, 1)
  const offset = (page - 1) * perPage

  const where = whereSql(f)

  const [idRows, countRows, labeledRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT w.id FROM works w ${where} ${orderSql(f)} LIMIT ${perPage} OFFSET ${offset}`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM works w ${where}`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM works w ${where}
      ${conditions(f).length ? Prisma.sql`AND` : Prisma.sql`WHERE`} EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id)`,
  ])

  const total = Number(countRows[0]?.n ?? 0)
  const labeled = Number(labeledRows[0]?.n ?? 0)
  const ids = idRows.map((r) => r.id)

  const hydrated = ids.length
    ? await prisma.work.findMany({
        where: { id: { in: ids } },
        include: {
          retraction: { select: { nature: true, openalexFlagged: true } },
          screened: { select: { nIn: true } },
          score: { select: { scoreOpus: true, scoreGpt: true, scoreSpread: true, validationStatus: true } },
          labels: true,
        },
      })
    : []

  const byId = new Map(hydrated.map((w) => [w.id, w]))
  const rows = ids.flatMap((id) => {
    const w = byId.get(id)
    return w ? [w] : []
  })

  return { rows, total, labeled, page, perPage }
}

export type CohortRow = Awaited<ReturnType<typeof cohortSearch>>['rows'][number]

/** One exported record: every work column, the labels, the scores, the status. */
export interface ExportRow {
  id: string
  doi: string | null
  title: string
  year: number | null
  lang: string | null
  type: string | null
  venue: string | null
  topic: string | null
  field: string | null
  cited_by: number
  is_retracted: boolean
  has_abstract: boolean
  route_ca_aff: boolean
  route_ca_fund: boolean
  route_ca_venue: boolean
  route_about_ca: boolean
  ca_institutions: string | null
  funders: string | null
  keywords: string | null
  score_opus: number | null
  score_gpt: number | null
  score_spread: number | null
  validation_status: string | null
  labels: LabelOut[] | null
}

/**
 * The cohort, streamed in keyset-paginated chunks ordered by id. OFFSET would
 * re-scan everything it skips on every chunk; `id > cursor` walks the primary
 * key once. The caller (the export route) decides when to stop; this function
 * only knows how to fetch the next slice.
 */
export async function exportChunk(f: WorkFilters, cursor: string, limit: number): Promise<ExportRow[]> {
  const c = conditions(f)
  c.push(Prisma.sql`w.id > ${cursor}`)
  const where = Prisma.sql`WHERE ${Prisma.join(c, ' AND ')}`

  return prisma.$queryRaw<ExportRow[]>`
    SELECT w.id, w.doi, w.title, w.year, w.lang, w.type, w.venue, w.topic, w.field,
           w.cited_by, w.is_retracted, w.has_abstract,
           w.route_ca_aff, w.route_ca_fund, w.route_ca_venue, w.route_about_ca,
           w.ca_institutions, w.funders, w.keywords,
           s.score_opus, s.score_gpt, s.score_spread, s.validation_status,
           (SELECT json_agg(json_build_object(
              'model', wl.model,
              'categories', wl.categories,
              'domain', wl.domain,
              'study_design', wl.study_design,
              'genre', wl.genre,
              'about_ca_system', wl.about_ca_system,
              'about_ca_topic', wl.about_ca_topic,
              'confidence', wl.confidence
            ) ORDER BY wl.model)
            FROM work_label wl WHERE wl.id = w.id) AS labels
    FROM works w
    LEFT JOIN work_score s ON s.id = w.id
    ${where}
    ORDER BY w.id
    LIMIT ${limit}`
}

/** The exact cohort size plus label coverage, for export meta and /q pages. */
export async function cohortCount(f: WorkFilters): Promise<{ total: number; labeled: number }> {
  const where = whereSql(f)
  const [countRows, labeledRows] = await Promise.all([
    prisma.$queryRaw<Array<{ n: bigint }>>`SELECT COUNT(*)::bigint AS n FROM works w ${where}`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM works w ${where}
      ${conditions(f).length ? Prisma.sql`AND` : Prisma.sql`WHERE`} EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id)`,
  ])
  return { total: Number(countRows[0]?.n ?? 0), labeled: Number(labeledRows[0]?.n ?? 0) }
}

export async function getWork(id: string) {
  return prisma.work.findUnique({
    where: { id },
    include: { retraction: true, screened: true, score: true, labels: true },
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

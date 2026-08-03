import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'
import { cohortCount, type WorkFilters } from '@/lib/query'
import { hashFilters } from '@/lib/permalink'

/**
 * Aggregations over the frame, shared by /analytics and /api/v1/stats/*.
 *
 * Same contract as `searchWorks()` in query.ts, for the same reason: the page and
 * the API must answer the SAME question. Two implementations of one aggregate is
 * a bug that hides for a year, and on a project whose thesis is that prose must
 * not drift from the code, it would be self-refuting.
 *
 * Every function here is a GROUP BY over 4.3M rows, so every one is wrapped in a
 * one-hour cache. The frame is a PINNED SNAPSHOT: it does not change between
 * deploys, so a stale aggregate is not a risk, and re-scanning four million rows
 * per page view would be.
 */

const HOUR = 3600

/** Postgres returns COUNT(*) as bigint, which arrives as a JS BigInt. */
function toN(v: unknown): number {
  return typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : 0
}

export interface Summary {
  works: number
  no_aff: number
  no_abstract: number
  retracted_openalex: number
  screened: number
  retraction_notices: number
  routes: { aff: number; fund: number; venue: number; about: number }
  screen_consensus: { n_in_0: number; n_in_1: number; n_in_2: number; n_in_3: number }
  /** What the frame can see: metadata coverage of the frozen release. */
  coverage: { has_venue: number; has_abstract: number; french: number; no_funder: number }
  snapshot: string
}

export const getSummary = unstable_cache(
  async (): Promise<Summary> => {
    // One pass over the table for the frame-wide counts. Separate count()s
    // would each be a sequential scan of 4.3M rows.
    const [row] = await prisma.$queryRaw<
      Array<Record<string, bigint>>
    >`SELECT
        COUNT(*)                                        AS works,
        COUNT(*) FILTER (WHERE NOT route_ca_aff)        AS no_aff,
        COUNT(*) FILTER (WHERE NOT has_abstract)        AS no_abstract,
        COUNT(*) FILTER (WHERE is_retracted)            AS retracted_openalex,
        COUNT(*) FILTER (WHERE route_ca_aff)            AS aff,
        COUNT(*) FILTER (WHERE route_ca_fund)           AS fund,
        COUNT(*) FILTER (WHERE route_ca_venue)          AS venue,
        COUNT(*) FILTER (WHERE route_about_ca)          AS about,
        COUNT(*) FILTER (WHERE venue IS NOT NULL AND venue <> '')      AS has_venue,
        COUNT(*) FILTER (WHERE has_abstract)                           AS has_abstract,
        COUNT(*) FILTER (WHERE lang = 'fr')                            AS french,
        COUNT(*) FILTER (WHERE funders IS NULL OR funders = '')        AS no_funder
      FROM works`

    const [scr] = await prisma.$queryRaw<
      Array<Record<string, bigint>>
    >`SELECT
        COUNT(*)                          AS screened,
        COUNT(*) FILTER (WHERE n_in = 0)  AS n0,
        COUNT(*) FILTER (WHERE n_in = 1)  AS n1,
        COUNT(*) FILTER (WHERE n_in = 2)  AS n2,
        COUNT(*) FILTER (WHERE n_in = 3)  AS n3
      FROM screened`

    const notices = await prisma.retraction.count()

    return {
      works: toN(row?.works),
      no_aff: toN(row?.no_aff),
      no_abstract: toN(row?.no_abstract),
      retracted_openalex: toN(row?.retracted_openalex),
      screened: toN(scr?.screened),
      retraction_notices: notices,
      routes: {
        aff: toN(row?.aff),
        fund: toN(row?.fund),
        venue: toN(row?.venue),
        about: toN(row?.about),
      },
      screen_consensus: {
        n_in_0: toN(scr?.n0),
        n_in_1: toN(scr?.n1),
        n_in_2: toN(scr?.n2),
        n_in_3: toN(scr?.n3),
      },
      coverage: {
        has_venue: toN(row?.has_venue),
        has_abstract: toN(row?.has_abstract),
        french: toN(row?.french),
        no_funder: toN(row?.no_funder),
      },
      snapshot: 'OpenAlex, pinned release, all 482 partitions',
    }
  },
  ['mc:summary'],
  { revalidate: HOUR, tags: ['stats'] },
)

export interface YearPoint {
  year: number
  works: number
  no_aff: number
  no_abstract: number
}

export const getByYear = unstable_cache(
  async (): Promise<YearPoint[]> => {
    const rows = await prisma.$queryRaw<Array<Record<string, bigint | number | null>>>`
      SELECT year,
             COUNT(*)                                 AS works,
             COUNT(*) FILTER (WHERE NOT route_ca_aff) AS no_aff,
             COUNT(*) FILTER (WHERE NOT has_abstract) AS no_abstract
      FROM works
      WHERE year IS NOT NULL AND year BETWEEN 1800 AND 2100
      GROUP BY year
      ORDER BY year`
    return rows.map((r) => ({
      year: toN(r.year),
      works: toN(r.works),
      no_aff: toN(r.no_aff),
      no_abstract: toN(r.no_abstract),
    }))
  },
  ['mc:by-year'],
  { revalidate: HOUR, tags: ['stats'] },
)

export interface RoutePoint {
  route: string
  label: string
  works: number
}

/**
 * The four routes are NOT mutually exclusive; a work can be admitted by several.
 * So this returns both the marginal count per route and the exact route-combination
 * breakdown, because the overlap IS the finding: report only the marginals and the
 * columns sum to more than the frame, which looks like an error and hides the point.
 */
export interface RouteStats {
  marginals: RoutePoint[]
  /** Exact combinations, e.g. "aff+fund". Sums to the frame exactly. */
  combinations: Array<{ combo: string; n_routes: number; works: number }>
  no_aff: number
  total: number
}

export const getByRoute = unstable_cache(
  async (): Promise<RouteStats> => {
    const [m] = await prisma.$queryRaw<Array<Record<string, bigint>>>`
      SELECT COUNT(*)                                 AS total,
             COUNT(*) FILTER (WHERE route_ca_aff)     AS aff,
             COUNT(*) FILTER (WHERE route_ca_fund)    AS fund,
             COUNT(*) FILTER (WHERE route_ca_venue)   AS venue,
             COUNT(*) FILTER (WHERE route_about_ca)   AS about,
             COUNT(*) FILTER (WHERE NOT route_ca_aff) AS no_aff
      FROM works`

    const combos = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT route_ca_aff, route_ca_fund, route_ca_venue, route_about_ca, COUNT(*) AS works
      FROM works
      GROUP BY 1, 2, 3, 4
      ORDER BY works DESC`

    const combinations = combos.map((c) => {
      const parts: string[] = []
      if (c.route_ca_aff) parts.push('aff')
      if (c.route_ca_fund) parts.push('fund')
      if (c.route_ca_venue) parts.push('venue')
      if (c.route_about_ca) parts.push('about')
      return {
        combo: parts.length ? parts.join('+') : 'none',
        n_routes: parts.length,
        works: toN(c.works),
      }
    })

    return {
      marginals: [
        { route: 'aff', label: 'Canadian affiliation', works: toN(m?.aff) },
        { route: 'fund', label: 'Canadian funder', works: toN(m?.fund) },
        { route: 'venue', label: 'Canadian venue', works: toN(m?.venue) },
        { route: 'about', label: 'About Canada', works: toN(m?.about) },
      ],
      combinations,
      no_aff: toN(m?.no_aff),
      total: toN(m?.total),
    }
  },
  ['mc:by-route'],
  { revalidate: HOUR, tags: ['stats'] },
)

export interface FieldPoint {
  field: string
  works: number
  no_abstract: number
}

export const getByField = unstable_cache(
  async (): Promise<FieldPoint[]> => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(NULLIF(field, ''), 'Unclassified') AS field,
             COUNT(*)                                    AS works,
             COUNT(*) FILTER (WHERE NOT has_abstract)    AS no_abstract
      FROM works
      GROUP BY 1
      ORDER BY works DESC`
    return rows.map((r) => ({
      field: String(r.field ?? 'Unclassified'),
      works: toN(r.works),
      no_abstract: toN(r.no_abstract),
    }))
  },
  ['mc:by-field'],
  { revalidate: HOUR, tags: ['stats'] },
)

export interface LangPoint {
  lang: string
  works: number
  no_abstract: number
}

export const getByLanguage = unstable_cache(
  async (): Promise<LangPoint[]> => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(NULLIF(lang, ''), 'unknown')     AS lang,
             COUNT(*)                                  AS works,
             COUNT(*) FILTER (WHERE NOT has_abstract)  AS no_abstract
      FROM works
      GROUP BY 1
      ORDER BY works DESC
      LIMIT 15`
    return rows.map((r) => ({
      lang: String(r.lang ?? 'unknown'),
      works: toN(r.works),
      no_abstract: toN(r.no_abstract),
    }))
  },
  ['mc:by-lang'],
  { revalidate: HOUR, tags: ['stats'] },
)

/**
 * The abstract gap by type. This is finding `abstract_cascade`'s structural claim
 * made visible: the gap is not uniform noise a better index would fix, it is
 * concentrated in types that never carry an abstract at all.
 */
export interface TypePoint {
  type: string
  works: number
  no_abstract: number
  pct_no_abstract: number
}

export const getAbstractGapByType = unstable_cache(
  async (): Promise<TypePoint[]> => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(NULLIF(type, ''), 'unknown')    AS type,
             COUNT(*)                                 AS works,
             COUNT(*) FILTER (WHERE NOT has_abstract) AS no_abstract
      FROM works
      GROUP BY 1
      HAVING COUNT(*) >= 1000
      ORDER BY works DESC
      LIMIT 14`
    return rows.map((r) => {
      const works = toN(r.works)
      const no_abstract = toN(r.no_abstract)
      return {
        type: String(r.type ?? 'unknown'),
        works,
        no_abstract,
        pct_no_abstract: works ? Number(((no_abstract / works) * 100).toFixed(1)) : 0,
      }
    })
  },
  ['mc:abstract-gap'],
  { revalidate: HOUR, tags: ['stats'] },
)

export interface VenuePoint {
  venue: string
  works: number
}

export const getTopVenues = unstable_cache(
  async (): Promise<VenuePoint[]> => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT venue, COUNT(*) AS works
      FROM works
      WHERE venue IS NOT NULL AND venue <> ''
      GROUP BY venue
      ORDER BY works DESC
      LIMIT 20`
    return rows.map((r) => ({ venue: String(r.venue), works: toN(r.works) }))
  },
  ['mc:top-venues'],
  { revalidate: HOUR, tags: ['stats'] },
)

/**
 * Funders are stored as a semicolon-separated string (as harvested), so the top-N
 * needs a split. Done in SQL rather than by pulling 4.3M rows into node.
 */
export const getTopFunders = unstable_cache(
  async (): Promise<Array<{ funder: string; works: number }>> => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT TRIM(f) AS funder, COUNT(*) AS works
      FROM works, LATERAL unnest(string_to_array(funders, ';')) AS f
      WHERE funders IS NOT NULL AND funders <> '' AND TRIM(f) <> ''
      GROUP BY 1
      ORDER BY works DESC
      LIMIT 20`
    return rows.map((r) => ({ funder: String(r.funder), works: toN(r.works) }))
  },
  ['mc:top-funders'],
  { revalidate: HOUR, tags: ['stats'] },
)

/**
 * The retraction state breakdown: FOUR states, not a boolean.
 *
 * `openalex_flagged = false` means OpenAlex missed it entirely. That column is the
 * point of the table: a boolean over a four-value state space can express
 * "retracted" and reports the other three as `false`, which reads as "fine".
 */
export interface RetractionState {
  nature: string
  works: number
  openalex_flagged: number
  openalex_missed: number
}

export const getRetractionStates = unstable_cache(
  async (): Promise<RetractionState[]> => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(NULLIF(nature, ''), 'Unspecified')  AS nature,
             COUNT(*)                                     AS works,
             COUNT(*) FILTER (WHERE openalex_flagged)     AS flagged,
             COUNT(*) FILTER (WHERE NOT openalex_flagged) AS missed
      FROM retractions
      GROUP BY 1
      ORDER BY works DESC`
    return rows.map((r) => ({
      nature: String(r.nature ?? 'Unspecified'),
      works: toN(r.works),
      openalex_flagged: toN(r.flagged),
      openalex_missed: toN(r.missed),
    }))
  },
  ['mc:retraction-states'],
  { revalidate: HOUR, tags: ['stats'] },
)

/**
 * The label landscape: what the machine-labeled subset looks like, by
 * category, study design, year and language.
 *
 * The work_label table is a few thousand rows, so the aggregation happens in
 * node over one fetch instead of six GROUP BYs. Two counts per bucket, on
 * purpose: `any_model` (at least one model applied the value) and `all_models`
 * (every model that labeled the work applied it), because the gap between
 * them IS the finding; a single number would hide the disagreement, and the
 * disagreement is this project's deliverable.
 *
 * Every figure is over the LABELED SUBSET ONLY. `coverage` states its size
 * against the whole frame, and no consumer may present these counts as frame
 * totals.
 */
export interface LabelStats {
  coverage: { labeled_works: number; label_rows: number; frame_works: number; models: string[] }
  by_category: Array<{ category: string; any_model: number; all_models: number }>
  by_design: Array<{ design: string; any_model: number; all_models: number }>
  by_year: Array<{ year: number; labeled: number }>
  by_lang: Array<{ lang: string; labeled: number }>
}

export const getLabelStats = unstable_cache(
  async (): Promise<LabelStats> => {
    const [labels, frameWorks] = await Promise.all([
      prisma.workLabel.findMany({
        select: {
          id: true,
          model: true,
          categories: true,
          studyDesign: true,
          work: { select: { year: true, lang: true } },
        },
      }),
      prisma.work.count(),
    ])

    const byWork = new Map<string, typeof labels>()
    for (const l of labels) {
      const arr = byWork.get(l.id)
      if (arr) arr.push(l)
      else byWork.set(l.id, [l])
    }

    const catAny = new Map<string, number>()
    const catAll = new Map<string, number>()
    const desAny = new Map<string, number>()
    const desAll = new Map<string, number>()
    const byYear = new Map<number, number>()
    const byLang = new Map<string, number>()
    const models = new Set<string>()

    for (const rows of byWork.values()) {
      for (const r of rows) models.add(r.model)

      const cats = new Set(rows.flatMap((r) => r.categories))
      for (const c of cats) {
        catAny.set(c, (catAny.get(c) ?? 0) + 1)
        if (rows.every((r) => r.categories.includes(c))) catAll.set(c, (catAll.get(c) ?? 0) + 1)
      }

      const designs = new Set(rows.map((r) => r.studyDesign).filter((d): d is string => d !== null))
      for (const d of designs) {
        desAny.set(d, (desAny.get(d) ?? 0) + 1)
        if (rows.every((r) => r.studyDesign === d)) desAll.set(d, (desAll.get(d) ?? 0) + 1)
      }

      const w = rows[0]?.work
      if (w === undefined) continue
      if (w.year !== null) byYear.set(w.year, (byYear.get(w.year) ?? 0) + 1)
      const lg = w.lang && w.lang !== '' ? w.lang : 'unknown'
      byLang.set(lg, (byLang.get(lg) ?? 0) + 1)
    }

    const desc = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])

    return {
      coverage: {
        labeled_works: byWork.size,
        label_rows: labels.length,
        frame_works: frameWorks,
        models: [...models].sort(),
      },
      by_category: desc(catAny).map(([category, any_model]) => ({
        category,
        any_model,
        all_models: catAll.get(category) ?? 0,
      })),
      by_design: desc(desAny).map(([design, any_model]) => ({
        design,
        any_model,
        all_models: desAll.get(design) ?? 0,
      })),
      by_year: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, labeled]) => ({ year, labeled })),
      by_lang: desc(byLang).map(([lang, labeled]) => ({ lang, labeled })),
    }
  },
  ['mc:label-stats'],
  { revalidate: HOUR, tags: ['stats'] },
)

/** Distinct filter values for the browse UI. Small, and cached for a day. */
/**
 * The home page's cohort preview: the three most-cited works in the frame,
 * with their labels, exactly what the cohort builder's unfiltered first page
 * leads with. Cached: the frame is pinned, so this cannot go stale between
 * deploys, and the front page must not pay a 4.3M-row ORDER BY on every view
 * (idx_works_cited makes the scan cheap, but cheap times every hit still
 * loses to zero).
 */
export interface PreviewWork {
  id: string
  title: string
  year: number | null
  type: string | null
  lang: string | null
  venue: string | null
  field: string | null
  citedBy: number
  hasAbstract: boolean
  routeCaAff: boolean
  routeCaFund: boolean
  routeCaVenue: boolean
  routeAboutCa: boolean
  labels: Array<{ model: string; categories: string[]; studyDesign: string | null }>
}

export const getTopCited = unstable_cache(
  async (limit = 3): Promise<PreviewWork[]> => {
    const rows = await prisma.work.findMany({
      orderBy: { citedBy: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        year: true,
        type: true,
        lang: true,
        venue: true,
        field: true,
        citedBy: true,
        hasAbstract: true,
        routeCaAff: true,
        routeCaFund: true,
        routeCaVenue: true,
        routeAboutCa: true,
        labels: { select: { model: true, categories: true, studyDesign: true } },
      },
    })
    return rows
  },
  ['mc:top-cited'],
  { revalidate: HOUR, tags: ['stats'] },
)

/**
 * The API docs' sample response: the funder-without-affiliation French
 * stratum, counted live and hashed with the SAME functions the API uses, so
 * the sample panel can never show a number the endpoint would not return.
 */
export const getApiSample = unstable_cache(
  async (): Promise<{ total: number; directLabeled: number; predicted: number; hash: string }> => {
    const filters: WorkFilters = { route_fund: true, route_aff: false, lang: 'fr' }
    const counts = await cohortCount(filters)
    return { ...counts, hash: hashFilters(filters) }
  },
  ['mc:api-sample'],
  { revalidate: HOUR, tags: ['stats'] },
)

/**
 * The distilled classifier's version string, read from the prediction table
 * itself rather than from copy, so the site can never claim a version the
 * database does not carry.
 */
export const getPredictionModelVersion = unstable_cache(
  async (): Promise<string | null> => {
    const row = await prisma.workPrediction.findFirst({ select: { modelVersion: true } })
    return row?.modelVersion ?? null
  },
  ['mc:prediction-version'],
  { revalidate: HOUR, tags: ['stats'] },
)

export const getFacets = unstable_cache(
  async (): Promise<{ langs: string[]; types: string[]; fields: string[] }> => {
    const [langs, types, fields] = await Promise.all([
      prisma.$queryRaw<Array<{ v: string }>>`
        SELECT lang AS v FROM works WHERE lang IS NOT NULL AND lang <> ''
        GROUP BY lang ORDER BY COUNT(*) DESC LIMIT 25`,
      prisma.$queryRaw<Array<{ v: string }>>`
        SELECT type AS v FROM works WHERE type IS NOT NULL AND type <> ''
        GROUP BY type ORDER BY COUNT(*) DESC LIMIT 25`,
      prisma.$queryRaw<Array<{ v: string }>>`
        SELECT field AS v FROM works WHERE field IS NOT NULL AND field <> ''
        GROUP BY field ORDER BY COUNT(*) DESC LIMIT 30`,
    ])
    return {
      langs: langs.map((r) => r.v),
      types: types.map((r) => r.v),
      fields: fields.map((r) => r.v),
    }
  },
  ['mc:facets'],
  { revalidate: 86_400, tags: ['stats'] },
)

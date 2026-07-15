import {
  Prisma,
  type RecentSyncRun,
  type RecentWork,
} from '@prisma/client'
import { prisma } from '@/lib/db'

export const RECENT_DEFAULT_DAYS = 30
export const RECENT_MIN_DAYS = 15
export const RECENT_MAX_DAYS = 30
export const RECENT_MAX_PER_PAGE = 100

export const RECENT_ROUTES = [
  'ca_aff',
  'ca_fund',
  'ca_venue',
  'about_ca',
] as const

export type RecentRoute = (typeof RECENT_ROUTES)[number]

export type RecentFilterErrorCode =
  | 'days'
  | 'pagination'
  | 'route'
  | 'year'
  | 'has_abstract'
  | 'length'

export interface RecentFilters {
  days: number
  page: number
  perPage: number
  q?: string
  route?: RecentRoute
  year?: number
  type?: string
  lang?: string
  hasAbstract?: boolean
  institution?: string
  funder?: string
  keyword?: string
  venue?: string
  topic?: string
  field?: string
}

type ParameterSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>

function value(source: ParameterSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined
  const item = source[key]
  return Array.isArray(item) ? item[0] : item
}

function positiveInteger(raw: string | undefined, fallback: number) {
  if (raw === undefined) return fallback
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function recentFiltersFromParams(source: ParameterSource): {
  filters: RecentFilters
  error: string | null
  errorCode: RecentFilterErrorCode | null
} {
  const days = positiveInteger(value(source, 'days'), RECENT_DEFAULT_DAYS)
  if (days === null || days < RECENT_MIN_DAYS || days > RECENT_MAX_DAYS) {
    return {
      filters: {
        days: RECENT_DEFAULT_DAYS,
        page: 1,
        perPage: 25,
      },
      error: `days must be an integer from ${RECENT_MIN_DAYS} through ${RECENT_MAX_DAYS}`,
      errorCode: 'days',
    }
  }

  const page = positiveInteger(value(source, 'page'), 1)
  const perPage = positiveInteger(value(source, 'per_page'), 25)
  if (page === null || perPage === null || perPage > RECENT_MAX_PER_PAGE) {
    return {
      filters: { days, page: 1, perPage: 25 },
      error: `page must be positive and per_page must be from 1 through ${RECENT_MAX_PER_PAGE}`,
      errorCode: 'pagination',
    }
  }

  const routeValue = value(source, 'route')
  const route = RECENT_ROUTES.find((candidate) => candidate === routeValue)
  if (routeValue && !route) {
    return {
      filters: { days, page, perPage },
      error: `route must be one of ${RECENT_ROUTES.join(', ')}`,
      errorCode: 'route',
    }
  }

  const yearValue = value(source, 'year')
  const year = yearValue === undefined ? undefined : positiveInteger(yearValue, 0)
  if (year === null || (year !== undefined && (year < 1000 || year > 9999))) {
    return {
      filters: { days, page, perPage, route },
      error: 'year must be a four-digit positive integer',
      errorCode: 'year',
    }
  }

  const hasAbstractValue = value(source, 'has_abstract')
  const hasAbstract =
    hasAbstractValue === undefined
      ? undefined
      : hasAbstractValue === 'true'
        ? true
        : hasAbstractValue === 'false'
          ? false
          : null
  if (hasAbstract === null) {
    return {
      filters: { days, page, perPage, route },
      error: 'has_abstract must be true or false',
      errorCode: 'has_abstract',
    }
  }

  const q = value(source, 'q')?.trim()
  const type = value(source, 'type')?.trim()
  const lang = value(source, 'lang')?.trim()
  const institution = value(source, 'institution')?.trim()
  const funder = value(source, 'funder')?.trim()
  const keyword = value(source, 'keyword')?.trim()
  const venue = value(source, 'venue')?.trim()
  const topic = value(source, 'topic')?.trim()
  const field = value(source, 'field')?.trim()
  if (
    (q?.length ?? 0) > 200 ||
    [type, lang, institution, funder, keyword, venue, topic, field].some(
      (item) => (item?.length ?? 0) > 300,
    )
  ) {
    return {
      filters: { days, page, perPage, route },
      error: 'q must be at most 200 characters and exact values at most 300',
      errorCode: 'length',
    }
  }

  return {
    filters: {
      days,
      page,
      perPage,
      ...(q ? { q } : {}),
      ...(route ? { route } : {}),
      ...(year ? { year } : {}),
      ...(type ? { type } : {}),
      ...(lang ? { lang } : {}),
      ...(hasAbstract !== undefined ? { hasAbstract } : {}),
      ...(institution ? { institution } : {}),
      ...(funder ? { funder } : {}),
      ...(keyword ? { keyword } : {}),
      ...(venue ? { venue } : {}),
      ...(topic ? { topic } : {}),
      ...(field ? { field } : {}),
    },
    error: null,
    errorCode: null,
  }
}

export function recentWindowStart(days: number, now = new Date()) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start
}

function recentWhere(filters: RecentFilters, now = new Date()) {
  const where: Prisma.RecentWorkWhereInput = {
    publicationDate: { gte: recentWindowStart(filters.days, now) },
  }
  if (filters.q) {
    where.title = { contains: filters.q, mode: 'insensitive' }
  }
  if (filters.year) where.year = filters.year
  if (filters.type) where.type = filters.type
  if (filters.lang) where.lang = filters.lang
  if (filters.hasAbstract !== undefined) where.hasAbstract = filters.hasAbstract
  if (filters.institution) {
    where.caInstitutions = { has: filters.institution }
  }
  if (filters.funder) where.funders = { has: filters.funder }
  if (filters.keyword) where.keywords = { has: filters.keyword }
  if (filters.venue) where.venue = filters.venue
  if (filters.topic) where.topic = filters.topic
  if (filters.field) where.field = filters.field
  if (filters.route === 'ca_aff') where.routeCaAff = true
  if (filters.route === 'ca_fund') where.routeCaFund = true
  if (filters.route === 'ca_venue') where.routeCaVenue = true
  if (filters.route === 'about_ca') where.routeAboutCa = true
  return where
}

export async function recentSyncStatus() {
  const [latest, lastSuccess] = await Promise.all([
    prisma.recentSyncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.recentSyncRun.findFirst({
      where: { status: 'succeeded' },
      orderBy: { completedAt: 'desc' },
    }),
  ])
  return { latest, lastSuccess }
}

export async function searchRecentWorks(filters: RecentFilters) {
  const where = recentWhere(filters)
  const [rows, total, sync] = await Promise.all([
    prisma.recentWork.findMany({
      where,
      orderBy: [
        { publicationDate: 'desc' },
        { citedBy: 'desc' },
        { id: 'asc' },
      ],
      skip: (filters.page - 1) * filters.perPage,
      take: filters.perPage,
    }),
    prisma.recentWork.count({ where }),
    recentSyncStatus(),
  ])
  return { rows, total, sync }
}

export function getRecentWork(id: string) {
  return prisma.recentWork.findUnique({ where: { id } })
}

export interface RecentInstitution {
  id: string | null
  name: string | null
  ror: string | null
}

export interface RecentAuthor {
  id: string | null
  name: string | null
  orcid: string | null
  institutions: RecentInstitution[]
}

function nullableString(input: unknown): string | null {
  return typeof input === 'string' ? input : null
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

export function recentAuthors(input: Prisma.JsonValue): RecentAuthor[] {
  if (!Array.isArray(input)) return []
  return input.flatMap((author) => {
    if (!isObject(author)) return []
    const institutions = Array.isArray(author.institutions)
      ? author.institutions.flatMap((institution) => {
          if (!isObject(institution)) return []
          return [
            {
              id: nullableString(institution.id),
              name: nullableString(institution.name),
              ror: nullableString(institution.ror),
            },
          ]
        })
      : []
    return [
      {
        id: nullableString(author.id),
        name: nullableString(author.name),
        orcid: nullableString(author.orcid),
        institutions,
      },
    ]
  })
}

function dateOnly(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null
}

export function recentWorkView(work: RecentWork) {
  return {
    id: work.id,
    doi: work.doi,
    title: work.title,
    publication_date: dateOnly(work.publicationDate),
    year: work.year,
    lang: work.lang,
    type: work.type,
    venue: work.venue,
    topic: work.topic,
    field: work.field,
    cited_by: work.citedBy,
    is_retracted: work.isRetracted,
    has_abstract: work.hasAbstract,
    abstract: work.abstract,
    pmid: work.pmid,
    pmcid: work.pmcid,
    routes: {
      ca_aff: work.routeCaAff,
      ca_fund: work.routeCaFund,
      ca_venue: work.routeCaVenue,
      about_ca: work.routeAboutCa,
    },
    canadian_institutions: work.caInstitutions,
    funders: work.funders,
    keywords: work.keywords,
    canadian_authors: recentAuthors(work.authors),
    provenance: {
      route_version: work.routeVersion,
      openalex_updated_date: dateOnly(work.openalexUpdatedDate),
      source_window_start: dateOnly(work.sourceWindowStart),
      source_window_end: dateOnly(work.sourceWindowEnd),
      first_seen_at: work.firstSeenAt.toISOString(),
      last_seen_at: work.lastSeenAt.toISOString(),
      synced_at: work.syncedAt.toISOString(),
    },
  }
}

export function recentSyncView(run: RecentSyncRun | null) {
  if (!run) return null
  return {
    id: run.id.toString(),
    status: run.status,
    started_at: run.startedAt.toISOString(),
    completed_at: run.completedAt?.toISOString() ?? null,
    requested_days: run.requestedDays,
    window_start: dateOnly(run.windowStart),
    window_end: dateOnly(run.windowEnd),
    route_version: run.routeVersion,
    api_requests: run.apiRequests,
    returned_rows: run.returnedRows,
    candidate_rows: run.candidateRows,
    matched_rows: run.matchedRows,
    stored_rows: run.storedRows,
  }
}

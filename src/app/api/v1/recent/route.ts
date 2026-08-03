import type { NextRequest } from 'next/server'
import { getRecentStatus, getRecentWorks, RECENT_MAX_PER_PAGE } from '@/lib/recent'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/recent
 *
 * The rolling live layer: recent Canadian works synced daily from the OpenAlex
 * API into recent_work, VISIBLY SEPARATE from the frozen frame. The same
 * functions serve the /recent page, so the two cannot drift. Records here
 * carry no classifier output of any kind; `meta.sync` reports the latest sync
 * run's status verbatim, including failures.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const num = (k: string, dflt: number) => {
    const v = Number(sp.get(k))
    return Number.isFinite(v) && v > 0 ? v : dflt
  }

  const [status, { rows, page, perPage }] = await Promise.all([
    getRecentStatus(),
    getRecentWorks(num('page', 1), num('per_page', 50)),
  ])

  return json(
    {
      meta: {
        page,
        per_page: perPage,
        max_per_page: RECENT_MAX_PER_PAGE,
        total: status.total,
        layer: 'live',
        note: 'Rolling live layer, separate from the frozen frame. No classifier output; no machine labels.',
        sync: status.lastRun
          ? {
              status: status.lastRun.status,
              started_at: status.lastRun.startedAt,
              completed_at: status.lastRun.completedAt,
              window_start: status.lastRun.windowStart,
              window_end: status.lastRun.windowEnd,
              route_version: status.lastRun.routeVersion,
              stored_rows: status.lastRun.storedRows,
            }
          : null,
      },
      results: rows.map((w) => ({
        id: w.id,
        doi: w.doi,
        title: w.title,
        publication_date: w.publicationDate,
        year: w.year,
        lang: w.lang,
        type: w.type,
        venue: w.venue,
        topic: w.topic,
        field: w.field,
        cited_by: w.citedBy,
        is_retracted: w.isRetracted,
        has_abstract: w.hasAbstract,
        routes: {
          ca_aff: w.routeCaAff,
          ca_fund: w.routeCaFund,
          ca_venue: w.routeCaVenue,
          about_ca: w.routeAboutCa,
        },
        ca_institutions: w.caInstitutions,
        funders: w.funders,
        keywords: w.keywords,
        authors: w.authors,
        route_version: w.routeVersion,
        synced_at: w.syncedAt,
      })),
    },
    { cache: 'public, s-maxage=300, stale-while-revalidate=3600' },
  )
}

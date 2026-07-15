import type { NextRequest } from 'next/server'
import { apiError, json, OPTIONS } from '@/lib/api'
import {
  RECENT_MAX_PER_PAGE,
  recentFiltersFromParams,
  recentSyncView,
  recentWorkView,
  searchRecentWorks,
} from '@/lib/recent'

export const dynamic = 'force-dynamic'
export { OPTIONS }

export async function GET(request: NextRequest) {
  const { filters, error } = recentFiltersFromParams(
    request.nextUrl.searchParams,
  )
  if (error) return apiError(error)

  const { rows, total, sync } = await searchRecentWorks(filters)
  return json({
    meta: {
      days: filters.days,
      page: filters.page,
      per_page: filters.perPage,
      max_per_page: RECENT_MAX_PER_PAGE,
      total,
      filters: {
        q: filters.q ?? null,
        route: filters.route ?? null,
        year: filters.year ?? null,
        type: filters.type ?? null,
        lang: filters.lang ?? null,
        has_abstract: filters.hasAbstract ?? null,
        institution: filters.institution ?? null,
        funder: filters.funder ?? null,
        keyword: filters.keyword ?? null,
        venue: filters.venue ?? null,
        topic: filters.topic ?? null,
        field: filters.field ?? null,
      },
      latest_sync: recentSyncView(sync.latest),
      last_successful_sync: recentSyncView(sync.lastSuccess),
      frozen_v1_release_unchanged: true,
    },
    results: rows.map(recentWorkView),
  })
}

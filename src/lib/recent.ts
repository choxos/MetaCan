import { prisma } from '@/lib/db'

/**
 * The live layer, shared by /recent and /api/v1/recent: one question, one
 * implementation, exactly like searchWorks().
 *
 * Honesty rules for this surface:
 *   - The count is COUNT(*) over recent_work, never a number in copy. An empty
 *     layer is reported as empty.
 *   - The sync status is the latest recent_sync_run row, verbatim. A failed
 *     run is shown as failed; the page never silently substitutes the last
 *     success's numbers for the latest attempt's.
 *   - Nothing in this table carries classifier output, so nothing downstream
 *     may render a category chip for a recent work.
 */

export interface RecentAuthor {
  name?: string
  [k: string]: unknown
}

export interface RecentStatus {
  total: number
  lastRun: {
    status: string
    startedAt: Date
    completedAt: Date | null
    windowStart: Date
    windowEnd: Date
    routeVersion: string
    storedRows: number
  } | null
  /** The latest run that actually completed successfully, if any. */
  lastSuccess: {
    completedAt: Date | null
    routeVersion: string
  } | null
}

export async function getRecentStatus(): Promise<RecentStatus> {
  const [total, lastRun, lastSuccess] = await Promise.all([
    prisma.recentWork.count(),
    prisma.recentSyncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.recentSyncRun.findFirst({ where: { status: 'succeeded' }, orderBy: { startedAt: 'desc' } }),
  ])
  return {
    total,
    lastRun: lastRun
      ? {
          status: lastRun.status,
          startedAt: lastRun.startedAt,
          completedAt: lastRun.completedAt,
          windowStart: lastRun.windowStart,
          windowEnd: lastRun.windowEnd,
          routeVersion: lastRun.routeVersion,
          storedRows: lastRun.storedRows,
        }
      : null,
    lastSuccess: lastSuccess
      ? { completedAt: lastSuccess.completedAt, routeVersion: lastSuccess.routeVersion }
      : null,
  }
}

export const RECENT_MAX_PER_PAGE = 100

export async function getRecentWorks(page = 1, perPage = 50) {
  const take = Math.min(Math.max(perPage, 1), RECENT_MAX_PER_PAGE)
  const p = Math.max(page, 1)
  const rows = await prisma.recentWork.findMany({
    orderBy: [{ publicationDate: 'desc' }, { id: 'asc' }],
    skip: (p - 1) * take,
    take,
  })
  return { rows, page: p, perPage: take }
}

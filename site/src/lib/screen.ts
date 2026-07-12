import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/**
 * The three-model screen. Shared by /screen and /api/v1/screened, for the same
 * reason searchWorks() is shared: one question, one implementation.
 */

export interface ScreenFilters {
  /** 0..3 — how many of the three models called the work metaresearch. */
  n_in?: number
  /** `true` = the disagreement dossier: every work ANY model called metaresearch. */
  contested_only?: boolean
  stratum?: string
  page?: number
  per_page?: number
}

export const MAX_PER_PAGE = 100

export function buildScreenWhere(f: ScreenFilters): Prisma.ScreenedWhereInput {
  const where: Prisma.ScreenedWhereInput = {}
  if (f.n_in !== undefined) where.nIn = f.n_in
  // The dossier: n_in >= 1. Any model saying "metaresearch" puts a work on the
  // boundary, and the boundary is the deliverable.
  else if (f.contested_only) where.nIn = { gte: 1 }
  if (f.stratum) where.stratum = f.stratum
  return where
}

export async function getScreened(f: ScreenFilters) {
  const perPage = Math.min(f.per_page ?? 51, MAX_PER_PAGE)
  const page = Math.max(f.page ?? 1, 1)
  const where = buildScreenWhere(f)

  const [rows, total] = await Promise.all([
    prisma.screened.findMany({
      where,
      // Contested first: n_in 2 and 1 are where the field's boundary actually is.
      // Within that, the settled 3/3 core, then the rejects.
      orderBy: [{ nIn: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.screened.count({ where }),
  ])

  return { rows, total, page, perPage }
}

/**
 * The screen's headline, computed from the labels rather than asserted.
 *
 * `pct_all_three` is the number this project exists to report: of the works ANY
 * model called metaresearch, the share ALL THREE agreed on. It is not 100%, and it
 * is not close to it.
 */
export interface ScreenSummary {
  n_screened: number
  n_in_0: number
  n_in_1: number
  n_in_2: number
  n_in_3: number
  /** The dossier: works at least one model called metaresearch. */
  any_in: number
  pct_all_three: number
  pct_single_model: number
  /** Each model's own count, which is how you see they are not interchangeable. */
  per_model: Array<{ model: string; called_in: number }>
  strata: Array<{ stratum: string; n: number }>
}

/**
 * The tiers that count as "in scope".
 *
 * T1 (core metaresearch) and T2 (metaresearch). T3 is ADJACENT, and it is NOT in
 * scope: the rubric's own `n_in` counts T1 and T2 only, verified against all 1,000
 * rows (zero mismatches). Counting T3 as "in" -- the obvious reading of "tier is
 * not OUT" -- makes each model's count larger than the union of all three, which is
 * arithmetically impossible and was exactly the bug this constant now prevents.
 */
export const IN_SCOPE_TIERS = ['T1', 'T2'] as const

export const getScreenSummary = unstable_cache(
  async (): Promise<ScreenSummary> => {
    const [c] = await prisma.$queryRaw<Array<Record<string, bigint>>>`
      SELECT COUNT(*)                                                  AS n,
             COUNT(*) FILTER (WHERE n_in = 0)                          AS n0,
             COUNT(*) FILTER (WHERE n_in = 1)                          AS n1,
             COUNT(*) FILTER (WHERE n_in = 2)                          AS n2,
             COUNT(*) FILTER (WHERE n_in = 3)                          AS n3,
             COUNT(*) FILTER (WHERE opus_tier IN ('T1','T2'))          AS opus,
             COUNT(*) FILTER (WHERE gpt_tier  IN ('T1','T2'))          AS gpt,
             COUNT(*) FILTER (WHERE grok_tier IN ('T1','T2'))          AS grok
      FROM screened`

    const strataRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT COALESCE(stratum, 'unknown') AS stratum, COUNT(*) AS n
      FROM screened GROUP BY 1 ORDER BY n DESC`

    const num = (v: unknown) => (typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : 0)

    const n1 = num(c?.n1)
    const n2 = num(c?.n2)
    const n3 = num(c?.n3)
    const any_in = n1 + n2 + n3

    return {
      n_screened: num(c?.n),
      n_in_0: num(c?.n0),
      n_in_1: n1,
      n_in_2: n2,
      n_in_3: n3,
      any_in,
      pct_all_three: any_in ? Number(((n3 / any_in) * 100).toFixed(1)) : 0,
      pct_single_model: any_in ? Number(((n1 / any_in) * 100).toFixed(1)) : 0,
      per_model: [
        { model: 'Claude Opus 4.8', called_in: num(c?.opus) },
        { model: 'GPT-5.6 (high)', called_in: num(c?.gpt) },
        { model: 'Grok 4.5', called_in: num(c?.grok) },
      ],
      strata: strataRows.map((r) => ({ stratum: String(r.stratum), n: num(r.n) })),
    }
  },
  ['mc:screen-summary'],
  { revalidate: 3600, tags: ['stats'] },
)

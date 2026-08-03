import type { NextRequest } from 'next/server'
import { savePermalink, filtersToQuery } from '@/lib/permalink'
import { cohortCount } from '@/lib/query'
import { SITE_URL } from '@/lib/lang'
import { json, filtersFromParams, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * POST /api/v1/permalink?<filters>  (GET works too, for curl users)
 *
 * Mint the citable /q/<hash> permalink for a filter state. Idempotent: the
 * hash is a function of the canonical filters, so the same cohort always gets
 * the same URL, no matter who asks or when. The response carries the counts as
 * of NOW, which is what a citation should quote.
 */
async function mint(req: NextRequest) {
  const f = filtersFromParams(req.nextUrl.searchParams)
  const { hash, filters } = await savePermalink(f)
  const { total, directLabeled, predicted } = await cohortCount(f)
  return json(
    {
      hash,
      url: `${SITE_URL}/q/${hash}`,
      filters,
      query: filtersToQuery(filters),
      total,
      direct_labels_cover: directLabeled,
      predictions_cover: predicted,
    },
    { cache: 'no-store' },
  )
}

export async function POST(req: NextRequest) {
  return mint(req)
}

export async function GET(req: NextRequest) {
  return mint(req)
}

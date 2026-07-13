import { getByRoute } from '@/lib/stats'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/stats/by-route
 *
 * Returns BOTH the marginals and the exact route combinations. The routes overlap,
 * so the marginals sum to more than the frame; publishing them alone would look
 * like an arithmetic error and would hide the overlap, which is the finding.
 */
export async function GET() {
  const data = await getByRoute()
  return json({
    meta: {
      total: data.total,
      no_aff: data.no_aff,
      note: 'Routes are NOT mutually exclusive: a work can be admitted by several, so `marginals` sums to more than `total`. `combinations` counts each work exactly once and sums to `total`.',
    },
    marginals: data.marginals,
    combinations: data.combinations,
  })
}

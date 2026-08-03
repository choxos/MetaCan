import type { NextRequest } from 'next/server'
import { json, OPTIONS } from '@/lib/api'
import { getEgoNetwork, getNetworkOverview, getNetworkStats } from '@/lib/network'
import { AUTHOR_LAYER, SNAPSHOT } from '@/lib/permalink'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/network                     -> the overview graph (strongest ties)
 * GET /api/v1/network?author_id=A...      -> one researcher's neighborhood
 *
 * The Canada-only collaboration network: nodes are researchers with a
 * Canadian-affiliated authorship on a frame work, edges exist only where BOTH
 * authorships on the shared work were Canadian-affiliated. The meta block
 * carries the definitions and the density guard, because a graph whose
 * construction rules are not in the response is not citable.
 */
export async function GET(req: NextRequest) {
  const authorId = (req.nextUrl.searchParams.get('author_id') ?? '').trim()
  const stats = await getNetworkStats()

  const meta = {
    snapshot: SNAPSHOT,
    author_layer_release: AUTHOR_LAYER.release,
    nodes: 'researchers with >= 1 Canadian-affiliated authorship on a frame work',
    edges: 'coauthorship where BOTH authorships on the shared work were Canadian-affiliated',
    weight: 'sum over shared works of 1/(n_authors - 1) (Newman fractional counting)',
    density_guard: stats.meta
      ? `works with more than ${stats.meta.maxCaAuthors} Canadian-affiliated authorships are excluded from edges (${stats.meta.worksExcluded} works)`
      : null,
    ca_authors: stats.caAuthors,
    ca_edges: stats.caEdges,
    available: stats.available,
  }

  if (!stats.available) return json({ meta, graph: null })

  if (authorId) {
    const graph = await getEgoNetwork(authorId)
    if (!graph) return json({ meta, graph: null, error: 'unknown author_id' }, { status: 404 })
    return json({ meta, center: authorId, graph })
  }

  const graph = await getNetworkOverview()
  return json({ meta, graph })
}

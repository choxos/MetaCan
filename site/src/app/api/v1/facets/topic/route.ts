import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/facets/topic?q=<text>
 *
 * Search-as-you-type over the ~4,500 distinct OpenAlex primary topics, backed
 * by the facet_topic derived table (indexes.sql). Same contract as the venue
 * facet: value plus its frame-wide count.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return json({ results: [] })

  const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
  const rows = await prisma.$queryRaw<Array<{ topic: string; works: number }>>`
    SELECT topic, works FROM facet_topic
    WHERE topic ILIKE ${pattern}
    ORDER BY works DESC, topic ASC
    LIMIT 12`

  return json({ results: rows.map((r) => ({ value: r.topic, works: r.works })) })
}

import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/facets/venue?q=<text>
 *
 * Search-as-you-type over the ~85,000 distinct venues. Backed by facet_venue,
 * a tiny derived table (indexes.sql) an ILIKE scans in milliseconds; the works
 * table is never touched. The count alongside each venue is its size in the
 * whole frame, so the picker doubles as a rough landscape.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return json({ results: [] })

  // Escape LIKE metacharacters: a venue search for "100%" means the literal.
  const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
  const rows = await prisma.$queryRaw<Array<{ venue: string; works: number }>>`
    SELECT venue, works FROM facet_venue
    WHERE venue ILIKE ${pattern}
    ORDER BY works DESC, venue ASC
    LIMIT 12`

  return json({ results: rows.map((r) => ({ value: r.venue, works: r.works })) })
}

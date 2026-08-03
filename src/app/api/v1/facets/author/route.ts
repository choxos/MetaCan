import type { NextRequest } from 'next/server'
import { json, OPTIONS } from '@/lib/api'
import { searchCaAuthors } from '@/lib/network'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/facets/author?q=<text>
 *
 * Search-as-you-type over researchers with at least one Canadian-affiliated
 * authorship, ranked by their Canadian output. Returns the DISAMBIGUATED
 * identity (the OpenAlex A-id) next to each name, because a name is a broad
 * net: the id is what the ?author_id= filter and the network page consume.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return json({ results: [] })

  const rows = await searchCaAuthors(q)
  return json({
    results: rows.map((r) => ({ id: r.id, name: r.name, ca_works: r.caWorks })),
  })
}

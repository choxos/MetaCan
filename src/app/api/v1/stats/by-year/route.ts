import { getByYear } from '@/lib/stats'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/stats/by-year
 * Works per year, with the no-affiliation and no-abstract counts alongside, because
 * both gaps move over time and a bare total would hide that.
 */
export async function GET() {
  const data = await getByYear()
  return json({ meta: { points: data.length }, results: data })
}

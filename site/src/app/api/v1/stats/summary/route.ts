import { getSummary } from '@/lib/stats'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/** GET /api/v1/stats/summary — the frame in one object. Same query the home page runs. */
export async function GET() {
  return json(await getSummary())
}

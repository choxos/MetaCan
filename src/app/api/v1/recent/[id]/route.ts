import { apiError, json, OPTIONS } from '@/lib/api'
import { getRecentWork, recentWorkView } from '@/lib/recent'

export const dynamic = 'force-dynamic'
export { OPTIONS }

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const work = await getRecentWork(id)
  if (!work) return apiError('Recent work not found', 404)
  return json(recentWorkView(work))
}

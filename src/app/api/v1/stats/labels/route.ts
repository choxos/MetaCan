import { getLabelStats } from '@/lib/stats'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/stats/labels
 *
 * The label landscape: coverage, categories, study designs, year and language
 * over the machine-labelled subset. Same function the Landscape page renders,
 * so the two cannot drift. `meta.status` states what these labels are; nothing
 * downstream may soften it, and no count here is a frame total.
 */
export async function GET() {
  const stats = await getLabelStats()
  return json({
    meta: {
      status: 'machine label (frontier LLM, unvalidated)',
      note: 'Counts are over the labelled subset only. An unlabelled work is NOT a negative; the label table is sparse and grows as labelling rounds land.',
    },
    ...stats,
  })
}

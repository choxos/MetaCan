import { getByField, getByLanguage, getAbstractGapByType, getTopVenues, getTopFunders, getRetractionStates } from '@/lib/stats'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/stats/by-field
 *
 * The field breakdown, plus the other frame-wide cuts the analytics page draws, so
 * a consumer can rebuild every chart from one call rather than six.
 */
export async function GET() {
  const [fields, languages, abstract_gap_by_type, top_venues, top_funders, retraction_states] = await Promise.all([
    getByField(),
    getByLanguage(),
    getAbstractGapByType(),
    getTopVenues(),
    getTopFunders(),
    getRetractionStates(),
  ])
  return json({
    meta: {
      note: 'retraction_states has FOUR values. OpenAlex records retraction as a boolean, so it can express one of them and reports the other three as false.',
    },
    fields,
    languages,
    abstract_gap_by_type,
    top_venues,
    top_funders,
    retraction_states,
  })
}

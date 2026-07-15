import type { NextRequest } from 'next/server'
import { getScreened, getScreenSummary, MAX_PER_PAGE, type ScreenFilters } from '@/lib/screen'
import { json, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/screened
 *
 * `?contested_only=1` returns the disagreement dossier: every work ANY model called
 * metaresearch. That subset, not the base rate, is the project's deliverable, so it
 * is one query parameter away.
 *
 * Same `getScreened()` the /screen page calls.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const num = (k: string) => {
    const v = sp.get(k)
    if (v === null || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  const f: ScreenFilters = {
    n_in: num('n_in'),
    contested_only: sp.get('contested_only') === '1',
    stratum: sp.get('stratum') ?? undefined,
    page: num('page'),
    per_page: num('per_page'),
  }

  const [{ rows, total, page, perPage }, summary] = await Promise.all([getScreened(f), getScreenSummary()])

  return json({
    meta: {
      evidence_status: 'historical_unvalidated_machine_pilot',
      screen_round: 'historical_pilot',
      models: ['gpt', 'grok', 'opus'],
      page,
      per_page: perPage,
      max_per_page: MAX_PER_PAGE,
      total,
      filters: f,
      genre_field: {
        status: 'raw_unusable_historical_output',
        exposed_as: 'genre_raw',
        note: 'The historical arms received contradictory genre vocabularies. These raw values are not comparable and must not be interpreted as classifications.',
      },
      // The headline, so a consumer of the API cannot miss the point of the table.
      summary: {
        n_screened: summary.n_screened,
        any_model_said_in: summary.any_in,
        all_three_agreed: summary.n_in_3,
        pct_all_three: summary.pct_all_three,
        one_model_only: summary.n_in_1,
        pct_single_model: summary.pct_single_model,
        note: `In this historical unvalidated machine pilot, ${summary.any_in} works received at least one metaresearch label and ${summary.n_in_3} (${summary.pct_all_three}%) received that label from all three models. These are model-agreement counts, not validated field labels. The sample is stratified: any descriptive rate must use the design weight.`,
        tiers: 'n_in counts historical pilot T1 and T2 model labels. T3 is the pilot adjacent label. These machine labels do not establish scientific inclusion.',
        per_model_in_scope: summary.per_model,
      },
    },
    results: rows.map((r) => ({
      id: r.id,
      title: r.title,
      year: r.year,
      lang: r.lang,
      type: r.type,
      venue: r.venue,
      topic: r.topic,
      field: r.field,
      stratum: r.stratum,
      stratum_n: r.stratumN,
      /** Design weight (inverse selection probability). Ignore it and your rate is wrong. */
      weight: r.weight,
      n_in: r.nIn,
      opus: { tier: r.opusTier, genre_raw: r.opusGenre, about_ca: r.opusAboutCa, confidence: r.opusConfidence, reason: r.opusReason },
      gpt: { tier: r.gptTier, genre_raw: r.gptGenre, about_ca: r.gptAboutCa, confidence: r.gptConfidence, reason: r.gptReason },
      grok: { tier: r.grokTier, genre_raw: r.grokGenre, about_ca: r.grokAboutCa, confidence: r.grokConfidence, reason: r.grokReason },
    })),
  })
}

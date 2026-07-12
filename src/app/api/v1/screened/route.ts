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
      page,
      per_page: perPage,
      max_per_page: MAX_PER_PAGE,
      total,
      filters: f,
      // The headline, so a consumer of the API cannot miss the point of the table.
      summary: {
        n_screened: summary.n_screened,
        any_model_said_in: summary.any_in,
        all_three_agreed: summary.n_in_3,
        pct_all_three: summary.pct_all_three,
        one_model_only: summary.n_in_1,
        pct_single_model: summary.pct_single_model,
        note: `Of the ${summary.any_in} works ANY model called metaresearch, only ${summary.n_in_3} (${summary.pct_all_three}%) were called metaresearch by all three. The sample is stratified: any rate computed from it must use the design weight.`,
        tiers: 'T1 (core metaresearch) and T2 (metaresearch) count as IN SCOPE. T3 is ADJACENT and does NOT: n_in counts T1 and T2 only. Treating "tier != OUT" as in-scope will give you a per-model count larger than the union of all three, which is impossible.',
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
      opus: { tier: r.opusTier, genre: r.opusGenre, about_ca: r.opusAboutCa, confidence: r.opusConfidence, reason: r.opusReason },
      gpt: { tier: r.gptTier, genre: r.gptGenre, about_ca: r.gptAboutCa, confidence: r.gptConfidence, reason: r.gptReason },
      grok: { tier: r.grokTier, genre: r.grokGenre, about_ca: r.grokAboutCa, confidence: r.grokConfidence, reason: r.grokReason },
    })),
  })
}

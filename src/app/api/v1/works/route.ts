import type { NextRequest } from 'next/server'
import { searchWorks, MAX_PER_PAGE } from '@/lib/query'
import { json, filtersFromParams, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/works
 *
 * Calls the SAME `searchWorks()` the browse page calls. That is a hard rule on
 * this project: a public API that answers a different question from the page above
 * it is a bug nobody notices for a year.
 */
export async function GET(req: NextRequest) {
  const f = filtersFromParams(req.nextUrl.searchParams)
  const { rows, total, page, perPage, capped } = await searchWorks(f)

  return json({
    meta: {
      page,
      per_page: perPage,
      max_per_page: MAX_PER_PAGE,
      // Counting 4.3M rows exactly is slow and nobody reads the number, so the
      // count is capped. `capped: true` means "at least this many", not "exactly".
      total: capped ? 10_000 : total,
      total_is_capped: capped,
      filters: f,
    },
    results: rows.map((w) => ({
      id: w.id,
      doi: w.doi,
      title: w.title,
      year: w.year,
      lang: w.lang,
      type: w.type,
      venue: w.venue,
      topic: w.topic,
      field: w.field,
      cited_by: w.citedBy,
      is_retracted: w.isRetracted,
      has_abstract: w.hasAbstract,
      // Provenance: why this work is in the frame at all.
      routes: {
        ca_aff: w.routeCaAff,
        ca_fund: w.routeCaFund,
        ca_venue: w.routeCaVenue,
        about_ca: w.routeAboutCa,
      },
      retraction: w.retraction
        ? { nature: w.retraction.nature, openalex_flagged: w.retraction.openalexFlagged }
        : null,
      screen: w.screened
        ? {
            n_in: w.screened.nIn,
            opus_tier: w.screened.opusTier,
            gpt_tier: w.screened.gptTier,
            grok_tier: w.screened.grokTier,
          }
        : null,
    })),
  })
}

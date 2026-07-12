import type { NextRequest } from 'next/server'
import { getWork, fetchAbstract } from '@/lib/query'
import { json, apiError, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/works/:id
 *
 * `?abstract=1` fetches the abstract live from OpenAlex. It is off by default
 * because it costs an upstream round-trip: abstracts are not in this database (the
 * inverted indexes are 8.6 GB of the frame's 9.3 GB of text, and the host has
 * 13 GB free), so asking for one is asking us to call OpenAlex on your behalf.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const w = await getWork(params.id)
  if (!w) return apiError(`No work ${params.id} in the frame.`, 404)

  const wantAbstract = req.nextUrl.searchParams.get('abstract') === '1'
  const abstract = wantAbstract ? (w.screened?.abstract ?? (await fetchAbstract(w.id))) : undefined

  const s = w.screened

  return json({
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
    ca_institutions: w.caInstitutions,
    funders: w.funders,
    keywords: w.keywords,

    routes: {
      ca_aff: w.routeCaAff,
      ca_fund: w.routeCaFund,
      ca_venue: w.routeCaVenue,
      about_ca: w.routeAboutCa,
      /** The frame's whole argument: an affiliation-only design never sees these. */
      invisible_to_affiliation_only: !w.routeCaAff,
    },

    ...(wantAbstract ? { abstract, abstract_source: s?.abstract ? 'screening record' : 'openalex (live)' } : {}),

    retraction: w.retraction
      ? {
          nature: w.retraction.nature,
          reason: w.retraction.reason,
          date: w.retraction.retractionDate,
          openalex_flagged: w.retraction.openalexFlagged,
        }
      : null,

    screen: s
      ? {
          n_in: s.nIn,
          stratum: s.stratum,
          weight: s.weight,
          opus: { tier: s.opusTier, genre: s.opusGenre, about_ca: s.opusAboutCa, confidence: s.opusConfidence, reason: s.opusReason },
          gpt: { tier: s.gptTier, genre: s.gptGenre, about_ca: s.gptAboutCa, confidence: s.gptConfidence, reason: s.gptReason },
          grok: { tier: s.grokTier, genre: s.grokGenre, about_ca: s.grokAboutCa, confidence: s.grokConfidence, reason: s.grokReason },
        }
      : null,
  })
}

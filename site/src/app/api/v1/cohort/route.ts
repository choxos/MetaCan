import type { NextRequest } from 'next/server'
import { cohortSearch, labelAgreement, MAX_PER_PAGE } from '@/lib/query'
import { canonicalFilters, hashFilters, SNAPSHOT } from '@/lib/permalink'
import { json, filtersFromParams, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/cohort
 *
 * The cohort builder's own query, as an API. Same parser, same `cohortSearch()`
 * the front page calls, so the API cannot answer a different question from the
 * page above it. Three things distinguish it from /api/v1/works:
 *
 *   1. `total` is EXACT (a cohort is cited by its N; "10,000+" is not an N).
 *   2. `labels_cover` reports how many works in THIS cohort carry labels,
 *      because the label table is sparse and no reader may mistake "no label"
 *      for "not in the category".
 *   3. Every result carries its label rows, their agreement, and the
 *      provisional score with its validation status, verbatim.
 */
export async function GET(req: NextRequest) {
  const f = filtersFromParams(req.nextUrl.searchParams)
  const { rows, total, labeled, page, perPage } = await cohortSearch(f)

  return json({
    meta: {
      page,
      per_page: perPage,
      max_per_page: MAX_PER_PAGE,
      total,
      total_is_capped: false,
      // The label table is sparse ON PURPOSE. `labels_cover` works out of
      // `total` carry at least one machine label; the rest are UNLABELLED,
      // which is not a negative label.
      labels_cover: labeled,
      label_status: 'machine label (frontier LLM, unvalidated)',
      score_status: 'score_only:v0-immature-baseline (scores rank; they never assert a category)',
      snapshot: {
        source: 'OpenAlex, pinned release, all 482 partitions',
        release: SNAPSHOT.release,
        frame_built: SNAPSHOT.built,
      },
      query_hash: hashFilters(f),
      filters: canonicalFilters(f),
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
      routes: {
        ca_aff: w.routeCaAff,
        ca_fund: w.routeCaFund,
        ca_venue: w.routeCaVenue,
        about_ca: w.routeAboutCa,
      },
      ca_institutions: w.caInstitutions,
      funders: w.funders,
      keywords: w.keywords,
      retraction: w.retraction
        ? { nature: w.retraction.nature, openalex_flagged: w.retraction.openalexFlagged }
        : null,
      screen_n_in: w.screened?.nIn ?? null,
      score: w.score
        ? {
            opus: w.score.scoreOpus,
            gpt: w.score.scoreGpt,
            spread: w.score.scoreSpread,
            validation_status: w.score.validationStatus,
          }
        : null,
      // Which models labelled it, what they said, and whether they agree.
      // An empty array means UNLABELLED, never "not in any category".
      labels: w.labels.map((l) => ({
        model: l.model,
        categories: l.categories,
        domain: l.domain,
        study_design: l.studyDesign,
        genre: l.genre,
        about_ca_system: l.aboutCaSystem,
        about_ca_topic: l.aboutCaTopic,
        confidence: l.confidence,
      })),
      label_agreement: labelAgreement(w.labels),
    })),
  })
}

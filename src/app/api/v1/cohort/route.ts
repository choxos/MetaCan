import type { NextRequest } from 'next/server'
import { cohortSearch, labelAgreement, MAX_PER_PAGE } from '@/lib/query'
import { AUTHOR_LAYER, canonicalFilters, hashFilters, SNAPSHOT } from '@/lib/permalink'
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
 *   2. `direct_labels_cover` and `predictions_cover` report evidence coverage,
 *      because the label table is sparse and no reader may mistake "no label"
 *      for "not in the category".
 *   3. Every result carries its label rows, their agreement, and the
 *      provisional score with its validation status, verbatim.
 */
export async function GET(req: NextRequest) {
  const f = filtersFromParams(req.nextUrl.searchParams)
  const { rows, total, directLabeled, predicted, page, perPage } = await cohortSearch(f)

  return json({
    meta: {
      page,
      per_page: perPage,
      max_per_page: MAX_PER_PAGE,
      total,
      total_is_capped: false,
      // The label table is sparse ON PURPOSE. `direct_labels_cover` works out of
      // `total` carry at least one machine label; the rest are UNLABELED,
      // which is not a negative label.
      direct_labels_cover: directLabeled,
      predictions_cover: predicted,
      direct_label_status: 'direct model label, unvalidated',
      prediction_status: 'machine_predicted_unvalidated (Codex and Gemma teacher distillation)',
      score_status: 'score_only:v0-immature-baseline (scores rank; they never assert a category)',
      snapshot: {
        source: 'OpenAlex, pinned release, all 482 partitions',
        release: SNAPSHOT.release,
        frame_built: SNAPSHOT.built,
        author_layer_release: AUTHOR_LAYER.release,
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
      // The byline from the author layer. An empty array means the release
      // records no disambiguated authorships for this work.
      authors: w.authors.map((a) => ({ name: a.name, is_ca: a.is_ca })),
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
      prediction: w.prediction
        ? {
            model_version: w.prediction.modelVersion,
            candidate_categories: w.prediction.candidateCategories,
            consensus_categories: w.prediction.consensusCategories,
            category_scores_codex: w.prediction.categoryScoresCodex,
            category_scores_gemma: w.prediction.categoryScoresGemma,
            about_ca_system_candidate: w.prediction.aboutCaSystemCandidate,
            about_ca_system_consensus: w.prediction.aboutCaSystemConsensus,
            about_ca_system_score_codex: w.prediction.aboutCaSystemScoreCodex,
            about_ca_system_score_gemma: w.prediction.aboutCaSystemScoreGemma,
            about_ca_topic_candidate: w.prediction.aboutCaTopicCandidate,
            about_ca_topic_consensus: w.prediction.aboutCaTopicConsensus,
            about_ca_topic_score_codex: w.prediction.aboutCaTopicScoreCodex,
            about_ca_topic_score_gemma: w.prediction.aboutCaTopicScoreGemma,
            domain_scores_codex: w.prediction.domainScoresCodex,
            domain_scores_gemma: w.prediction.domainScoresGemma,
            domain_codex: w.prediction.domainCodex,
            domain_gemma: w.prediction.domainGemma,
            domain_candidate: w.prediction.domainCandidate,
            domain_consensus: w.prediction.domainConsensus,
            study_design_codex: w.prediction.studyDesignCodex,
            study_design_gemma: w.prediction.studyDesignGemma,
            study_design_scores_codex: w.prediction.studyDesignScoresCodex,
            study_design_scores_gemma: w.prediction.studyDesignScoresGemma,
            study_design_candidate: w.prediction.studyDesignCandidate,
            study_design_consensus: w.prediction.studyDesignConsensus,
            genre_codex: w.prediction.genreCodex,
            genre_gemma: w.prediction.genreGemma,
            genre_scores_codex: w.prediction.genreScoresCodex,
            genre_scores_gemma: w.prediction.genreScoresGemma,
            genre_candidate: w.prediction.genreCandidate,
            genre_consensus: w.prediction.genreConsensus,
            teacher_disagreement_score: w.prediction.teacherDisagreementScore,
            threshold_uncertainty_score: w.prediction.thresholdUncertaintyScore,
            prediction_status: w.prediction.predictionStatus,
          }
        : null,
      // Which models labeled it, what they said, and whether they agree.
      // An empty array means UNLABELED, never "not in any category".
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

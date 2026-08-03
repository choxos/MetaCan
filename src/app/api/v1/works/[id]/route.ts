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

    direct_labels: w.labels.map((label) => ({
      model: label.model,
      categories: label.categories,
      domain: label.domain,
      study_design: label.studyDesign,
      genre: label.genre,
      about_ca_system: label.aboutCaSystem,
      about_ca_topic: label.aboutCaTopic,
      confidence: label.confidence,
      status: 'direct model label, unvalidated',
    })),

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

    // The machine scores are a PROVISIONAL BASELINE from an immature model
    // (pilot/results/maturity.json: passed = false), and they never ship without
    // saying so. A score orders works for review; it does not assert a category,
    // and `validation_status` arrives verbatim from the scoring run.
    machine_scores: w.score
      ? {
          provisional: true,
          baseline: true,
          maturity_gate_passed: false,
          score_opus: w.score.scoreOpus,
          score_gpt: w.score.scoreGpt,
          score_spread: w.score.scoreSpread,
          validation_status: w.score.validationStatus,
          note: 'Baseline scores from an immature model (maturity gate not passed). Scores rank; they never assert a category.',
        }
      : null,
  })
}

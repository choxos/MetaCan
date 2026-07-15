import type { NextRequest } from "next/server";
import { getWork } from "@/lib/query";
import { fetchAbstract } from "@/lib/abstracts";
import { json, apiError, OPTIONS } from "@/lib/api";
import {
  classifierMeta,
  predictionView,
  resolveClassifierContext,
} from "@/lib/predictions";
import { filterValidationMessage, type WorkFilters } from "@/lib/work-filters";

export const dynamic = "force-dynamic";
export { OPTIONS };

/**
 * GET /api/v1/works/:id
 *
 * `?abstract=1` fetches the abstract from PubMed, Europe PMC, or OpenAlex. It is off by default
 * because it costs an upstream round-trip: abstracts are not in this database (the
 * inverted indexes are 8.6 GB of the frame's 9.3 GB of text, and the host has
 * 13 GB free), so asking for one requires a call to an upstream source.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const classifierFilters: WorkFilters = {
    label_source: "classifier",
    classifier_version:
      req.nextUrl.searchParams.get("classifier_version") ?? undefined,
  };
  const invalid = filterValidationMessage(classifierFilters);
  if (invalid) return apiError(invalid, 400);
  const classifier = await resolveClassifierContext(classifierFilters, true);
  const w = await getWork(params.id, classifier);
  if (!w) return apiError(`No work ${params.id} in the frame.`, 404);

  const wantAbstract = req.nextUrl.searchParams.get("abstract") === "1";
  const enrichment = wantAbstract ? await fetchAbstract(w.id, w.doi) : undefined;
  const abstract = enrichment?.text
    ? enrichment
    : w.screened?.abstract
      ? ({ text: w.screened.abstract, source: "screening_record" } as const)
      : null;

  const s = w.screened;

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

    ...(wantAbstract
      ? {
          abstract: abstract?.text ?? null,
          abstract_source: abstract?.source ?? null,
          pmid: enrichment?.pmid ?? null,
          pmcid: enrichment?.pmcid ?? null,
          canadian_authors: enrichment?.authors ?? [],
        }
      : {}),

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
          opus: {
            tier: s.opusTier,
            genre: s.opusGenre,
            about_ca: s.opusAboutCa,
            confidence: s.opusConfidence,
            reason: s.opusReason,
          },
          gpt: {
            tier: s.gptTier,
            genre: s.gptGenre,
            about_ca: s.gptAboutCa,
            confidence: s.gptConfidence,
            reason: s.gptReason,
          },
          grok: {
            tier: s.grokTier,
            genre: s.grokGenre,
            about_ca: s.grokAboutCa,
            confidence: s.grokConfidence,
            reason: s.grokReason,
          },
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
          note: "Baseline scores from an immature model (maturity gate not passed). Scores rank; they never assert a category.",
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
    })),
    classifier: classifierMeta(classifier),
    prediction: predictionView(w.predictions[0], classifier),
  });
}

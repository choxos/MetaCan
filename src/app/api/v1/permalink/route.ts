import type { NextRequest } from "next/server";
import { savePermalink, filtersToQuery } from "@/lib/permalink";
import { cohortCount } from "@/lib/query";
import { SITE_URL } from "@/lib/lang";
import {
  apiError,
  json,
  filtersFromParams,
  invalidFilterResponse,
  OPTIONS,
} from "@/lib/api";
import {
  classifierMeta,
  pinClassifierFilters,
  resolveClassifierContext,
} from "@/lib/predictions";

export const dynamic = "force-dynamic";
export { OPTIONS };

/**
 * POST /api/v1/permalink?<filters>
 *
 * Mint the citable /q/<hash> permalink for a filter state. Idempotent: the
 * hash is a function of the canonical filters, so the same cohort always gets
 * the same URL, no matter who asks or when. The response carries the counts as
 * of NOW, which is what a citation should quote.
 */
async function mint(req: NextRequest) {
  let f = filtersFromParams(req.nextUrl.searchParams);
  const invalid = invalidFilterResponse(f);
  if (invalid) return invalid;
  const classifier = await resolveClassifierContext(f);
  if (f.label_source === "classifier" && !classifier.available) {
    return apiError(
      classifier.warning ?? "Classifier release is unavailable.",
      409,
    );
  }
  f = pinClassifierFilters(f, classifier);
  const { hash, filters } = await savePermalink(f);
  const { total, labeled, classified } = await cohortCount(f, classifier);
  return json(
    {
      hash,
      url: `${SITE_URL}/q/${hash}`,
      filters,
      query: filtersToQuery(filters),
      total,
      labels_cover: labeled,
      classified_cover: classified,
      classifier: classifierMeta(classifier),
    },
    { cache: "no-store" },
  );
}

export async function POST(req: NextRequest) {
  return mint(req);
}

export function GET() {
  return json(
    { error: "Method not allowed. Create a permalink with POST." },
    {
      status: 405,
      cache: "no-store",
      headers: { Allow: "POST, OPTIONS" },
    },
  );
}

import { NextResponse } from "next/server";
import { LABEL_CATEGORIES, STUDY_DESIGNS, type WorkFilters } from "@/lib/query";
import { filterValidationMessage } from "@/lib/work-filters";

/**
 * The public API's response envelope.
 *
 * CORS is open (`*`) on purpose. The dataset is public under CC BY, and other
 * sites can query it without maintaining a proxy. The sole write operation
 * creates an idempotent permalink for a canonical public query.
 */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function json(
  data: unknown,
  init?: { status?: number; cache?: string; headers?: HeadersInit },
) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      ...CORS,
      "Cache-Control":
        init?.cache ?? "public, s-maxage=3600, stale-while-revalidate=86400",
      ...init?.headers,
    },
  });
}

export function apiError(message: string, status = 400) {
  return json({ error: message }, { status, cache: "no-store" });
}

export function invalidFilterResponse(filters: WorkFilters) {
  const message = filterValidationMessage(filters);
  return message ? apiError(message, 400) : null;
}

/** Preflight. Every route re-exports this. */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * Parse `WorkFilters` out of a URL's query string.
 *
 * The browse page and the API MUST agree on what `?route=no_aff` means, so both
 * ultimately hand a `WorkFilters` to the same `searchWorks()`. This is the API's
 * half of that contract. When a parameter is repeated, both surfaces use its
 * first value, following URLSearchParams.get().
 */
export function filtersFromParams(sp: URLSearchParams): WorkFilters {
  let parseError: string | undefined;
  const reject = (message: string) => {
    parseError ??= message;
    return undefined;
  };
  const s = (k: string) => {
    const v = sp.get(k);
    return v !== null && v.length > 0 ? v : undefined;
  };
  const integer = (k: string, min: number, max: number) => {
    const v = s(k);
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max
      ? n
      : reject(`${k} must be a whole number from ${min} through ${max}.`);
  };
  const boolean = (k: string) => {
    const v = s(k);
    if (v === undefined) return undefined;
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
    return reject(`${k} must be 1, 0, true, or false.`);
  };
  const enumValue = <T extends string>(k: string, values: readonly T[]) => {
    const v = s(k);
    if (v === undefined) return undefined;
    const match = values.find((candidate) => candidate === v);
    return match ?? reject(`${k} must be one of ${values.join(", ")}.`);
  };

  const route = enumValue("route", ["aff", "fund", "venue", "about", "no_aff"] as const);
  const sort = enumValue("sort", ["relevance", "cited", "year_desc", "year_asc"] as const);
  const abstract = enumValue("abstract", ["has", "none"] as const);
  const agreement = enumValue("agreement", ["any", "all"] as const);
  const category = enumValue("category", LABEL_CATEGORIES);
  const design = enumValue("design", STUDY_DESIGNS);
  const labelSource = enumValue("label_source", ["direct", "classifier"] as const);
  const labelMode = enumValue("label_mode", ["candidate", "consensus"] as const);

  const boundedString = (k: string, max: number) => {
    const v = s(k)?.trim();
    if (v === undefined) return undefined;
    return v.length <= max
      ? v
      : reject(`${k} must contain at most ${max} characters.`);
  };

  const filters: WorkFilters = {
    q: boundedString("q", 200),
    year_from: integer("year_from", 1000, 9999),
    year_to: integer("year_to", 1000, 9999),
    lang: boundedString("lang", 16),
    type: boundedString("type", 100),
    field: boundedString("field", 300),
    topic: boundedString("topic", 300),
    venue: boundedString("venue", 300),
    institution: boundedString("institution", 300),
    funder: boundedString("funder", 300),
    keyword: boundedString("keyword", 300),
    route,
    route_aff: boolean("route_aff"),
    route_fund: boolean("route_fund"),
    route_venue: boolean("route_venue"),
    route_about: boolean("route_about"),
    retracted: boolean("retracted"),
    no_abstract: boolean("no_abstract"),
    abstract,
    n_in: integer("n_in", 0, 3),
    category,
    design,
    agreement,
    labeled: boolean("labeled"),
    label_source: labelSource,
    label_mode: labelMode,
    classified: boolean("classified"),
    classifier_version: boundedString("classifier_version", 64),
    sort,
    page: integer("page", 1, 1_000_000),
    per_page: integer("per_page", 1, 100),
  };
  if (parseError) filters.parse_error = parseError;
  return filters;
}

/**
 * The same parser, over Next's `searchParams` object. The cohort page and the
 * API MUST parse identically, so the page adapts its record into
 * URLSearchParams and calls the one parser instead of growing a twin.
 */
export function filtersFromRecord(
  sp: Record<string, string | string[] | undefined>,
): WorkFilters {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") {
      usp.append(k, v);
      continue;
    }
    for (const item of v ?? []) usp.append(k, item);
  }
  return filtersFromParams(usp);
}

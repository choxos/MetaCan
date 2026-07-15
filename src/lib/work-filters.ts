import { LABEL_CATEGORIES, STUDY_DESIGNS } from "@/lib/labels";
import { Prisma } from "@prisma/client";

export interface WorkFilters {
  parse_error?: string;
  q?: string;
  year_from?: number;
  year_to?: number;
  lang?: string;
  type?: string;
  field?: string;
  topic?: string;
  venue?: string;
  institution?: string;
  funder?: string;
  keyword?: string;
  route?: "aff" | "fund" | "venue" | "about" | "no_aff";
  route_aff?: boolean;
  route_fund?: boolean;
  route_venue?: boolean;
  route_about?: boolean;
  retracted?: boolean;
  no_abstract?: boolean;
  abstract?: "has" | "none";
  n_in?: number;
  category?: string;
  design?: string;
  agreement?: "any" | "all";
  labeled?: boolean;
  label_source?: "direct" | "classifier";
  label_mode?: "candidate" | "consensus";
  classified?: boolean;
  classifier_version?: string;
  sort?: "relevance" | "cited" | "year_desc" | "year_asc";
  page?: number;
  per_page?: number;
}

export const MAX_PER_PAGE = 100;
export const COUNT_CAP = 10_000;
export const EXPORT_CAP = 100_000;

function tsquery(q: string): Prisma.Sql {
  return Prisma.sql`websearch_to_tsquery('simple', ${q})`;
}

function directLabelConditions(filters: WorkFilters): Prisma.Sql[] {
  const result: Prisma.Sql[] = [];
  if (
    filters.category &&
    (LABEL_CATEGORIES as readonly string[]).includes(filters.category)
  ) {
    result.push(
      Prisma.sql`EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id AND ${filters.category} = ANY(wl.categories))`,
    );
    if (filters.agreement === "all") {
      result.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id AND NOT (${filters.category} = ANY(wl.categories)))`,
      );
    }
  }
  if (
    filters.design &&
    (STUDY_DESIGNS as readonly string[]).includes(filters.design)
  ) {
    result.push(
      Prisma.sql`EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id AND wl.study_design = ${filters.design})`,
    );
    if (filters.agreement === "all") {
      result.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id AND wl.study_design IS DISTINCT FROM ${filters.design})`,
      );
    }
  }
  if (filters.labeled === true) {
    result.push(
      Prisma.sql`EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id)`,
    );
  }
  if (filters.labeled === false) {
    result.push(
      Prisma.sql`NOT EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id)`,
    );
  }
  return result;
}

function classifierConditions(
  filters: WorkFilters,
  version: string | null,
): Prisma.Sql[] {
  const result: Prisma.Sql[] = [];
  if (!version) {
    result.push(Prisma.sql`FALSE`);
    return result;
  }
  const targetColumn =
    filters.label_mode === "consensus" ? "consensus" : "candidate";
  for (const target of [filters.category, filters.design]) {
    if (!target) continue;
    result.push(
      targetColumn === "consensus"
        ? Prisma.sql`EXISTS (SELECT 1 FROM work_prediction wp WHERE wp.id = w.id AND wp.classifier_version = ${version} AND ${target} = ANY(wp.consensus_intersection))`
        : Prisma.sql`EXISTS (SELECT 1 FROM work_prediction wp WHERE wp.id = w.id AND wp.classifier_version = ${version} AND ${target} = ANY(wp.candidate_union))`,
    );
  }
  if (filters.classified === true) {
    result.push(
      Prisma.sql`EXISTS (SELECT 1 FROM work_prediction wp WHERE wp.id = w.id AND wp.classifier_version = ${version})`,
    );
  }
  if (filters.classified === false) {
    result.push(
      Prisma.sql`NOT EXISTS (SELECT 1 FROM work_prediction wp WHERE wp.id = w.id AND wp.classifier_version = ${version})`,
    );
  }
  return result;
}

export function conditions(
  filters: WorkFilters,
  classifierVersion: string | null,
): Prisma.Sql[] {
  if (filterValidationMessage(filters)) return [Prisma.sql`FALSE`];
  const result: Prisma.Sql[] = [];
  const q = filters.q?.trim();
  if (q) result.push(Prisma.sql`w.title_tsv @@ ${tsquery(q)}`);
  if (filters.year_from !== undefined)
    result.push(Prisma.sql`w.year >= ${filters.year_from}`);
  if (filters.year_to !== undefined)
    result.push(Prisma.sql`w.year <= ${filters.year_to}`);
  if (filters.lang) result.push(Prisma.sql`w.lang = ${filters.lang}`);
  if (filters.type) result.push(Prisma.sql`w.type = ${filters.type}`);
  if (filters.field) result.push(Prisma.sql`w.field = ${filters.field}`);
  if (filters.topic) result.push(Prisma.sql`w.topic = ${filters.topic}`);
  if (filters.venue) result.push(Prisma.sql`w.venue = ${filters.venue}`);
  if (filters.institution) {
    result.push(
      Prisma.sql`string_to_array(w.ca_institutions, '; ') @> ARRAY[${filters.institution}]::text[]`,
    );
  }
  if (filters.funder) {
    result.push(
      Prisma.sql`string_to_array(w.funders, '; ') @> ARRAY[${filters.funder}]::text[]`,
    );
  }
  if (filters.keyword) {
    result.push(
      Prisma.sql`string_to_array(w.keywords, '; ') @> ARRAY[${filters.keyword}]::text[]`,
    );
  }
  if (filters.retracted === true) result.push(Prisma.sql`w.is_retracted`);
  if (filters.retracted === false) result.push(Prisma.sql`NOT w.is_retracted`);
  if (filters.no_abstract || filters.abstract === "none") {
    result.push(Prisma.sql`NOT w.has_abstract`);
  } else if (filters.abstract === "has") {
    result.push(Prisma.sql`w.has_abstract`);
  }

  const routeColumns = {
    aff: Prisma.sql`w.route_ca_aff`,
    fund: Prisma.sql`w.route_ca_fund`,
    venue: Prisma.sql`w.route_ca_venue`,
    about: Prisma.sql`w.route_about_ca`,
    no_aff: Prisma.sql`NOT w.route_ca_aff`,
  } as const;
  if (filters.route) result.push(routeColumns[filters.route]);
  for (const [value, column] of [
    [filters.route_aff, Prisma.sql`w.route_ca_aff`],
    [filters.route_fund, Prisma.sql`w.route_ca_fund`],
    [filters.route_venue, Prisma.sql`w.route_ca_venue`],
    [filters.route_about, Prisma.sql`w.route_about_ca`],
  ] as const) {
    if (value === true) result.push(column);
    if (value === false) result.push(Prisma.sql`NOT (${column})`);
  }
  if (filters.n_in !== undefined) {
    result.push(
      Prisma.sql`EXISTS (SELECT 1 FROM screened s WHERE s.id = w.id AND s.n_in = ${filters.n_in})`,
    );
  }

  result.push(
    ...(filters.label_source === "classifier"
      ? classifierConditions(filters, classifierVersion)
      : directLabelConditions(filters)),
  );
  return result;
}

export function whereSql(
  filters: WorkFilters,
  classifierVersion: string | null,
): Prisma.Sql {
  const result = conditions(filters, classifierVersion);
  return result.length
    ? Prisma.sql`WHERE ${Prisma.join(result, " AND ")}`
    : Prisma.empty;
}

export function orderSql(filters: WorkFilters): Prisma.Sql {
  const q = filters.q?.trim();
  if (filters.sort === "relevance" && q) {
    return Prisma.sql`ORDER BY ts_rank(w.title_tsv, ${tsquery(q)}) DESC, w.cited_by DESC`;
  }
  if (filters.sort === "year_asc") {
    return Prisma.sql`ORDER BY w.year ASC NULLS LAST, w.cited_by DESC`;
  }
  if (filters.sort === "year_desc") {
    return Prisma.sql`ORDER BY w.year DESC NULLS LAST, w.cited_by DESC`;
  }
  return Prisma.sql`ORDER BY w.cited_by DESC`;
}

export function filterValidationMessage(filters: WorkFilters): string | null {
  if (filters.parse_error) return filters.parse_error;
  const source = filters.label_source ?? "direct";
  if (
    filters.classifier_version &&
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(filters.classifier_version)
  ) {
    return "classifier_version must be a 1 to 64 character release slug.";
  }
  if (
    source === "direct" &&
    (filters.label_mode !== undefined ||
      filters.classified !== undefined ||
      filters.classifier_version !== undefined)
  ) {
    return "Classifier mode, coverage, and version require label_source=classifier.";
  }
  if (
    source === "classifier" &&
    (filters.agreement !== undefined || filters.labeled !== undefined)
  ) {
    return "Direct label agreement and coverage cannot be combined with label_source=classifier.";
  }
  if (source === "classifier" && filters.design === "design_other") {
    return "design_other is unavailable for classifier decisions because one teacher head has insufficient support.";
  }
  return null;
}

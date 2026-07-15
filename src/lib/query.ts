import { prisma } from "@/lib/db";
import { labelAgreement } from "@/lib/labels";
import {
  predictionView,
  resolveClassifierContext,
  type ClassifierContext,
} from "@/lib/predictions";
import {
  COUNT_CAP,
  EXPORT_CAP,
  MAX_PER_PAGE,
  conditions,
  orderSql,
  whereSql,
  type WorkFilters,
} from "@/lib/work-filters";
import { Prisma } from "@prisma/client";

export { LABEL_CATEGORIES, STUDY_DESIGNS, labelAgreement } from "@/lib/labels";
export { COUNT_CAP, EXPORT_CAP, MAX_PER_PAGE } from "@/lib/work-filters";
export type { WorkFilters } from "@/lib/work-filters";
export async function searchWorks(f: WorkFilters) {
  const perPage = Math.min(Math.max(f.per_page ?? 25, 1), MAX_PER_PAGE);
  const page = Math.max(f.page ?? 1, 1);
  const offset = (page - 1) * perPage;
  const classifier = await resolveClassifierContext(f);
  const where = whereSql(f, classifier.version);

  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT w.id FROM works w ${where} ${orderSql(f)} LIMIT ${perPage} OFFSET ${offset}`,

    // COUNTING 4.3M ROWS IS SLOW, and an exact count nobody reads is not worth a
    // two-second page. The subquery stops at the cap, so this costs about the same
    // whether the filter matches ten rows or four million; past the cap the UI says
    // "10,000+" rather than lying or stalling.
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n
      FROM (SELECT 1 FROM works w ${where} LIMIT ${COUNT_CAP}) t`,
  ]);

  const total = Number(countRows[0]?.n ?? 0);
  const ids = idRows.map((r) => r.id);

  // Hydrate the page through Prisma so the rows arrive typed, with their relations.
  // Only `perPage` ids, so this is a primary-key lookup and not another scan.
  const hydrated = ids.length
    ? await prisma.work.findMany({
        where: { id: { in: ids } },
        include: {
          retraction: { select: { nature: true, openalexFlagged: true } },
          screened: {
            select: {
              nIn: true,
              opusTier: true,
              gptTier: true,
              grokTier: true,
            },
          },
          predictions: {
            where: { classifierVersion: classifier.version ?? "" },
            take: 1,
          },
        },
      })
    : [];

  // `WHERE id IN (...)` does not preserve order. The ORDER BY above is the sort the
  // user actually asked for, so restore it rather than letting the fetch order win.
  const byId = new Map(hydrated.map((w) => [w.id, w]));
  const rows = ids.flatMap((id) => {
    const w = byId.get(id);
    return w ? [w] : [];
  });

  return { rows, total, page, perPage, capped: total >= COUNT_CAP, classifier };
}

/** One label row, as the API and the export serialize it. */
export interface LabelOut {
  model: string;
  categories: string[];
  domain: string | null;
  study_design: string | null;
  genre: string | null;
  about_ca_system: boolean | null;
  about_ca_topic: boolean | null;
  confidence: string | null;
}

export type ExportPrediction = NonNullable<ReturnType<typeof predictionView>>;

interface PackedExportPrediction {
  classifier_version: string;
  candidate_union: string[];
  consensus_intersection: string[];
  codex_scores_hex: string;
  gemma_scores_hex: string;
}

/**
 * The cohort query: `searchWorks` semantics with the counts a citable cohort
 * needs. Differences, both deliberate:
 *
 *   1. The count is EXACT, not capped. A cohort exists to be cited ("N works
 *      matching these criteria"), and "10,000+" is not a citable N. A filtered
 *      count over the whole frame is sub-second here (measured; the table and
 *      its indexes stay in the page cache), which is a fair price for a number
 *      that means something.
 *
 *   2. Every response carries `labeled`: how many works IN THIS COHORT have at
 *      least one label row. The label table is sparse, and a reader must never
 *      be allowed to mistake "no label" for "not in the category", so the
 *      coverage travels with every result set.
 */
export async function cohortSearch(
  f: WorkFilters,
  resolved?: ClassifierContext,
) {
  const perPage = Math.min(Math.max(f.per_page ?? 50, 1), MAX_PER_PAGE);
  const page = Math.max(f.page ?? 1, 1);
  const offset = (page - 1) * perPage;
  const classifier = resolved ?? (await resolveClassifierContext(f));
  const baseConditions = conditions(f, classifier.version);
  const where = whereSql(f, classifier.version);

  const [idRows, countRows, labeledRows, classifiedRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT w.id FROM works w ${where} ${orderSql(f)} LIMIT ${perPage} OFFSET ${offset}`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM works w ${where}`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM works w ${where}
      ${baseConditions.length ? Prisma.sql`AND` : Prisma.sql`WHERE`} EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id)`,
    classifier.version
      ? prisma.$queryRaw<Array<{ n: bigint }>>`
          SELECT COUNT(*)::bigint AS n FROM works w ${where}
          ${baseConditions.length ? Prisma.sql`AND` : Prisma.sql`WHERE`}
          EXISTS (SELECT 1 FROM work_prediction wp
                  WHERE wp.id = w.id AND wp.classifier_version = ${classifier.version})`
      : Promise.resolve([{ n: 0n }]),
  ]);

  const total = Number(countRows[0]?.n ?? 0);
  const labeled = Number(labeledRows[0]?.n ?? 0);
  const classified = Number(classifiedRows[0]?.n ?? 0);
  const ids = idRows.map((r) => r.id);

  const hydrated = ids.length
    ? await prisma.work.findMany({
        where: { id: { in: ids } },
        include: {
          retraction: { select: { nature: true, openalexFlagged: true } },
          screened: { select: { nIn: true } },
          score: {
            select: {
              scoreOpus: true,
              scoreGpt: true,
              scoreSpread: true,
              validationStatus: true,
            },
          },
          labels: true,
          predictions: {
            where: { classifierVersion: classifier.version ?? "" },
            take: 1,
          },
        },
      })
    : [];

  const byId = new Map(hydrated.map((w) => [w.id, w]));
  const rows = ids.flatMap((id) => {
    const w = byId.get(id);
    return w ? [w] : [];
  });

  return { rows, total, labeled, classified, page, perPage, classifier };
}

export type CohortRow = Awaited<
  ReturnType<typeof cohortSearch>
>["rows"][number];

/** One exported record: every work column, the labels, the scores, the status. */
export interface ExportRow {
  id: string;
  doi: string | null;
  title: string;
  year: number | null;
  lang: string | null;
  type: string | null;
  venue: string | null;
  topic: string | null;
  field: string | null;
  cited_by: number;
  is_retracted: boolean;
  has_abstract: boolean;
  route_ca_aff: boolean;
  route_ca_fund: boolean;
  route_ca_venue: boolean;
  route_about_ca: boolean;
  ca_institutions: string | null;
  funders: string | null;
  keywords: string | null;
  score_opus: number | null;
  score_gpt: number | null;
  score_spread: number | null;
  validation_status: string | null;
  labels: LabelOut[] | null;
  prediction: ExportPrediction | null;
}

/**
 * The cohort, streamed in keyset-paginated chunks ordered by id. OFFSET would
 * re-scan everything it skips on every chunk; `id > cursor` walks the primary
 * key once. The caller (the export route) decides when to stop; this function
 * only knows how to fetch the next slice.
 */
export async function exportChunk(
  f: WorkFilters,
  cursor: string,
  limit: number,
  resolved?: ClassifierContext,
): Promise<ExportRow[]> {
  const classifier = resolved ?? (await resolveClassifierContext(f));
  const c = conditions(f, classifier.version);
  c.push(Prisma.sql`w.id > ${cursor}`);
  const where = Prisma.sql`WHERE ${Prisma.join(c, " AND ")}`;

  const rows = await prisma.$queryRaw<
    Array<
      Omit<ExportRow, "prediction"> & {
        prediction: PackedExportPrediction | null;
      }
    >
  >`
    SELECT w.id, w.doi, w.title, w.year, w.lang, w.type, w.venue, w.topic, w.field,
           w.cited_by, w.is_retracted, w.has_abstract,
           w.route_ca_aff, w.route_ca_fund, w.route_ca_venue, w.route_about_ca,
           w.ca_institutions, w.funders, w.keywords,
           s.score_opus, s.score_gpt, s.score_spread, s.validation_status,
           (SELECT json_agg(json_build_object(
              'model', wl.model,
              'categories', wl.categories,
              'domain', wl.domain,
              'study_design', wl.study_design,
              'genre', wl.genre,
              'about_ca_system', wl.about_ca_system,
              'about_ca_topic', wl.about_ca_topic,
              'confidence', wl.confidence
            ) ORDER BY wl.model)
            FROM work_label wl WHERE wl.id = w.id) AS labels,
           (SELECT json_build_object(
              'classifier_version', wp.classifier_version,
              'candidate_union', wp.candidate_union,
              'consensus_intersection', wp.consensus_intersection,
              'codex_scores_hex', encode(wp.codex_scores, 'hex'),
              'gemma_scores_hex', encode(wp.gemma_scores, 'hex')
            )
            FROM work_prediction wp
            WHERE wp.id = w.id AND wp.classifier_version = ${classifier.version ?? ""}) AS prediction
    FROM works w
    LEFT JOIN work_score s ON s.id = w.id
    ${where}
    ORDER BY w.id
    LIMIT ${limit}`;

  return rows.map((row) => {
    const packed = row.prediction;
    return {
      ...row,
      prediction: packed
        ? predictionView(
            {
              classifierVersion: packed.classifier_version,
              candidateUnion: packed.candidate_union,
              consensusIntersection: packed.consensus_intersection,
              codexScores: `\\x${packed.codex_scores_hex}`,
              gemmaScores: `\\x${packed.gemma_scores_hex}`,
            },
            classifier,
          )
        : null,
    };
  });
}

/** The exact cohort size plus label coverage, for export meta and /q pages. */
export async function cohortCount(
  f: WorkFilters,
  resolved?: ClassifierContext,
) {
  const classifier = resolved ?? (await resolveClassifierContext(f));
  const baseConditions = conditions(f, classifier.version);
  const where = whereSql(f, classifier.version);
  const [countRows, labeledRows, classifiedRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{ n: bigint }>
    >`SELECT COUNT(*)::bigint AS n FROM works w ${where}`,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM works w ${where}
      ${baseConditions.length ? Prisma.sql`AND` : Prisma.sql`WHERE`} EXISTS (SELECT 1 FROM work_label wl WHERE wl.id = w.id)`,
    classifier.version
      ? prisma.$queryRaw<Array<{ n: bigint }>>`
          SELECT COUNT(*)::bigint AS n FROM works w ${where}
          ${baseConditions.length ? Prisma.sql`AND` : Prisma.sql`WHERE`}
          EXISTS (SELECT 1 FROM work_prediction wp
                  WHERE wp.id = w.id AND wp.classifier_version = ${classifier.version})`
      : Promise.resolve([{ n: 0n }]),
  ]);
  return {
    total: Number(countRows[0]?.n ?? 0),
    labeled: Number(labeledRows[0]?.n ?? 0),
    classified: Number(classifiedRows[0]?.n ?? 0),
    classifier,
  };
}

export async function getWork(id: string, resolved?: ClassifierContext) {
  return prisma.work.findUnique({
    where: { id },
    include: {
      retraction: true,
      screened: true,
      score: true,
      labels: true,
      predictions: {
        where: { classifierVersion: resolved?.version ?? "" },
        take: 1,
      },
    },
  });
}

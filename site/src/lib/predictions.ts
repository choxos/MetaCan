import { prisma } from "@/lib/db";
import type { WorkFilters } from "@/lib/work-filters";

export interface ClassifierContext {
  requested: boolean;
  available: boolean;
  version: string | null;
  rowCount: number;
  targets: string[];
  codexTargets: string[];
  gemmaTargets: string[];
  decisionTargets: string[];
  scoreEncoding: string | null;
  interpretation: string | null;
  warning: string | null;
}

export interface PredictionRecord {
  classifierVersion: string;
  candidateUnion: string[];
  consensusIntersection: string[];
  codexScores: Uint8Array | string;
  gemmaScores: Uint8Array | string;
}

const EMPTY_CONTEXT: ClassifierContext = {
  requested: false,
  available: false,
  version: null,
  rowCount: 0,
  targets: [],
  codexTargets: [],
  gemmaTargets: [],
  decisionTargets: [],
  scoreEncoding: null,
  interpretation: null,
  warning: null,
};

export async function resolveClassifierContext(
  filters: WorkFilters,
  force = false,
): Promise<ClassifierContext> {
  const requested = force || filters.label_source === "classifier";
  if (!requested) return EMPTY_CONTEXT;

  const version = filters.classifier_version;
  const select = {
    version: true,
    rowCount: true,
    targets: true,
    codexTargets: true,
    gemmaTargets: true,
    decisionTargets: true,
    scoreEncoding: true,
    interpretation: true,
  } as const;
  const model = version
    ? await prisma.classifierModel.findUnique({ where: { version }, select })
    : await prisma.classifierModel.findFirst({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        select,
      });

  if (!model) {
    return {
      ...EMPTY_CONTEXT,
      requested: true,
      warning: version
        ? `Classifier version ${version} is unavailable.`
        : "No active classifier release is available.",
    };
  }
  return {
    requested: true,
    available: true,
    version: model.version,
    rowCount: model.rowCount,
    targets: model.targets,
    codexTargets: model.codexTargets,
    gemmaTargets: model.gemmaTargets,
    decisionTargets: model.decisionTargets,
    scoreEncoding: model.scoreEncoding,
    interpretation: model.interpretation,
    warning: null,
  };
}

export function classifierMeta(context: ClassifierContext) {
  return {
    requested: context.requested,
    available: context.available,
    version: context.version,
    frame_rows_covered: context.rowCount,
    decision_targets: context.decisionTargets,
    score_encoding: context.scoreEncoding,
    score_resolution:
      context.scoreEncoding === "uint16_le_65535" ? 1 / 65_535 : null,
    interpretation: context.interpretation,
    warning: context.warning,
  };
}

export function pinClassifierFilters(
  filters: WorkFilters,
  context: ClassifierContext,
): WorkFilters {
  if (
    filters.label_source !== "classifier" ||
    !context.available ||
    !context.version
  ) {
    return filters;
  }
  return {
    ...filters,
    label_mode: filters.label_mode ?? "candidate",
    classifier_version: context.version,
  };
}

export function predictionView(
  record: PredictionRecord | undefined,
  context: ClassifierContext,
) {
  if (!record || !context.available) return null;
  const codexScores = decodeScores(record.codexScores, context.codexTargets);
  const gemmaScores = decodeScores(record.gemmaScores, context.gemmaTargets);
  return {
    classifier_version: record.classifierVersion,
    candidate_union: record.candidateUnion,
    consensus_intersection: record.consensusIntersection,
    score_encoding: context.scoreEncoding,
    score_resolution:
      context.scoreEncoding === "uint16_le_65535" ? 1 / 65_535 : null,
    scores: {
      codex: Object.fromEntries(
        context.codexTargets.map((target, index) => [
          target,
          codexScores[index]!,
        ]),
      ),
      gemma: Object.fromEntries(
        context.gemmaTargets.map((target, index) => [
          target,
          gemmaScores[index]!,
        ]),
      ),
    },
    interpretation: context.interpretation,
  };
}

function packedBytes(value: Uint8Array | string): Uint8Array {
  if (typeof value !== "string") return value;
  if (!/^\\x[0-9a-f]*$/i.test(value) || value.length % 2 !== 0) {
    throw new Error("Classifier score payload is not PostgreSQL bytea hex.");
  }
  return Uint8Array.from(Buffer.from(value.slice(2), "hex"));
}

function decodeScores(
  payload: Uint8Array | string,
  targets: string[],
): number[] {
  const bytes = packedBytes(payload);
  if (bytes.byteLength !== targets.length * 2) {
    throw new Error(
      `Classifier score payload has ${bytes.byteLength} bytes for ${targets.length} targets.`,
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return targets.map((_, index) => view.getUint16(index * 2, true) / 65_535);
}

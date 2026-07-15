import { classifierCopy } from "@/lib/classifier-copy";
import { getDict, type Dictionary } from "@/lib/i18n";
import { labelAgreement } from "@/lib/labels";
import type { Lang } from "@/lib/lang";
import type { PredictionRecord } from "@/lib/predictions";
import type { WorkRowData } from "@/components/WorkRow";

export function ConsensusChip({ nIn, t }: { nIn: number; t: Dictionary }) {
  if (nIn === 0) return null;
  const color = nIn === 3 ? "var(--in-scope)" : "var(--contested)";
  const label = nIn === 3 ? t.workRow.consensusAll : t.workRow.consensusN(nIn);
  const title =
    nIn === 3 ? t.workRow.consensusAllTitle : t.workRow.consensusNTitle(nIn);
  return (
    <span
      className="chip"
      title={title}
      style={{ borderColor: color, color, background: "transparent" }}
    >
      {label}
    </span>
  );
}

export function LabelChips({
  labels,
  t,
}: {
  labels: NonNullable<WorkRowData["labels"]>;
  t: Dictionary;
}) {
  if (labels.length === 0) {
    return (
      <span
        className="text-xs"
        title={t.workRow.unlabelledTitle}
        style={{ color: "var(--ink-5)" }}
      >
        {t.workRow.unlabeled}
      </span>
    );
  }

  const agreement = labelAgreement(
    labels.map((label) => ({
      categories: label.categories,
      studyDesign: label.studyDesign,
    })),
  );
  const agreementLabel =
    agreement === "agree"
      ? t.workRow.agreementAgree
      : agreement === "split"
        ? t.workRow.agreementSplit
        : t.workRow.agreementSingle;
  const agreementTitle =
    agreement === "agree"
      ? t.workRow.agreementAgreeTitle
      : agreement === "split"
        ? t.workRow.agreementSplitTitle
        : t.workRow.agreementSingleTitle;
  const agreementColor =
    agreement === "split" ? "var(--contested)" : "var(--ink-4)";

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-xs" style={{ color: "var(--ink-5)" }}>
        {t.workRow.labelsPrefix}:
      </span>
      {labels.map((label) => (
        <span
          key={label.model}
          className="chip"
          title={t.workRow.labelChipTitle(
            label.model,
            label.categories.join(", "),
            label.studyDesign ?? "",
            label.confidence ?? "",
          )}
          style={{
            borderColor: "var(--ink-5)",
            color: "var(--ink-3)",
            background: "transparent",
          }}
        >
          {label.model}
          {label.categories.length > 0
            ? ` · ${label.categories.join("+")}`
            : ` · ${t.workRow.labelNoCats}`}
          {label.confidence ? ` · ${label.confidence}` : ""}
        </span>
      ))}
      <span
        className="chip"
        title={agreementTitle}
        style={{
          borderColor: agreementColor,
          color: agreementColor,
          background: "transparent",
        }}
      >
        {agreementLabel}
      </span>
    </span>
  );
}

export function RetractionChip({ w, t }: { w: WorkRowData; t: Dictionary }) {
  const retraction = w.retraction;
  if (!retraction && !w.isRetracted) return null;
  const nature = retraction?.nature ?? "Retraction";
  const color = nature.toLowerCase().includes("concern")
    ? "var(--concern)"
    : nature.toLowerCase().includes("correction")
      ? "var(--correction)"
      : nature.toLowerCase().includes("reinstat")
        ? "var(--reinstatement)"
        : "var(--retraction)";
  const missed = retraction && !retraction.openalexFlagged;
  return (
    <span
      className="chip"
      title={missed ? t.workRow.retractionMissedTitle(nature) : nature}
      style={{ borderColor: color, color, background: "transparent" }}
    >
      {nature}
      {missed ? t.workRow.retractionMissedSuffix : ""}
    </span>
  );
}

export function PredictionChips({
  prediction,
  lang,
}: {
  prediction: PredictionRecord;
  lang: Lang;
}) {
  const copy = classifierCopy(lang);
  const t = getDict(lang);
  const targetName = (target: string) =>
    t.cohort.categoryNames[target] ??
    t.cohort.designNames[target] ??
    target.replaceAll("_", " ");
  const candidates = prediction.candidateUnion.map(targetName);
  const consensus = prediction.consensusIntersection.map(targetName);
  return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      {candidates.length > 0 && (
        <span
          className="max-w-full border-l-2 pl-2 text-xs leading-relaxed"
          title={candidates.join(", ")}
          style={{
            borderColor: "var(--mc-accent)",
            color: "var(--ink-3)",
          }}
        >
          <strong style={{ color: "var(--mc-accent)" }}>
            {copy.predicted}:
          </strong>{" "}
          {candidates.join(", ")}
        </span>
      )}
      {consensus.length > 0 && (
        <span
          className="max-w-full border-l-2 pl-2 text-xs leading-relaxed"
          title={consensus.join(", ")}
          style={{
            borderColor: "var(--in-scope)",
            color: "var(--ink-3)",
          }}
        >
          <strong style={{ color: "var(--in-scope)" }}>
            {copy.predictionConsensus}:
          </strong>{" "}
          {consensus.join(", ")}
        </span>
      )}
    </span>
  );
}

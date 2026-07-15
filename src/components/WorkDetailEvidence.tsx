import type { WorkLabel, WorkScore } from "@prisma/client";
import { ScoreBanner } from "@/components/ScoreBanner";
import type { Dictionary } from "@/lib/i18n";
import { numberLocale, type Lang } from "@/lib/lang";

function ScoreBar({
  label,
  value,
  lang,
  color,
}: {
  label: string;
  value: number | null;
  lang: Lang;
  color: string;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100;
  const shown =
    value === null
      ? "N/A"
      : value.toLocaleString(numberLocale(lang), {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        });
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="tabular" style={{ color: "var(--ink-3)" }}>
          {shown}
        </span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full"
        style={{ background: "var(--surface-3)" }}
      >
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function DirectLabelsPanel({
  labels,
  lang,
  t,
}: {
  labels: WorkLabel[];
  lang: Lang;
  t: Dictionary;
}) {
  if (!labels.length) return null;
  return (
    <section className="card p-6">
      <h2 className="font-serif text-xl">{t.workDetail.labelsTitle}</h2>
      <p
        className="mt-1 text-sm leading-relaxed"
        style={{ color: "var(--ink-4)" }}
      >
        {t.workDetail.labelsSub}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {labels.map((label) => (
          <div key={label.model} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{label.model}</span>
              <span
                className="chip"
                style={{
                  borderColor: "var(--ink-5)",
                  color: "var(--ink-3)",
                  background: "transparent",
                }}
              >
                {label.confidence ?? "N/A"}
              </span>
            </div>
            <div
              className="mt-2 space-y-1 text-xs"
              style={{ color: "var(--ink-4)" }}
            >
              <div>
                {t.workDetail.labelCategories}:{" "}
                {label.categories.length
                  ? label.categories
                      .map(
                        (category) =>
                          t.cohort.categoryNames[category] ?? category,
                      )
                      .join(", ")
                  : t.workRow.labelNoCats}
              </div>
              <div>
                {t.workDetail.labelDesign}:{" "}
                {label.studyDesign
                  ? (t.cohort.designNames[label.studyDesign] ??
                    label.studyDesign)
                  : "N/A"}
              </div>
              <div>
                {t.workDetail.labelDomain}: {label.domain ?? "N/A"}
              </div>
              <div>
                {t.workDetail.labelGenre}: {label.genre ?? "N/A"}
              </div>
              <div>
                {t.workDetail.labelAboutSystem}:{" "}
                {label.aboutCaSystem === null
                  ? "N/A"
                  : label.aboutCaSystem
                    ? t.common.yes
                    : t.common.no}
              </div>
              <div>
                {t.workDetail.labelAboutTopic}:{" "}
                {label.aboutCaTopic === null
                  ? "N/A"
                  : label.aboutCaTopic
                    ? t.common.yes
                    : t.common.no}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LegacyScoresPanel({
  score,
  lang,
  t,
}: {
  score: WorkScore | null;
  lang: Lang;
  t: Dictionary;
}) {
  if (!score) return null;
  return (
    <section className="card p-6" style={{ borderColor: "var(--contested)" }}>
      <h2 className="font-serif text-xl">{t.workDetail.scoresTitle}</h2>
      <div className="mt-3">
        <ScoreBanner t={t} />
      </div>
      <p
        className="mt-3 text-sm leading-relaxed"
        style={{ color: "var(--ink-4)" }}
      >
        {t.workDetail.scoresSub}
      </p>
      <div className="mt-4 space-y-4">
        <ScoreBar
          label={t.workDetail.scoreOpus}
          value={score.scoreOpus}
          lang={lang}
          color="var(--mc)"
        />
        <ScoreBar
          label={t.workDetail.scoreGpt}
          value={score.scoreGpt}
          lang={lang}
          color="var(--mc-accent)"
        />
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--ink-4)" }}
          >
            {t.workDetail.scoreSpread}
          </dt>
          <dd className="mt-1">
            {score.scoreSpread === null
              ? "N/A"
              : score.scoreSpread.toLocaleString(numberLocale(lang), {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}{" "}
            <span className="text-xs" style={{ color: "var(--ink-4)" }}>
              {t.workDetail.scoreSpreadNote}
            </span>
          </dd>
        </div>
        <div>
          <dt
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--ink-4)" }}
          >
            {t.workDetail.validationStatus}
          </dt>
          <dd className="mt-1">
            {score.validationStatus ? (
              <code className="font-mono text-xs">
                {score.validationStatus}
              </code>
            ) : (
              "N/A"
            )}{" "}
            <span className="text-xs" style={{ color: "var(--ink-4)" }}>
              {t.workDetail.validationStatusNote}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

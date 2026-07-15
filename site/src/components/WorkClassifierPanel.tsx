import type { WorkPrediction } from "@prisma/client";
import { classifierCopy } from "@/lib/classifier-copy";
import type { Dictionary } from "@/lib/i18n";
import { numberLocale, type Lang } from "@/lib/lang";
import { predictionView, type ClassifierContext } from "@/lib/predictions";

function targetName(target: string, t: Dictionary) {
  return (
    t.cohort.categoryNames[target] ??
    t.cohort.designNames[target] ??
    target.replaceAll("_", " ")
  );
}

function TargetList({ values, t }: { values: string[]; t: Dictionary }) {
  return values.length ? (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <span key={value} className="chip">
          {targetName(value, t)}
        </span>
      ))}
    </div>
  ) : (
    <span style={{ color: "var(--ink-5)" }}>N/A</span>
  );
}

function TeacherScores({
  name,
  targets,
  scores,
  lang,
  t,
}: {
  name: string;
  targets: string[];
  scores: Record<string, number>;
  lang: Lang;
  t: Dictionary;
}) {
  const rows = targets
    .map((target) => ({ target, score: scores[target] }))
    .filter(
      (row): row is { target: string; score: number } =>
        typeof row.score === "number",
    )
    .sort((a, b) => b.score - a.score);
  return (
    <div>
      <h4 className="text-sm font-medium">{name}</h4>
      <div className="mt-2 space-y-1">
        {rows.map((row) => (
          <div
            key={row.target}
            className="flex items-baseline justify-between gap-4 text-xs"
          >
            <span>{targetName(row.target, t)}</span>
            <span className="tabular" style={{ color: "var(--ink-4)" }}>
              {row.score.toLocaleString(numberLocale(lang), {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkClassifierPanel({
  context,
  prediction,
  lang,
  t,
}: {
  context: ClassifierContext;
  prediction: WorkPrediction | undefined;
  lang: Lang;
  t: Dictionary;
}) {
  const copy = classifierCopy(lang);
  const view = predictionView(prediction, context);
  return (
    <section className="card p-6" style={{ borderColor: "var(--mc)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl">{copy.predictionTitle}</h2>
        {context.version && (
          <code className="font-mono text-xs">{context.version}</code>
        )}
      </div>
      {!context.available ? (
        <p className="mt-2 text-sm" style={{ color: "var(--ink-4)" }}>
          {copy.releaseUnavailable}
        </p>
      ) : !view ? (
        <p className="mt-2 text-sm" style={{ color: "var(--ink-4)" }}>
          {copy.predictionUnavailable}
        </p>
      ) : (
        <>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--ink-4)" }}
          >
            {copy.classifierHint}
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt
                className="mb-2 text-xs uppercase tracking-wider"
                style={{ color: "var(--ink-4)" }}
              >
                {copy.predicted}
              </dt>
              <dd>
                <TargetList values={view.candidate_union} t={t} />
              </dd>
            </div>
            <div>
              <dt
                className="mb-2 text-xs uppercase tracking-wider"
                style={{ color: "var(--ink-4)" }}
              >
                {copy.predictionConsensus}
              </dt>
              <dd>
                <TargetList values={view.consensus_intersection} t={t} />
              </dd>
            </div>
          </dl>
          <details className="mt-5 border-t pt-4">
            <summary className="cursor-pointer text-sm font-medium">
              {copy.scores}
            </summary>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <TeacherScores
                name="Codex"
                targets={context.codexTargets}
                scores={view.scores.codex}
                lang={lang}
                t={t}
              />
              <TeacherScores
                name="Gemma"
                targets={context.gemmaTargets}
                scores={view.scores.gemma}
                lang={lang}
                t={t}
              />
            </div>
          </details>
        </>
      )}
    </section>
  );
}

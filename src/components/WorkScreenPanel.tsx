import Link from "next/link";
import type { Screened } from "@prisma/client";
import type { Dictionary } from "@/lib/i18n";
import { localePath, type Lang } from "@/lib/lang";

function ModelCard({
  t,
  model,
  tier,
  aboutCa,
  confidence,
  reason,
}: {
  t: Dictionary;
  model: string;
  tier: string | null;
  aboutCa: boolean | null;
  confidence: string | null;
  reason: string | null;
}) {
  const isIn = tier === "T1" || tier === "T2";
  const color = isIn
    ? "var(--in-scope)"
    : tier === "T3"
      ? "var(--contested)"
      : "var(--out)";
  const label = tier === "T3" ? t.workDetail.tierAdjacent : tier || "OUT";
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{model}</span>
        <span
          className="chip"
          style={{ borderColor: color, color, background: "transparent" }}
        >
          {label}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-xs" style={{ color: "var(--ink-4)" }}>
        <div>
          {t.workDetail.aboutCanada}:{" "}
          {aboutCa === null ? "N/A" : aboutCa ? t.common.yes : t.common.no}
        </div>
        <div>
          {t.workDetail.confidence}: {confidence ?? "N/A"}
        </div>
      </div>
      {reason && (
        <p
          className="mt-3 border-t pt-3 text-sm leading-relaxed"
          style={{ color: "var(--ink-3)" }}
        >
          {reason}
        </p>
      )}
    </div>
  );
}

export function WorkScreenPanel({
  screened,
  lang,
  t,
}: {
  screened: Screened;
  lang: Lang;
  t: Dictionary;
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl">{t.workDetail.screenTitle}</h2>
        <Link href={localePath(lang, "/screen")} className="link text-sm">
          {t.workDetail.screenAll}
        </Link>
      </div>

      <div
        className="card mb-3 p-4"
        style={{
          borderColor:
            screened.nIn === 3
              ? "var(--in-scope)"
              : screened.nIn && screened.nIn > 0
                ? "var(--contested)"
                : "var(--border)",
        }}
      >
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--ink-2)" }}
        >
          {screened.nIn === 3
            ? t.workDetail.consensus3
            : screened.nIn === 0
              ? t.workDetail.consensus0
              : t.workDetail.consensusN(screened.nIn ?? 0)}
        </p>
        <div className="mt-2 text-xs" style={{ color: "var(--ink-4)" }}>
          {t.workDetail.stratumLine(
            screened.stratum ?? "N/A",
            screened.weight?.toFixed(2) ?? "N/A",
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ModelCard
          t={t}
          model="Claude Opus 4.8"
          tier={screened.opusTier}
          aboutCa={screened.opusAboutCa}
          confidence={screened.opusConfidence}
          reason={screened.opusReason}
        />
        <ModelCard
          t={t}
          model="GPT-5.6 (high)"
          tier={screened.gptTier}
          aboutCa={screened.gptAboutCa}
          confidence={screened.gptConfidence}
          reason={screened.gptReason}
        />
        <ModelCard
          t={t}
          model="Grok 4.5"
          tier={screened.grokTier}
          aboutCa={screened.grokAboutCa}
          confidence={screened.grokConfidence}
          reason={screened.grokReason}
        />
      </div>
    </section>
  );
}

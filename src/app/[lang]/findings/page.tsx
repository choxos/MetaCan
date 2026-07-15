import type { Metadata } from "next";
import raw from "@/data/findings.json";
import { getDict } from "@/lib/i18n";
import { formatInt, isLang, langAlternates, type Lang } from "@/lib/lang";
import { frFinding } from "@/lib/findings-fr";

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  return {
    title: getDict(lang).meta.findings,
    alternates: langAlternates(lang, "/findings"),
  };
}

/**
 * The findings, rendered FROM `findings.json`: the file the pilot scripts
 * write. Not one number on this page is typed by hand.
 *
 * That is the point, and it is load-bearing. A site that restates its own results
 * in prose will, sooner or later, restate them wrongly: someone tunes a threshold,
 * a rate moves from 1.31% to 1.4%, and the paragraph on the website still says
 * 1.31% because nobody thought to grep for it. Rendering the artefact makes that
 * class of drift impossible rather than merely unlikely.
 *
 * The French page shows a hand-checked translation of each headline WITH the
 * verbatim English artifact underneath, and only while the translation's
 * recorded source still matches the artifact (see findings-fr.ts). A
 * regenerated headline therefore falls back to English rather than serving a
 * stale French text: the same drift guarantee, extended to the translation.
 */

interface Finding {
  headline: string;
  values: Record<string, unknown>;
  computed_at_utc: string;
}

const findings = raw as unknown as Record<string, Finding>;

/** The order tells the story: the frame's problem, then the screen, then the limits. */
const ORDER = [
  "the_frame",
  "base_rate",
  "topic_route_recall",
  "agreement",
  "base_rate_robustness",
  "topics",
  "affiliation_gap",
  "erudit",
  "language_gap",
  "polysemy",
  "canadian_linkage",
  "capture_recapture_fails",
  "openalex_is_metered",
  "screening_cost",
  "audit_power",
  "label_limits",
  "agent_variance",
  "retraction_record",
  "funder_route_recall",
  "abstract_cascade",
  "preprint_coverage",
  "trial_linkage",
  "three_model_screen",
  "instrument_contradicts_itself",
  "zero_probability_region",
  "canadian_linkage_misnames_itself",
  "classifier",
  "distillation_ceiling",
  "active_learning",
  "gemma_gate",
  "adjudication",
  "v1_to_v2",
];

function fmtFactory(lang: Lang) {
  return function fmt(v: unknown): string {
    if (typeof v === "number")
      return Number.isInteger(v) ? formatInt(lang, v) : String(v);
    if (typeof v === "boolean")
      return lang === "fr" ? (v ? "oui" : "non") : v ? "true" : "false";
    if (v === null || v === undefined)
      return lang === "fr" ? "Non disponible" : "Not available";
    return String(v);
  };
}

function Value({ v, lang }: { v: unknown; lang: Lang }) {
  const fmt = fmtFactory(lang);
  if (Array.isArray(v)) {
    return (
      <ul className="space-y-0.5">
        {v.map((x, i) => (
          <li key={i} className="text-xs">
            {typeof x === "object" && x !== null ? (
              <span className="font-mono">{JSON.stringify(x)}</span>
            ) : (
              fmt(x)
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof v === "object" && v !== null) {
    return (
      <dl className="space-y-0.5">
        {Object.entries(v as Record<string, unknown>).map(([k, x]) => (
          <div key={k} className="flex gap-2 text-xs">
            <dt style={{ color: "var(--ink-5)" }}>{k}:</dt>
            <dd className="tabular font-medium">{fmt(x)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span className="tabular font-medium">{fmt(v)}</span>;
}

function FindingValues({
  values,
  lang,
  label,
}: {
  values: Record<string, unknown>;
  lang: Lang;
  label: string;
}) {
  const content = (
    <div
      className="scroll-x rounded-md p-4"
      style={{ background: "var(--surface-2)" }}
    >
      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {Object.entries(values).map(([key, value]) => (
          <div key={key} className="min-w-0">
            <dt
              className="break-words text-xs uppercase tracking-wider"
              style={{ color: "var(--ink-4)" }}
            >
              {key.replace(/_/g, " ")}
            </dt>
            <dd className="mt-0.5 break-words text-sm">
              <Value v={value} lang={lang} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return lang === "fr" ? (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-medium">{label}</summary>
      <div className="mt-2">{content}</div>
    </details>
  ) : (
    <div className="mt-4">{content}</div>
  );
}

export default async function Findings(props: {
  params: Promise<{ lang: string }>;
}) {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const t = getDict(lang);

  const keys = [
    ...ORDER.filter((k) => k in findings),
    ...Object.keys(findings).filter((k) => !ORDER.includes(k)),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">{t.findings.title}</h1>
        <p
          className="mt-2 max-w-3xl leading-relaxed"
          style={{ color: "var(--ink-3)" }}
        >
          {t.findings.lead(keys.length)}
        </p>
        <p className="mt-3 text-sm">
          <a className="link" href="/api/v1/findings">
            {t.findings.apiLink}
          </a>
        </p>
      </div>
      <div className="space-y-6">
        {keys.map((k, i) => {
          const f = findings[k];
          if (!f) return null;
          const translated = lang === "fr" ? frFinding(k, f.headline) : null;
          return (
            <article key={k} className="card p-6">
              <div className="flex items-baseline gap-3">
                <span
                  className="tabular text-sm font-semibold"
                  style={{ color: "var(--mc)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="min-w-0 break-words font-serif text-xl">
                  {t.findings.titles[k] ?? k}
                </h2>
              </div>
              <p
                className="mt-3 leading-relaxed"
                style={{ color: "var(--ink-2)" }}
              >
                {translated ?? f.headline}
              </p>
              {/* The artifact itself stays on the page: the French text above is a
                  translation, and the English below is the evidence it translates. */}
              {translated && (
                <p
                  className="mt-3 border-l-2 pl-3 text-xs leading-relaxed"
                  lang="en-CA"
                  style={{
                    color: "var(--ink-5)",
                    borderColor: "var(--border)",
                  }}
                >
                  <span className="font-medium">
                    {t.findings.originalLabel}
                  </span>{" "}
                  {f.headline}
                </p>
              )}
              {f.values && Object.keys(f.values).length > 0 && (
                <FindingValues
                  values={f.values}
                  lang={lang}
                  label={t.findings.valuesLabel}
                />
              )}
              <div
                className="mt-3 font-mono text-xs"
                style={{ color: "var(--ink-5)" }}
              >
                {t.findings.computed(k, f.computed_at_utc)}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

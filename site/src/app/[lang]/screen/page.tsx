import type { Metadata } from "next";
import Link from "next/link";
import { displayText } from "@/lib/display-text";
import {
  getScreened,
  getScreenSummary,
  type ScreenFilters,
} from "@/lib/screen";
import findings from "@/data/findings.json";
import { getDict, type Dictionary } from "@/lib/i18n";
import {
  formatInt,
  formatPct,
  isLang,
  langAlternates,
  localePath,
  type Lang,
} from "@/lib/lang";
import { frFinding } from "@/lib/findings-fr";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  return {
    title: getDict(lang).meta.screen,
    alternates: langAlternates(lang, "/screen"),
  };
}

/**
 * THE DELIVERABLE.
 *
 * Not the base rate. The base rate is a number three models cannot agree on to
 * within a factor of two, and reporting it alone would be exactly the false
 * precision this project was built to expose. The deliverable is the DISAGREEMENT
 * DOSSIER: the works that mark the field's empirical boundary, shown with all
 * three models' verdicts, confidences and reasons side by side, so a reader can
 * see WHERE the boundary is contested and WHY.
 *
 * Every number on this page is read from the database or from findings.json.
 * Nothing here is typed by hand.
 */

/**
 * T1 and T2 are in scope. T3 is ADJACENT and is NOT, which is the rubric's own
 * definition: `n_in` counts T1 and T2 only. Colouring T3 as in-scope would make the
 * table contradict the histogram above it. A work all three models call T3 has
 * n_in = 0 and is not in the dossier at all.
 */
function tierColor(tier: string | null): string {
  if (tier === "T1" || tier === "T2") return "var(--in-scope)";
  if (tier === "T3") return "var(--contested)";
  return "var(--out)";
}

function tierLabel(t: Dictionary, tier: string): string {
  if (tier === "T1") return t.screen.tierT1;
  if (tier === "T2") return t.screen.tierT2;
  if (tier === "T3") return t.screen.tierT3;
  if (tier === "OUT") return t.screen.tierOut;
  return tier;
}

function Verdict({
  t,
  tier,
  conf,
}: {
  t: Dictionary;
  tier: string | null;
  conf: string | null;
}) {
  const v = tier || "OUT";
  const color = tierColor(tier);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className="chip"
        title={tierLabel(t, v)}
        style={{ borderColor: color, color, background: "transparent" }}
      >
        {v}
      </span>
      {conf && (
        <span className="text-xs" style={{ color: "var(--ink-5)" }}>
          {conf}
        </span>
      )}
    </span>
  );
}

const CONSENSUS_VIEWS = ["dossier", "3", "2", "1", "0", "all"] as const;

function tabLabel(
  t: Dictionary,
  view: (typeof CONSENSUS_VIEWS)[number],
): string {
  switch (view) {
    case "dossier":
      return t.screen.tabDossier;
    case "3":
      return t.screen.tab3;
    case "2":
      return t.screen.tab2;
    case "1":
      return t.screen.tab1;
    case "0":
      return t.screen.tab0;
    case "all":
      return t.screen.tabAll;
  }
}

export default async function Screen(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const t = getDict(lang);
  const p = (path: string) => localePath(lang, path);
  const n = (x: number) => formatInt(lang, x);

  const raw =
    typeof searchParams.view === "string" ? searchParams.view : "dossier";
  const view = CONSENSUS_VIEWS.find((v) => v === raw) ?? "dossier";
  const pageRaw =
    typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const f: ScreenFilters = {
    page,
    per_page: view === "all" || view === "0" ? 50 : 25,
  };
  if (view === "dossier") f.contested_only = true;
  else if (view !== "all") f.n_in = Number(view);

  const [{ rows, total, perPage }, s] = await Promise.all([
    getScreened(f),
    getScreenSummary(),
  ]);
  const pages = Math.ceil(total / perPage);

  // The screen's own finding, as written by the pipeline that produced the labels.
  // In French, the hand-checked translation is used only while it still matches
  // the artifact; otherwise the verbatim English is shown rather than a stale text.
  const f22 = findings.three_model_screen;
  const headline =
    (lang === "fr" && frFinding("three_model_screen", f22.headline)) ||
    f22.headline;

  return (
    <div className="space-y-8">
      <section>
        <p
          className="mb-3 text-xs uppercase tracking-wider"
          style={{ color: "var(--mc)" }}
        >
          {t.screen.eyebrow(n(s.n_screened))}
        </p>
        <h1
          className="font-serif text-4xl leading-tight"
          style={{ maxWidth: "26ch" }}
        >
          {t.screen.h1}
        </h1>
        <p
          className="mt-5 max-w-3xl text-base leading-relaxed"
          style={{ color: "var(--ink-3)" }}
        >
          {t.screen.p1({
            n: n(s.n_screened),
            anyIn: s.any_in,
            n3: s.n_in_3,
            pct3: formatPct(lang, String(s.pct_all_three)),
            n1: s.n_in_1,
            pct1: formatPct(lang, String(s.pct_single_model)),
          })}
        </p>
        <p
          className="mt-3 max-w-3xl text-base leading-relaxed"
          style={{ color: "var(--ink-3)" }}
        >
          {t.screen.p2}
        </p>
      </section>

      {/* The consensus histogram, computed, not asserted. */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t.screen.statAnyLabel}
          value={String(s.any_in)}
          note={t.screen.statAnyNote}
          color="var(--mc)"
        />
        <Stat
          label={t.screen.statAllLabel}
          value={`${s.n_in_3}`}
          note={t.screen.statAllNote(formatPct(lang, String(s.pct_all_three)))}
          color="var(--in-scope)"
        />
        <Stat
          label={t.screen.statTwoLabel}
          value={`${s.n_in_2}`}
          note={t.screen.statTwoNote}
          color="var(--contested)"
        />
        <Stat
          label={t.screen.statOneLabel}
          value={`${s.n_in_1}`}
          note={t.screen.statOneNote(
            formatPct(lang, String(s.pct_single_model)),
          )}
          color="var(--contested)"
        />
      </section>

      {/* Each model's own count. They are not interchangeable, and this is how you see it. */}
      <section className="card p-6">
        <h2 className="font-serif text-xl">{t.screen.modelsTitle}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-4)" }}>
          {t.screen.modelsSub({ n: n(s.n_screened), anyIn: s.any_in })}
        </p>
        <div className="mt-4 space-y-2">
          {s.per_model.map((m) => {
            const max = Math.max(...s.per_model.map((x) => x.called_in), 1);
            return (
              <div key={m.model} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm">{m.model}</span>
                <div
                  className="h-6 flex-1 rounded-sm"
                  style={{ background: "var(--surface-3)" }}
                >
                  <div
                    className="flex h-6 items-center justify-end rounded-sm px-2 text-xs font-medium"
                    style={{
                      width: `${(m.called_in / max) * 100}%`,
                      background: "var(--mc)",
                      color: "var(--on-mc)",
                      minWidth: 32,
                    }}
                  >
                    {m.called_in}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p
          className="mt-4 text-sm leading-relaxed"
          style={{ color: "var(--ink-4)" }}
        >
          {t.screen.modelsSpread}
        </p>
      </section>

      {/* THE DOSSIER */}
      <section>
        <h2 className="font-serif text-2xl">{t.screen.dossierTitle}</h2>
        <p
          className="mt-1 max-w-3xl text-sm leading-relaxed"
          style={{ color: "var(--ink-4)" }}
        >
          {t.screen.dossierSub}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {CONSENSUS_VIEWS.map((v) => {
            const on = v === view;
            return (
              <Link
                key={v}
                href={`${p("/screen")}?view=${v}`}
                className="chip"
                style={{
                  borderColor: on ? "var(--mc)" : "var(--border)",
                  background: on ? "var(--mc)" : "var(--surface-2)",
                  color: on ? "var(--on-mc)" : "var(--ink-3)",
                }}
              >
                {tabLabel(t, v)}
              </Link>
            );
          })}
        </div>

        <div className="mt-3 text-sm tabular" style={{ color: "var(--ink-4)" }}>
          {t.screen.workCount(n(total), total === 1)}
        </div>

        <div className="mt-3 grid gap-3 md:hidden">
          {rows.length === 0 && (
            <div
              className="card p-6 text-center"
              style={{ color: "var(--ink-4)" }}
            >
              {t.screen.emptyView}
            </div>
          )}
          {rows.map((row) => (
            <article key={row.id} className="card p-4">
              <Link
                href={p(`/works/${row.id}`)}
                className="font-medium hover:underline"
              >
                {row.title ? displayText(row.title) : t.common.noTitle}
              </Link>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: "var(--ink-4)" }}
              >
                {row.year ?? t.common.notAvailable} ·{" "}
                {row.type ?? t.common.notAvailable} ·{" "}
                {row.lang ?? t.common.notAvailable}
                {row.venue ? ` · ${row.venue}` : ""}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-y py-3 text-xs">
                <div>
                  <dt style={{ color: "var(--ink-4)" }}>
                    {t.screen.thStratum}
                  </dt>
                  <dd className="mt-1 break-all">
                    {row.stratum ?? t.common.notAvailable}
                    <span className="ml-2" style={{ color: "var(--ink-4)" }}>
                      w={row.weight?.toFixed(0) ?? t.common.notAvailable}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt style={{ color: "var(--ink-4)" }}>n_in</dt>
                  <dd className="mt-1 tabular font-medium">{row.nIn ?? 0}/3</dd>
                </div>
              </dl>
              <div className="mt-3 grid gap-4">
                <MobileEvidence
                  label="Opus 4.8"
                  t={t}
                  lang={lang}
                  tier={row.opusTier}
                  conf={row.opusConfidence}
                  reason={row.opusReason}
                />
                <MobileEvidence
                  label="GPT-5.6"
                  t={t}
                  lang={lang}
                  tier={row.gptTier}
                  conf={row.gptConfidence}
                  reason={row.gptReason}
                />
                <MobileEvidence
                  label="Grok 4.5"
                  t={t}
                  lang={lang}
                  tier={row.grokTier}
                  conf={row.grokConfidence}
                  reason={row.grokReason}
                />
              </div>
            </article>
          ))}
        </div>

        <div className="card scroll-x mt-3 hidden md:block">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ background: "var(--surface-2)" }}
              >
                <Th>{t.screen.thWork}</Th>
                <Th>{t.screen.thStratum}</Th>
                <Th>n_in</Th>
                <Th>Opus 4.8</Th>
                <Th>GPT-5.6</Th>
                <Th>Grok 4.5</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center"
                    style={{ color: "var(--ink-4)" }}
                  >
                    {t.screen.emptyView}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  <td className="max-w-[26rem] p-3">
                    <Link
                      href={p(`/works/${r.id}`)}
                      className="font-medium hover:underline"
                    >
                      {r.title ? displayText(r.title) : t.common.noTitle}
                    </Link>
                    <div
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--ink-5)" }}
                    >
                      {r.year ?? t.common.notAvailable} ·{" "}
                      {r.type ?? t.common.notAvailable} ·{" "}
                      {r.lang ?? t.common.notAvailable}
                      {r.venue ? ` · ${r.venue}` : ""}
                    </div>
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--ink-4)" }}>
                    {r.stratum ?? t.common.notAvailable}
                    <div style={{ color: "var(--ink-5)" }}>
                      w={r.weight?.toFixed(0) ?? t.common.notAvailable}
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className="chip tabular"
                      style={{
                        borderColor:
                          r.nIn === 3
                            ? "var(--in-scope)"
                            : r.nIn
                              ? "var(--contested)"
                              : "var(--out)",
                        color:
                          r.nIn === 3
                            ? "var(--in-scope)"
                            : r.nIn
                              ? "var(--contested)"
                              : "var(--out)",
                        background: "transparent",
                      }}
                    >
                      {r.nIn ?? 0}/3
                    </span>
                  </td>
                  <Cell
                    t={t}
                    lang={lang}
                    tier={r.opusTier}
                    conf={r.opusConfidence}
                    reason={r.opusReason}
                  />
                  <Cell
                    t={t}
                    lang={lang}
                    tier={r.gptTier}
                    conf={r.gptConfidence}
                    reason={r.gptReason}
                  />
                  <Cell
                    t={t}
                    lang={lang}
                    tier={r.grokTier}
                    conf={r.grokConfidence}
                    reason={r.grokReason}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="mt-4 flex justify-between text-sm">
            {page > 1 ? (
              <Link
                className="link"
                href={`${p("/screen")}?view=${view}&page=${page - 1}`}
              >
                {t.common.previous}
              </Link>
            ) : (
              <span />
            )}
            <span className="tabular" style={{ color: "var(--ink-4)" }}>
              {t.common.pageOf(n(page), n(pages))}
            </span>
            {page < pages ? (
              <Link
                className="link"
                href={`${p("/screen")}?view=${view}&page=${page + 1}`}
              >
                {t.common.next}
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">{t.screen.foundTitle}</h2>
        <p className="mt-3 leading-relaxed" style={{ color: "var(--ink-3)" }}>
          {headline}
        </p>
        <p className="mt-4 text-xs" style={{ color: "var(--ink-5)" }}>
          {t.screen.computed(f22.computed_at_utc)} ·{" "}
          <Link href={p("/findings")} className="link">
            {t.screen.allFindings}
          </Link>{" "}
          ·{" "}
          <a className="link" href="/api/v1/screened?contested_only=1">
            {t.screen.dossierJson}
          </a>
        </p>
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="whitespace-nowrap p-3 text-xs font-medium uppercase tracking-wider"
      style={{ color: "var(--ink-4)" }}
    >
      {children}
    </th>
  );
}

function Cell({
  t,
  lang,
  tier,
  conf,
  reason,
}: {
  t: Dictionary;
  lang: Lang;
  tier: string | null;
  conf: string | null;
  reason: string | null;
}) {
  return (
    <td className="max-w-[22rem] p-3">
      <ModelEvidence
        t={t}
        lang={lang}
        tier={tier}
        conf={conf}
        reason={reason}
      />
    </td>
  );
}

function MobileEvidence({
  label,
  ...evidence
}: {
  label: string;
  t: Dictionary;
  lang: Lang;
  tier: string | null;
  conf: string | null;
  reason: string | null;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider">
        {label}
      </h3>
      <ModelEvidence {...evidence} />
    </section>
  );
}

function ModelEvidence({
  t,
  lang,
  tier,
  conf,
  reason,
}: {
  t: Dictionary;
  lang: Lang;
  tier: string | null;
  conf: string | null;
  reason: string | null;
}) {
  return (
    <>
      <Verdict t={t} tier={tier} conf={conf} />
      {reason && (
        <div className="mt-2">
          <p
            className="text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "var(--ink-4)" }}
          >
            {t.screen.reasonLabel}
          </p>
          <p
            className="mt-1 text-xs leading-relaxed"
            lang={lang === "fr" ? "en-CA" : undefined}
            style={{ color: "var(--ink-4)" }}
          >
            {reason}
          </p>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div
        className="text-xs uppercase tracking-wider"
        style={{ color: "var(--ink-4)" }}
      >
        {label}
      </div>
      <div className="tabular mt-2 text-3xl font-semibold" style={{ color }}>
        {value}
      </div>
      <div
        className="mt-2 text-xs leading-snug"
        style={{ color: "var(--ink-4)" }}
      >
        {note}
      </div>
    </div>
  );
}

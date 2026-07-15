import Link from "next/link";
import { cohortSearch, EXPORT_CAP } from "@/lib/query";
import { canonicalFilters, filtersToQuery } from "@/lib/permalink";
import { filtersFromRecord } from "@/lib/api";
import { getFacets } from "@/lib/stats";
import { WorkRow } from "@/components/WorkRow";
import { CohortFilters } from "@/components/CohortFilters";
import { CohortActions } from "@/components/CohortActions";
import { getDict } from "@/lib/i18n";
import { classifierCopy } from "@/lib/classifier-copy";
import { formatInt, isLang, localePath, type Lang } from "@/lib/lang";

export const dynamic = "force-dynamic";

/**
 * The front page IS the query tool.
 *
 * MetaCan exists so that a meta-researcher can define a cohort of Canadian
 * works, count it exactly, export it, and cite it. That workflow starts here,
 * on the first screen, not behind a navigation item. The project's argument
 * for itself (the frame flip, the disagreement dossier, the measured limits)
 * still exists in full, one level down under "How this was built".
 *
 * Every filter state is a URL; the URL is the query; the query is citable via
 * /q/<hash>. The page, /api/v1/cohort and the export all parse the SAME
 * parameters with the SAME function, so no surface can answer a different
 * question from another.
 */
export default async function Home(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const t = getDict(lang);
  const classifierText = classifierCopy(lang);
  const p = (path: string) => localePath(lang, path);
  const n = (x: number) => formatInt(lang, x);

  const f = filtersFromRecord(searchParams);
  const [
    { rows, total, labeled, classified, classifier, page, perPage },
    facets,
  ] = await Promise.all([cohortSearch(f), getFacets()]);
  const pages = Math.max(Math.ceil(total / perPage), 1);

  // The canonical query string: what the export, the API link and the
  // permalink all receive. Pagination and sort are presentation, not cohort
  // membership, so they are not part of it.
  const shareFilters =
    f.label_source === "classifier" && classifier.version
      ? {
          ...f,
          label_mode: f.label_mode ?? ("candidate" as const),
          classifier_version: classifier.version,
        }
      : f;
  const canonicalQuery = filtersToQuery(canonicalFilters(shareFilters));

  const qs = (over: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams(filtersToQuery(f));
    for (const [k, v] of Object.entries(over)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, String(v));
    }
    return `?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">{t.cohort.title}</h1>
        <p
          className="mt-1 max-w-3xl text-sm leading-relaxed"
          style={{ color: "var(--ink-4)" }}
        >
          {t.cohort.sub(n(4_299_418))}
        </p>
      </div>

      <CohortFilters facets={facets} lang={lang} />

      <CohortActions
        query={canonicalQuery}
        total={total}
        exportCap={EXPORT_CAP}
        lang={lang}
      />

      <div className="space-y-1">
        <div
          className="flex items-baseline justify-between text-sm"
          style={{ color: "var(--ink-3)" }}
        >
          <span className="tabular font-medium" style={{ color: "var(--ink)" }}>
            {t.works.countWorks(n(total))}
            {f.q ? t.works.matching(f.q) : null}
          </span>
          <span className="tabular text-xs" style={{ color: "var(--ink-4)" }}>
            {t.common.pageOf(n(page), n(pages))}
          </span>
        </div>
        <p className="text-xs leading-snug" style={{ color: "var(--ink-4)" }}>
          {f.label_source === "classifier" ? (
            <>
              {classifierText.classifierCoverage}: {n(classified)} / {n(total)}.{" "}
              <span style={{ color: "var(--ink-5)" }}>
                {classifier.version
                  ? `${classifierText.versionLabel}: ${classifier.version}. ${classifierText.classifierHint}`
                  : classifierText.releaseUnavailable}
              </span>
            </>
          ) : (
            <>
              {t.cohort.coverage(n(labeled), n(total))}{" "}
              <span style={{ color: "var(--ink-5)" }}>
                {t.cohort.coverageNote}
              </span>
            </>
          )}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--ink-4)" }}>
          {t.works.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((w) => (
            <WorkRow
              key={w.id}
              lang={lang}
              w={{
                ...w,
                labels: w.labels.map((l) => ({
                  model: l.model,
                  categories: l.categories,
                  studyDesign: l.studyDesign,
                  confidence: l.confidence,
                })),
              }}
            />
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2">
        {page > 1 ? (
          <Link className="link text-sm" href={qs({ page: page - 1 })}>
            {t.common.previous}
          </Link>
        ) : (
          <span />
        )}
        {page < pages ? (
          <Link className="link text-sm" href={qs({ page: page + 1 })}>
            {t.common.next}
          </Link>
        ) : (
          <span />
        )}
      </div>

      <p
        className="border-t pt-4 text-xs leading-relaxed"
        style={{ color: "var(--ink-5)" }}
      >
        {t.nav.howBuilt}{" "}
        <Link href={p("/screen")} className="link">
          {t.nav.screen}
        </Link>
        {" · "}
        <Link href={p("/findings")} className="link">
          {t.nav.findings}
        </Link>
        {" · "}
        <Link href={p("/about")} className="link">
          {t.nav.about}
        </Link>
      </p>
    </div>
  );
}

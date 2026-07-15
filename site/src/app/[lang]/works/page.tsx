import type { Metadata } from "next";
import Link from "next/link";
import { searchWorks } from "@/lib/query";
import { filtersFromRecord } from "@/lib/api";
import { getFacets } from "@/lib/stats";
import { WorkRow } from "@/components/WorkRow";
import { Filters } from "@/components/Filters";
import { getDict } from "@/lib/i18n";
import { classifierCopy } from "@/lib/classifier-copy";
import { formatInt, isLang, langAlternates, type Lang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  return {
    title: getDict(lang).meta.works,
    alternates: langAlternates(lang, "/works"),
  };
}

export default async function Works(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const t = getDict(lang);
  const classifierText = classifierCopy(lang);

  const f = filtersFromRecord(searchParams);
  const [{ rows, total, page, perPage, capped, classifier }, facets] =
    await Promise.all([searchWorks(f), getFacets()]);
  const pages = Math.ceil(total / perPage);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...over })) {
      if (v !== undefined && v !== "" && typeof v !== "object")
        p.set(k, String(v));
    }
    return `?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">{t.works.title}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-4)" }}>
          {t.works.sub}
        </p>
      </div>

      <Filters facets={facets} lang={lang} />

      {f.label_source === "classifier" && (
        <p className="text-xs leading-snug" style={{ color: "var(--ink-4)" }}>
          {classifier.version
            ? `${classifierText.versionLabel}: ${classifier.version}. ${classifierText.classifierHint}`
            : classifierText.releaseUnavailable}
        </p>
      )}

      <div
        className="flex items-baseline justify-between text-sm"
        style={{ color: "var(--ink-4)" }}
      >
        <span className="tabular">
          {t.works.countWorks(
            capped ? t.works.countCapped : formatInt(lang, total),
          )}
          {f.q ? t.works.matching(f.q) : null}
        </span>
        <span className="tabular">
          {!capped && pages > 0
            ? t.common.pageOf(formatInt(lang, page), formatInt(lang, pages))
            : t.common.page(formatInt(lang, page))}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--ink-4)" }}>
          {t.works.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((w) => (
            <WorkRow key={w.id} w={w} lang={lang} />
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
        {rows.length === perPage ? (
          <Link className="link text-sm" href={qs({ page: page + 1 })}>
            {t.common.next}
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { displayText } from "@/lib/display-text";
import { getDict } from "@/lib/i18n";
import {
  formatInt,
  isLang,
  langAlternates,
  localePath,
  type Lang,
} from "@/lib/lang";
import {
  recentFiltersFromParams,
  searchRecentWorks,
  type RecentFilters,
} from "@/lib/recent";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  return {
    title: getDict(lang).meta.recent,
    alternates: langAlternates(lang, "/recent"),
  };
}

function routeState(filters: RecentFilters) {
  return {
    ca_aff: filters.route === "ca_aff",
    ca_fund: filters.route === "ca_fund",
    ca_venue: filters.route === "ca_venue",
    about_ca: filters.route === "about_ca",
  };
}

export default async function RecentWorks(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const t = getDict(lang);
  const p = (path: string) => localePath(lang, path);
  const locale = lang === "fr" ? "fr-CA" : "en-CA";
  const { filters, errorCode } = recentFiltersFromParams(searchParams);
  const { rows, total, sync } = await searchRecentWorks(filters);
  const pages = Math.max(Math.ceil(total / filters.perPage), 1);
  const activeRoute = routeState(filters);

  const date = (value: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(value);
  const dateTime = (value: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Toronto",
    }).format(value);

  const href = (
    overrides: Partial<
      Record<keyof RecentFilters, string | number | boolean | null>
    >,
  ) => {
    const query = new URLSearchParams();
    const base: Partial<
      Record<keyof RecentFilters, string | number | boolean>
    > = {
      days: filters.days,
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.route ? { route: filters.route } : {}),
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.lang ? { lang: filters.lang } : {}),
      ...(filters.hasAbstract !== undefined
        ? { hasAbstract: filters.hasAbstract }
        : {}),
      ...(filters.institution ? { institution: filters.institution } : {}),
      ...(filters.funder ? { funder: filters.funder } : {}),
      ...(filters.keyword ? { keyword: filters.keyword } : {}),
      ...(filters.venue ? { venue: filters.venue } : {}),
      ...(filters.topic ? { topic: filters.topic } : {}),
      ...(filters.field ? { field: filters.field } : {}),
      ...(filters.page > 1 ? { page: filters.page } : {}),
    };
    for (const [key, value] of Object.entries({ ...base, ...overrides })) {
      if (value !== null && value !== undefined && value !== "") {
        const parameter =
          key === "perPage"
            ? "per_page"
            : key === "hasAbstract"
              ? "has_abstract"
              : key;
        query.set(parameter, String(value));
      }
    }
    const encoded = query.toString();
    return `${p("/recent")}${encoded ? `?${encoded}` : ""}`;
  };

  type RecentFacetKey = Exclude<
    keyof RecentFilters,
    "days" | "page" | "perPage" | "q" | "route"
  >;
  const exactFilters: Array<{
    key: RecentFacetKey;
    parameter: string;
    label: string;
    value?: string;
    display?: string;
  }> = [
    {
      key: "year",
      parameter: "year",
      label: t.recent.publicationYear,
      value: filters.year?.toString(),
    },
    { key: "type", parameter: "type", label: t.recent.type, value: filters.type },
    {
      key: "lang",
      parameter: "lang",
      label: t.recent.language,
      value: filters.lang,
    },
    {
      key: "hasAbstract",
      parameter: "has_abstract",
      label: t.recent.hasAbstract,
      value:
        filters.hasAbstract === undefined
          ? undefined
          : String(filters.hasAbstract),
      display:
        filters.hasAbstract === undefined
          ? undefined
          : filters.hasAbstract
            ? t.common.yes
            : t.common.no,
    },
    {
      key: "institution",
      parameter: "institution",
      label: t.recent.institutions,
      value: filters.institution,
    },
    {
      key: "funder",
      parameter: "funder",
      label: t.recent.funders,
      value: filters.funder,
    },
    {
      key: "keyword",
      parameter: "keyword",
      label: t.recent.keywords,
      value: filters.keyword,
    },
    { key: "venue", parameter: "venue", label: t.recent.venue, value: filters.venue },
    { key: "topic", parameter: "topic", label: t.recent.topic, value: filters.topic },
    { key: "field", parameter: "field", label: t.recent.field, value: filters.field },
  ];
  const removeExactFilter = (key: (typeof exactFilters)[number]["key"]) => {
    const overrides: Partial<
      Record<keyof RecentFilters, string | number | boolean | null>
    > = { page: null };
    overrides[key] = null;
    return href(overrides);
  };

  const routes = [
    { key: "ca_aff", active: activeRoute.ca_aff, label: t.recent.routeAff },
    { key: "ca_fund", active: activeRoute.ca_fund, label: t.recent.routeFund },
    {
      key: "ca_venue",
      active: activeRoute.ca_venue,
      label: t.recent.routeVenue,
    },
    {
      key: "about_ca",
      active: activeRoute.about_ca,
      label: t.recent.routeAbout,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl">{t.recent.title}</h1>
          <span
            className="chip"
            style={{ borderColor: "var(--mc)", color: "var(--mc)" }}
          >
            {t.recent.liveBadge}
          </span>
        </div>
        <p
          className="mt-2 max-w-3xl text-sm leading-relaxed"
          style={{ color: "var(--ink-4)" }}
        >
          {t.recent.sub}
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-serif text-lg">{t.recent.syncTitle}</h2>
          {sync.lastSuccess ? (
            <div className="mt-2 space-y-1 text-sm" style={{ color: "var(--ink-3)" }}>
              <p>{t.recent.updatedAt(dateTime(sync.lastSuccess.completedAt ?? sync.lastSuccess.startedAt))}</p>
              <p>
                {t.recent.window(
                  date(sync.lastSuccess.windowStart),
                  date(sync.lastSuccess.windowEnd),
                )}
              </p>
              <p>{t.recent.stored(formatInt(lang, sync.lastSuccess.storedRows))}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-4)" }}>
              {t.recent.awaitingFirstSync}
            </p>
          )}
          {sync.latest &&
            ["failed", "interrupted"].includes(sync.latest.status) && (
              <p className="mt-3 text-sm" style={{ color: "var(--contested)" }}>
                {t.recent.latestFailed}
              </p>
            )}
        </div>
        <div className="card p-5">
          <h2 className="font-serif text-lg">{t.recent.immutableTitle}</h2>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--ink-4)" }}
          >
            {t.recent.immutableBody}
          </p>
        </div>
      </section>

      <form method="get" className="card grid gap-4 p-5 md:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide" style={{ color: "var(--ink-4)" }}>
            {t.recent.days}
          </span>
          <select
            name="days"
            defaultValue={filters.days}
            className="w-full rounded-md border px-2 py-2 text-sm"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            {[15, 21, 30].map((days) => (
              <option key={days} value={days}>
                {t.recent.daysOption(days)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide" style={{ color: "var(--ink-4)" }}>
            {t.recent.route}
          </span>
          <select
            name="route"
            defaultValue={filters.route ?? ""}
            className="w-full rounded-md border px-2 py-2 text-sm"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            <option value="">{t.recent.routeAny}</option>
            <option value="ca_aff">{t.recent.routeAff}</option>
            <option value="ca_fund">{t.recent.routeFund}</option>
            <option value="ca_venue">{t.recent.routeVenue}</option>
            <option value="about_ca">{t.recent.routeAbout}</option>
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-wide" style={{ color: "var(--ink-4)" }}>
            {t.recent.search}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={t.recent.searchPlaceholder}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          />
        </label>
        {exactFilters.map(
          (filter) =>
            filter.value && (
              <input
                key={filter.key}
                type="hidden"
                name={filter.parameter}
                value={filter.value}
              />
            ),
        )}
        <div className="flex flex-wrap items-center gap-3 md:col-span-4">
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "var(--mc)", color: "var(--on-mc)" }}
          >
            {t.recent.apply}
          </button>
          <Link href={p("/recent")} className="link text-sm">
            {t.recent.reset}
          </Link>
          {exactFilters.map(
            (filter) =>
              filter.value && (
                <Link
                  key={filter.key}
                  href={removeExactFilter(filter.key)}
                  className="chip record-filter-chip"
                  title={t.recent.removeFilter}
                >
                  {filter.label}: {displayText(filter.display ?? filter.value)} ×
                </Link>
              ),
          )}
        </div>
      </form>

      {errorCode && (
        <p className="card p-4 text-sm" style={{ color: "var(--contested)" }}>
          {t.recent.filterErrors[errorCode]}
        </p>
      )}

      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="tabular font-medium">
          {t.recent.count(formatInt(lang, total))}
        </span>
        <span className="text-xs" style={{ color: "var(--ink-4)" }}>
          {t.common.pageOf(formatInt(lang, filters.page), formatInt(lang, pages))}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--ink-4)" }}>
          {t.recent.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((work) => {
            const workRoutes = routes.filter((route) => {
              if (route.key === "ca_aff") return work.routeCaAff;
              if (route.key === "ca_fund") return work.routeCaFund;
              if (route.key === "ca_venue") return work.routeCaVenue;
              return work.routeAboutCa;
            });
            return (
              <article key={work.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={p(`/recent/${work.id}`)}
                      className="font-medium leading-snug hover:underline"
                    >
                      {displayText(work.title)}
                    </Link>
                    <div
                      className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                      style={{ color: "var(--ink-4)" }}
                    >
                      <span>{t.recent.published(date(work.publicationDate))}</span>
                      {work.type && <span>· {work.type}</span>}
                      {work.lang && <span>· {work.lang}</span>}
                      {work.venue && <span>· {displayText(work.venue)}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {workRoutes.map((route) => (
                        <span key={route.key} className="chip">
                          {route.label}
                        </span>
                      ))}
                      {!work.hasAbstract && (
                        <span className="chip" style={{ color: "var(--contested)" }}>
                          {t.recent.noAbstract}
                        </span>
                      )}
                    </div>
                    {work.caInstitutions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {work.caInstitutions.slice(0, 8).map((institution) => (
                          <Link
                            key={institution}
                            href={href({ institution, page: null })}
                            className="chip record-filter-chip"
                            title={t.recent.filterHint}
                          >
                            {displayText(institution)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tabular text-lg font-semibold">
                      {formatInt(lang, work.citedBy)}
                    </div>
                    <div className="text-xs" style={{ color: "var(--ink-5)" }}>
                      {t.common.citations}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex justify-between pt-2">
        {filters.page > 1 ? (
          <Link href={href({ page: filters.page - 1 })} className="link text-sm">
            {t.common.previous}
          </Link>
        ) : (
          <span />
        )}
        {filters.page < pages ? (
          <Link href={href({ page: filters.page + 1 })} className="link text-sm">
            {t.common.next}
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

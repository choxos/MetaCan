import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadableAbstract } from "@/components/ReadableAbstract";
import { fetchAbstract } from "@/lib/abstracts";
import { displayText } from "@/lib/display-text";
import { getDict, type Dictionary } from "@/lib/i18n";
import {
  formatInt,
  isLang,
  langAlternates,
  localePath,
  type Lang,
} from "@/lib/lang";
import { getRecentWork, recentAuthors } from "@/lib/recent";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const work = await getRecentWork(params.id);
  return {
    title: work?.title
      ? displayText(work.title).slice(0, 60)
      : getDict(lang).meta.recentNotFound,
    alternates: langAlternates(lang, `/recent/${params.id}`),
  };
}

const ROUTE_KEYS = [
  "routeCaAff",
  "routeCaFund",
  "routeCaVenue",
  "routeAboutCa",
] as const;

function routeDefinitions(t: Dictionary) {
  return [
    {
      key: "routeCaAff",
      name: t.workDetail.routeAffName,
      why: t.workDetail.routeAffWhy,
    },
    {
      key: "routeCaFund",
      name: t.workDetail.routeFundName,
      why: t.workDetail.routeFundWhy,
    },
    {
      key: "routeCaVenue",
      name: t.workDetail.routeVenueName,
      why: t.workDetail.routeVenueWhy,
    },
    {
      key: "routeAboutCa",
      name: t.workDetail.routeAboutName,
      why: t.workDetail.routeAboutWhy,
    },
  ] as Array<{
    key: (typeof ROUTE_KEYS)[number];
    name: string;
    why: string;
  }>;
}

function Field({
  label,
  notAvailable,
  children,
}: {
  label: string;
  notAvailable: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b py-2.5 last:border-0">
      <dt
        className="text-xs uppercase tracking-wider"
        style={{ color: "var(--ink-4)" }}
      >
        {label}
      </dt>
      <dd className="mt-0.5 break-words">
        {children ?? (
          <span style={{ color: "var(--ink-5)" }}>{notAvailable}</span>
        )}
      </dd>
    </div>
  );
}

export default async function RecentWorkDetail(props: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const t = getDict(lang);
  const p = (path: string) => localePath(lang, path);
  const locale = lang === "fr" ? "fr-CA" : "en-CA";
  const work = await getRecentWork(params.id);
  if (!work) notFound();

  const preferredAbstract = await fetchAbstract(work.id, work.doi);
  const abstractText = preferredAbstract?.text ?? work.abstract;
  const abstractSource = preferredAbstract?.text
    ? preferredAbstract.source
    : work.abstract
      ? "stored"
      : null;
  const storedAuthors = recentAuthors(work.authors);
  const authors =
    storedAuthors.length > 0 ? storedAuthors : preferredAbstract?.authors ?? [];
  const pmid = work.pmid ?? preferredAbstract?.pmid ?? null;
  const pmcid = work.pmcid ?? preferredAbstract?.pmcid ?? null;
  const admitted = routeDefinitions(t).filter((route) => work[route.key]);
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
  const filterHref = (key: string, value: string) => {
    const query = new URLSearchParams({ days: "30", [key]: value });
    return `${p("/recent")}?${query.toString()}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href={p("/recent")} className="link text-sm">
          {t.recent.back}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl leading-tight">
            {displayText(work.title)}
          </h1>
          <span
            className="chip"
            style={{ borderColor: "var(--mc)", color: "var(--mc)" }}
          >
            {t.recent.liveBadge}
          </span>
        </div>
        <div
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
          style={{ color: "var(--ink-4)" }}
        >
          <Link className="link" href={filterHref("year", String(work.year))}>
            {date(work.publicationDate)}
          </Link>
          {work.type && (
            <span>
              · <Link className="link" href={filterHref("type", work.type)}>{work.type}</Link>
            </span>
          )}
          {work.lang && (
            <span>
              · <Link className="link" href={filterHref("lang", work.lang)}>{work.lang}</Link>
            </span>
          )}
          <span>· {t.workDetail.citations(formatInt(lang, work.citedBy))}</span>
          <span>
            ·{" "}
            <a
              className="link"
              href={`https://openalex.org/${work.id}`}
              target="_blank"
              rel="noreferrer"
            >
              {t.recent.openAlex}
            </a>
          </span>
          {work.doi && (
            <span>
              ·{" "}
              <a
                className="link"
                href={`https://doi.org/${work.doi}`}
                target="_blank"
                rel="noreferrer"
              >
                {work.doi}
              </a>
            </span>
          )}
        </div>
      </div>

      <section className="card p-6">
        <h2 className="font-serif text-xl">{t.workDetail.whyTitle}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-4)" }}>
          {t.workDetail.whySub}
        </p>
        <div className="mt-4 space-y-2">
          {admitted.map((route) => (
            <div
              key={route.key}
              className="flex flex-col items-start gap-2 rounded-md p-3 sm:flex-row sm:gap-3"
              style={{ background: "var(--surface-2)" }}
            >
              <span
                className="chip shrink-0 self-start"
                style={{
                  borderColor: "var(--mc)",
                  color: "var(--mc)",
                  background: "transparent",
                }}
              >
                {route.name}
              </span>
              <span className="text-sm" style={{ color: "var(--ink-3)" }}>
                {route.why}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          <section className="card p-6" style={{ borderColor: "var(--contested)" }}>
            <h2 className="font-serif text-xl">
              {t.recent.classificationTitle}
            </h2>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--ink-3)" }}
            >
              {t.recent.classificationBody}
            </p>
          </section>

          <section className="card p-6">
            <h2 className="font-serif text-xl">{t.recent.abstractTitle}</h2>
            {abstractText ? (
              <>
                <ReadableAbstract
                  text={abstractText}
                  expandLabel={t.workDetail.abstractExpand}
                  collapseLabel={t.workDetail.abstractCollapse}
                />
                <p className="mt-3 text-xs" style={{ color: "var(--ink-5)" }}>
                  {abstractSource === "pubmed"
                    ? t.recent.abstractPubMed
                    : abstractSource === "europe_pmc"
                      ? t.recent.abstractEuropePmc
                      : abstractSource === "openalex"
                        ? t.recent.abstractOpenAlex
                        : t.recent.abstractStored}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm" style={{ color: "var(--ink-4)" }}>
                {t.recent.abstractNone}
              </p>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20">
          <section className="card p-6">
            <h2 className="font-serif text-xl">{t.recent.recordTitle}</h2>
            <dl className="mt-2">
              <Field label={t.recent.publicationDate} notAvailable={t.common.notAvailable}>
                {date(work.publicationDate)}
              </Field>
              <Field label={t.recent.publicationYear} notAvailable={t.common.notAvailable}>
                <Link
                  href={filterHref("year", String(work.year))}
                  className="link"
                  title={t.recent.filterHint}
                >
                  {work.year}
                </Link>
              </Field>
              <Field label={t.recent.type} notAvailable={t.common.notAvailable}>
                {work.type ? (
                  <Link
                    href={filterHref("type", work.type)}
                    className="link"
                    title={t.recent.filterHint}
                  >
                    {work.type}
                  </Link>
                ) : null}
              </Field>
              <Field label={t.recent.language} notAvailable={t.common.notAvailable}>
                {work.lang ? (
                  <Link
                    href={filterHref("lang", work.lang)}
                    className="link"
                    title={t.recent.filterHint}
                  >
                    {work.lang}
                  </Link>
                ) : null}
              </Field>
              <Field label={t.recent.hasAbstract} notAvailable={t.common.notAvailable}>
                <Link
                  href={filterHref("has_abstract", String(work.hasAbstract))}
                  className="link"
                  title={t.recent.filterHint}
                >
                  {work.hasAbstract ? t.common.yes : t.common.no}
                </Link>
              </Field>
              <Field label={t.recent.venue} notAvailable={t.common.notAvailable}>
                {work.venue ? (
                  <Link
                    href={filterHref("venue", work.venue)}
                    className="link"
                    title={t.recent.filterHint}
                  >
                    {displayText(work.venue)}
                  </Link>
                ) : null}
              </Field>
              <Field label={t.recent.topic} notAvailable={t.common.notAvailable}>
                {work.topic ? (
                  <Link
                    href={filterHref("topic", work.topic)}
                    className="link"
                    title={t.recent.filterHint}
                  >
                    {displayText(work.topic)}
                  </Link>
                ) : null}
              </Field>
              <Field label={t.recent.field} notAvailable={t.common.notAvailable}>
                {work.field ? (
                  <Link
                    href={filterHref("field", work.field)}
                    className="link"
                    title={t.recent.filterHint}
                  >
                    {displayText(work.field)}
                  </Link>
                ) : null}
              </Field>
              <Field
                label={t.recent.institutions}
                notAvailable={t.common.notAvailable}
              >
                {work.caInstitutions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {work.caInstitutions.map((institution) => (
                      <Link
                        key={institution}
                        href={filterHref("institution", institution)}
                        className="chip record-filter-chip"
                        title={t.recent.filterHint}
                      >
                        {displayText(institution)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </Field>
              <Field label={t.recent.funders} notAvailable={t.common.notAvailable}>
                {work.funders.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {work.funders.map((funder) => (
                      <Link
                        key={funder}
                        href={filterHref("funder", funder)}
                        className="chip record-filter-chip"
                        title={t.recent.filterHint}
                      >
                        {displayText(funder)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </Field>
              <Field label={t.recent.keywords} notAvailable={t.common.notAvailable}>
                {work.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {work.keywords.map((keyword) => (
                      <Link
                        key={keyword}
                        href={filterHref("keyword", keyword)}
                        className="chip record-filter-chip"
                        title={t.recent.filterHint}
                      >
                        {displayText(keyword)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </Field>
              <Field label={t.recent.identifiers} notAvailable={t.common.notAvailable}>
                <div className="space-y-1">
                  {pmid && (
                    <div>
                      {t.recent.pmid}:{" "}
                      <a
                        className="link"
                        href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {pmid}
                      </a>
                    </div>
                  )}
                  {pmcid && (
                    <div>
                      {t.recent.pmcid}:{" "}
                      <a
                        className="link"
                        href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {pmcid}
                      </a>
                    </div>
                  )}
                  <div>
                    {t.recent.openAlex}:{" "}
                    <a
                      className="link"
                      href={`https://openalex.org/${work.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {work.id}
                    </a>
                  </div>
                </div>
              </Field>
            </dl>
            <p className="mt-3 text-xs" style={{ color: "var(--ink-5)" }}>
              {t.recent.lastSynced(dateTime(work.syncedAt))}
            </p>
          </section>

          <section className="card p-6">
            <h2 className="font-serif text-xl">{t.recent.authors}</h2>
            {authors.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {authors.map((author, index) => (
                  <li key={author.id ?? `${author.name ?? "author"}-${index}`}>
                    {author.id ? (
                      <a
                        className="link font-medium"
                        href={`https://openalex.org/${author.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {displayText(author.name ?? author.id)}
                      </a>
                    ) : (
                      <span className="font-medium">
                        {author.name
                          ? displayText(author.name)
                          : t.common.notAvailable}
                      </span>
                    )}
                    {author.institutions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {author.institutions.map((institution, index) =>
                          institution.name ? (
                            <Link
                              key={institution.id ?? `${institution.name}-${index}`}
                              href={filterHref("institution", institution.name)}
                              className="chip record-filter-chip"
                              title={t.recent.filterHint}
                            >
                              {displayText(institution.name)}
                            </Link>
                          ) : null,
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm" style={{ color: "var(--ink-4)" }}>
                {t.recent.noAuthors}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

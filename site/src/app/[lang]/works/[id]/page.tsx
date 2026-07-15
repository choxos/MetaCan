import Link from "next/link";
import { notFound } from "next/navigation";
import { displayText } from "@/lib/display-text";
import { getWork } from "@/lib/query";
import { fetchAbstract } from "@/lib/abstracts";
import { resolveClassifierContext } from "@/lib/predictions";
import { getDict, type Dictionary } from "@/lib/i18n";
import { formatInt, isLang, langAlternates, type Lang } from "@/lib/lang";
import { localePath } from "@/lib/lang";
import {
  DirectLabelsPanel,
  LegacyScoresPanel,
} from "@/components/WorkDetailEvidence";
import { WorkClassifierPanel } from "@/components/WorkClassifierPanel";
import { WorkScreenPanel } from "@/components/WorkScreenPanel";
import { ReadableAbstract } from "@/components/ReadableAbstract";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const w = await getWork(params.id);
  return {
    title: w?.title
      ? displayText(w.title).slice(0, 60)
      : getDict(lang).meta.workNotFound,
    alternates: langAlternates(lang, `/works/${params.id}`),
  };
}

const ROUTE_KEYS = [
  "routeCaAff",
  "routeCaFund",
  "routeCaVenue",
  "routeAboutCa",
] as const;

function routeDefs(t: Dictionary) {
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
  ] as Array<{ key: (typeof ROUTE_KEYS)[number]; name: string; why: string }>;
}

function Field({
  label,
  notAvailable,
  children,
}: {
  label: string;
  notAvailable?: string;
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

export default async function WorkDetail(props: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const t = getDict(lang);
  const p = (path: string) => localePath(lang, path);
  const filterHref = (values: Record<string, string | number>) => {
    const search = new URLSearchParams(
      Object.entries(values).map(([key, value]) => [key, String(value)]),
    );
    return `${p("/works")}?${search.toString()}`;
  };

  const classifier = await resolveClassifierContext({}, true);
  const w = await getWork(params.id, classifier);
  if (!w) notFound();

  const enrichment = await fetchAbstract(w.id, w.doi);
  const abstract = enrichment?.text
    ? enrichment
    : w.screened?.abstract
      ? ({ text: w.screened.abstract, source: "screening_record" } as const)
      : null;
  const s = w.screened;
  const r = w.retraction;

  const admitted = routeDefs(t).filter((route) => w[route.key]);
  const chips = (arr: string) =>
    arr
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <Link href={p("/works")} className="link text-sm">
          {t.workDetail.back}
        </Link>
        <h1 className="mt-2 font-serif text-3xl leading-tight">
          {w.title ? displayText(w.title) : t.common.noTitle}
        </h1>
        <div
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
          style={{ color: "var(--ink-4)" }}
        >
          {w.year ? (
            <Link
              className="link tabular"
              href={filterHref({ year_from: w.year, year_to: w.year })}
              title={t.workDetail.filterHint}
            >
              {w.year}
            </Link>
          ) : (
            <span>{t.common.notAvailable}</span>
          )}
          {w.type && (
            <span>
              ·{" "}
              <Link
                className="link"
                href={filterHref({ type: w.type })}
                title={t.workDetail.filterHint}
              >
                {w.type}
              </Link>
            </span>
          )}
          {w.lang && (
            <span>
              ·{" "}
              <Link
                className="link"
                href={filterHref({ lang: w.lang })}
                title={t.workDetail.filterHint}
              >
                {w.lang}
              </Link>
            </span>
          )}
          <span className="tabular">
            · {t.workDetail.citations(formatInt(lang, w.citedBy))}
          </span>
          <span>
            ·{" "}
            <a
              className="link"
              href={`https://openalex.org/${w.id}`}
              target="_blank"
              rel="noreferrer"
            >
              {t.workDetail.onOpenAlex(w.id)}
            </a>
          </span>
          {w.doi && (
            <span>
              ·{" "}
              <a
                className="link"
                href={`https://doi.org/${w.doi}`}
                target="_blank"
                rel="noreferrer"
              >
                {w.doi}
              </a>
            </span>
          )}
        </div>
      </div>

      {/* THE ROUTES. This is the point of the project, so it goes first, above the
          bibliographic record, and it says why each route admitted the work. */}
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

        {!w.routeCaAff && (
          <p
            className="mt-4 rounded-md border p-3 text-sm leading-relaxed"
            style={{ borderColor: "var(--mc-accent)", color: "var(--ink-2)" }}
          >
            {t.workDetail.noAffCallout}
          </p>
        )}
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          {/* Retraction: the four-state record, not the boolean. */}
          {(r || w.isRetracted) && (
            <section
              className="card p-6"
              style={{ borderColor: "var(--retraction)" }}
            >
          <h2 className="font-serif text-xl">{t.workDetail.postPubTitle}</h2>
          {r ? (
            <>
              <dl className="mt-3">
                <Field
                  label={t.workDetail.nature}
                  notAvailable={t.common.notAvailable}
                >
                  {r.nature}
                </Field>
                <Field
                  label={t.workDetail.reason}
                  notAvailable={t.common.notAvailable}
                >
                  {r.reason}
                </Field>
                <Field
                  label={t.workDetail.date}
                  notAvailable={t.common.notAvailable}
                >
                  {r.retractionDate}
                </Field>
                <Field label={t.workDetail.flagged}>
                  {r.openalexFlagged ? (
                    t.workDetail.flaggedYes
                  ) : (
                    <span style={{ color: "var(--retraction)" }}>
                      {t.workDetail.flaggedNo}
                    </span>
                  )}
                </Field>
              </dl>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "var(--ink-4)" }}
              >
                {t.workDetail.rwSource}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
              {t.workDetail.openalexOnly}
            </p>
          )}
            </section>
          )}

          {s && <WorkScreenPanel screened={s} lang={lang} t={t} />}

          <DirectLabelsPanel labels={w.labels} lang={lang} t={t} />

          <WorkClassifierPanel
            context={classifier}
            prediction={w.predictions[0]}
            lang={lang}
            t={t}
          />

          <LegacyScoresPanel score={w.score} lang={lang} t={t} />

          <section className="card p-6">
            <h2 className="font-serif text-xl">
              {t.workDetail.abstractTitle}
            </h2>
            {abstract?.text ? (
              <>
                <ReadableAbstract
                  text={abstract.text}
                  expandLabel={t.workDetail.abstractExpand}
                  collapseLabel={t.workDetail.abstractCollapse}
                />
                <p className="mt-3 text-xs" style={{ color: "var(--ink-5)" }}>
                  {abstract.source === "screening_record"
                    ? t.workDetail.abstractStored
                    : abstract.source === "pubmed"
                      ? t.workDetail.abstractPubMed
                      : abstract.source === "europe_pmc"
                        ? t.workDetail.abstractEuropePmc
                        : t.workDetail.abstractOpenAlex}
                </p>
              </>
            ) : (
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "var(--ink-4)" }}
              >
                {w.hasAbstract
                  ? t.workDetail.abstractUnavailable
                  : t.workDetail.abstractNone}
              </p>
            )}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-20">
          <section className="card p-6">
            <h2 className="font-serif text-xl">{t.workDetail.recordTitle}</h2>
            <dl className="mt-2">
          <Field
            label={t.workDetail.venue}
            notAvailable={t.common.notAvailable}
          >
            {w.venue ? (
              <Link
                className="link"
                href={filterHref({ venue: w.venue })}
                title={t.workDetail.filterHint}
              >
                {displayText(w.venue)}
              </Link>
            ) : null}
          </Field>
          <Field
            label={t.workDetail.topic}
            notAvailable={t.common.notAvailable}
          >
            {w.topic ? (
              <Link
                className="link"
                href={filterHref({ topic: w.topic })}
                title={t.workDetail.filterHint}
              >
                {displayText(w.topic)}
              </Link>
            ) : null}
          </Field>
          <Field
            label={t.workDetail.field}
            notAvailable={t.common.notAvailable}
          >
            {w.field ? (
              <Link
                className="link"
                href={filterHref({ field: w.field })}
                title={t.workDetail.filterHint}
              >
                {displayText(w.field)}
              </Link>
            ) : null}
          </Field>
          <Field
            label={t.workDetail.authors}
            notAvailable={t.common.notAvailable}
          >
            {enrichment?.authors.length ? (
              <ul className="space-y-3">
                {enrichment.authors.map((author) => (
                  <li key={author.id}>
                    <a
                      className="link text-sm font-medium"
                      href={`https://openalex.org/${author.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {displayText(author.name)}
                    </a>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {author.institutions.map((institution) => (
                        <Link
                          key={institution.id}
                          className="chip record-filter-chip"
                          href={filterHref({ institution: institution.name })}
                          title={t.workDetail.filterHint}
                        >
                          {displayText(institution.name)}
                        </Link>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>
          <Field
            label={t.workDetail.institutions}
            notAvailable={t.common.notAvailable}
          >
            {w.caInstitutions ? (
              <span className="flex flex-wrap gap-1">
                {chips(w.caInstitutions).map((i, k) => (
                  <Link
                    key={k}
                    className="chip record-filter-chip"
                    href={filterHref({ institution: i })}
                    title={t.workDetail.filterHint}
                  >
                    {displayText(i)}
                  </Link>
                ))}
              </span>
            ) : null}
          </Field>
          <Field
            label={t.workDetail.funders}
            notAvailable={t.common.notAvailable}
          >
            {w.funders ? (
              <span className="flex flex-wrap gap-1">
                {chips(w.funders).map((i, k) => (
                  <Link
                    key={k}
                    className="chip record-filter-chip"
                    href={filterHref({ funder: i })}
                    title={t.workDetail.filterHint}
                  >
                    {displayText(i)}
                  </Link>
                ))}
              </span>
            ) : null}
          </Field>
          <Field
            label={t.workDetail.keywords}
            notAvailable={t.common.notAvailable}
          >
            {w.keywords ? (
              <span className="flex flex-wrap gap-1">
                {chips(w.keywords).map((i, k) => (
                  <Link
                    key={k}
                    className="chip record-filter-chip"
                    href={filterHref({ keyword: i })}
                    title={t.workDetail.filterHint}
                  >
                    {displayText(i)}
                  </Link>
                ))}
              </span>
            ) : null}
          </Field>
          <Field label={t.workDetail.hasAbstract}>
            <Link
              className="link"
              href={filterHref({ abstract: w.hasAbstract ? "has" : "none" })}
              title={t.workDetail.filterHint}
            >
              {w.hasAbstract ? t.common.yes : t.common.no}
            </Link>
          </Field>
          {enrichment?.pmid && (
            <Field label={t.workDetail.pmid}>
              <a
                className="link font-mono text-sm"
                href={`https://pubmed.ncbi.nlm.nih.gov/${enrichment.pmid}/`}
                target="_blank"
                rel="noreferrer"
              >
                {enrichment.pmid}
              </a>
            </Field>
          )}
          {enrichment?.pmcid && (
            <Field label={t.workDetail.pmcid}>
              <a
                className="link font-mono text-sm"
                href={`https://pmc.ncbi.nlm.nih.gov/articles/${enrichment.pmcid}/`}
                target="_blank"
                rel="noreferrer"
              >
                {enrichment.pmcid}
              </a>
            </Field>
          )}
          <Field label={t.workDetail.api}>
            <a
              className="link font-mono text-xs"
              href={`/api/v1/works/${w.id}`}
            >
              /api/v1/works/{w.id}
            </a>
          </Field>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

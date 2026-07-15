import Link from "next/link";
import { displayText } from "@/lib/display-text";
import { getDict, type Dictionary } from "@/lib/i18n";
import { formatInt, localePath, type Lang } from "@/lib/lang";
import type { PredictionRecord } from "@/lib/predictions";
import {
  ConsensusChip,
  LabelChips,
  PredictionChips,
  RetractionChip,
} from "@/components/WorkRowEvidence";

/**
 * One work in the browse list.
 *
 * The row leads with the ROUTES that admitted the work, not with the metadata,
 * because "why is this here?" is the question this frame exists to answer. A row
 * that showed only title and year would be a search result; this is a provenance
 * record.
 *
 * The short chip texts (aff, fund, venue, about, no aff) are deliberately NOT
 * translated: they are the same tokens the API and the ?route= filter use, so
 * they read as code in both languages. Their title attributes carry the
 * explanation in the reader's language.
 */

export interface WorkRowData {
  id: string;
  title: string;
  doi: string | null;
  year: number | null;
  lang: string | null;
  type: string | null;
  venue: string | null;
  field: string | null;
  citedBy: number;
  isRetracted: boolean;
  hasAbstract: boolean;
  routeCaAff: boolean;
  routeCaFund: boolean;
  routeCaVenue: boolean;
  routeAboutCa: boolean;
  retraction?: { nature: string | null; openalexFlagged: boolean } | null;
  screened?: { nIn: number | null } | null;
  /**
   * Machine labels, when the caller hydrated them (the cohort builder does;
   * the legacy /works page does not). `undefined` = the caller did not ask, so
   * show nothing. `[]` = the caller asked and the work is UNLABELLED, which is
   * shown as exactly that, never as a negative.
   */
  labels?: Array<{
    model: string;
    categories: string[];
    studyDesign: string | null;
    confidence: string | null;
  }>;
  predictions?: PredictionRecord[];
}

const ROUTE_DEFS = [
  {
    key: "routeCaAff",
    short: "aff",
    title: (t: Dictionary) => t.workRow.routeAffTitle,
  },
  {
    key: "routeCaFund",
    short: "fund",
    title: (t: Dictionary) => t.workRow.routeFundTitle,
  },
  {
    key: "routeCaVenue",
    short: "venue",
    title: (t: Dictionary) => t.workRow.routeVenueTitle,
  },
  {
    key: "routeAboutCa",
    short: "about",
    title: (t: Dictionary) => t.workRow.routeAboutTitle,
  },
] as const;

export function RouteChips({ w, t }: { w: WorkRowData; t: Dictionary }) {
  const hit = ROUTE_DEFS.filter((r) => w[r.key]);
  return (
    <span className="inline-flex flex-wrap gap-1">
      {hit.map((r) => (
        <span
          key={r.short}
          className="chip"
          title={r.title(t)}
          style={{
            borderColor: "var(--mc)",
            color: "var(--mc)",
            background: "transparent",
          }}
        >
          {r.short}
        </span>
      ))}
      {/* The frame's whole argument: an affiliation-only frame never sees this work. */}
      {!w.routeCaAff && (
        <span
          className="chip"
          title={t.workRow.noAffTitle}
          style={{
            borderColor: "var(--mc-accent)",
            color: "var(--mc-accent)",
            background: "transparent",
          }}
        >
          no&nbsp;aff
        </span>
      )}
    </span>
  );
}

export function WorkRow({ w, lang }: { w: WorkRowData; lang: Lang }) {
  const t = getDict(lang);
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={localePath(lang, `/works/${w.id}`)}
            className="font-medium leading-snug hover:underline"
          >
            {w.title ? displayText(w.title) : (
              <span style={{ color: "var(--ink-4)" }}>{t.common.noTitle}</span>
            )}
          </Link>

          <div
            className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
            style={{ color: "var(--ink-4)" }}
          >
            {w.year !== null && <span className="tabular">{w.year}</span>}
            {w.type && <span>· {displayText(w.type)}</span>}
            {w.lang && <span>· {w.lang}</span>}
            {w.venue && (
              <span
                className="truncate"
                style={{ maxWidth: "38ch" }}
                title={displayText(w.venue)}
              >
                · {displayText(w.venue)}
              </span>
            )}
            {w.field && <span>· {displayText(w.field)}</span>}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <RouteChips w={w} t={t} />
            {!w.hasAbstract && (
              <span
                className="chip"
                title={t.workRow.noAbstractTitle}
                style={{
                  borderColor: "var(--contested)",
                  color: "var(--contested)",
                  background: "transparent",
                }}
              >
                {t.workRow.noAbstractChip}
              </span>
            )}
            <RetractionChip w={w} t={t} />
            {w.screened?.nIn != null && (
              <ConsensusChip nIn={w.screened.nIn} t={t} />
            )}
          </div>

          {w.labels !== undefined && (
            <div className="mt-1.5">
              <LabelChips labels={w.labels} t={t} />
            </div>
          )}
          {w.predictions?.[0] && (
            <div className="mt-1.5">
              <PredictionChips prediction={w.predictions[0]} lang={lang} />
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="tabular text-lg font-semibold">
            {formatInt(lang, w.citedBy)}
          </div>
          <div className="text-xs" style={{ color: "var(--ink-5)" }}>
            {t.common.citations}
          </div>
        </div>
      </div>
    </article>
  );
}

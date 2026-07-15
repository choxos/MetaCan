"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { getDict } from "@/lib/i18n";
import { localePath, type Lang } from "@/lib/lang";
import { displayText } from "@/lib/display-text";
import { ClassifierFilters } from "@/components/ClassifierFilters";

/**
 * The browse filters.
 *
 * The filter set is not arbitrary. Beyond the ordinary bibliographic facets it
 * exposes ROUTE PROVENANCE, including `no_aff`: the works an affiliation-only
 * frame would never have seen. It also exposes the screen's consensus count, because those
 * two are what this frame can answer and a keyword search cannot.
 *
 * State lives in the URL, so every view is a shareable, citable link. That is a
 * requirement, not a nicety: a claim about the frame has to be checkable by
 * someone who was not there when it was made. The filter VALUES (?route=aff,
 * ?lang=fr) are the API's vocabulary and identical in both languages; only the
 * labels around them switch.
 */

export interface Facets {
  langs: string[];
  types: string[];
  fields: string[];
}

export function Filters({ facets, lang }: { facets: Facets; lang: Lang }) {
  const router = useRouter();
  const sp = useSearchParams();
  const t = getDict(lang);

  const ROUTES = [
    { v: "", label: t.filters.anyRoute },
    { v: "aff", label: t.filters.routeAff },
    { v: "fund", label: t.filters.routeFund },
    { v: "venue", label: t.filters.routeVenue },
    { v: "about", label: t.filters.routeAbout },
    { v: "no_aff", label: t.filters.routeNoAff },
  ] as const;

  const SORTS = [
    { v: "cited", label: t.filters.sortCited },
    { v: "year_desc", label: t.filters.sortNewest },
    { v: "year_asc", label: t.filters.sortOldest },
  ] as const;

  const CONSENSUS = [
    { v: "", label: t.filters.consensusAny },
    { v: "3", label: t.filters.consensus3 },
    { v: "2", label: t.filters.consensus2 },
    { v: "1", label: t.filters.consensus1 },
    { v: "0", label: t.filters.consensus0 },
  ] as const;

  // The text box is controlled locally so typing does not fire a query per
  // keystroke against a four-million-row table; it commits on submit.
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  const worksPath = localePath(lang, "/works");

  const push = useCallback(
    (over: Record<string, string | undefined>) => {
      const p = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(over)) {
        if (v === undefined || v === "") p.delete(k);
        else p.set(k, v);
      }
      // Any filter change invalidates the current page offset.
      p.delete("page");
      router.push(`${worksPath}?${p.toString()}`);
    },
    [router, sp, worksPath],
  );

  const val = (k: string) => sp.get(k) ?? "";
  const active = Array.from(sp.keys()).filter(
    (k) => k !== "page" && sp.get(k),
  ).length;
  const directFilters = [
    {
      key: "institution",
      label: t.workDetail.institutions,
      value: val("institution"),
      display: val("institution"),
    },
    {
      key: "funder",
      label: t.workDetail.funders,
      value: val("funder"),
      display: val("funder"),
    },
    {
      key: "keyword",
      label: t.workDetail.keywords,
      value: val("keyword"),
      display: val("keyword"),
    },
    {
      key: "venue",
      label: t.workDetail.venue,
      value: val("venue"),
      display: val("venue"),
    },
    {
      key: "topic",
      label: t.workDetail.topic,
      value: val("topic"),
      display: val("topic"),
    },
    {
      key: "abstract",
      label: t.workDetail.hasAbstract,
      value: val("abstract"),
      display:
        val("abstract") === "has"
          ? t.common.yes
          : val("abstract") === "none"
            ? t.common.no
            : val("abstract"),
    },
  ].filter((filter) => filter.value.length > 0);

  return (
    <div className="card p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim() || undefined });
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.filters.searchPlaceholder}
          aria-label={t.filters.searchAria}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{ background: "var(--surface-2)", color: "var(--ink)" }}
        />
        <button
          type="submit"
          className="w-full rounded-md px-4 py-2 text-sm font-medium sm:w-auto"
          style={{ background: "var(--mc)", color: "var(--on-mc)" }}
        >
          {t.filters.searchButton}
        </button>
      </form>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label={t.filters.route}
          value={val("route")}
          onChange={(v) => push({ route: v })}
        >
          {ROUTES.map((r) => (
            <option key={r.v} value={r.v}>
              {r.label}
            </option>
          ))}
        </Select>

        <Select
          label={t.filters.field}
          value={val("field")}
          onChange={(v) => push({ field: v })}
        >
          <option value="">{t.filters.anyField}</option>
          {facets.fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>

        <Select
          label={t.filters.type}
          value={val("type")}
          onChange={(v) => push({ type: v })}
        >
          <option value="">{t.filters.anyType}</option>
          {facets.types.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>

        <Select
          label={t.filters.language}
          value={val("lang")}
          onChange={(v) => push({ lang: v })}
        >
          <option value="">{t.filters.anyLanguage}</option>
          {facets.langs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>

        <div>
          <Label>{t.filters.yearRange}</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={t.filters.from}
              defaultValue={val("year_from")}
              onBlur={(e) => push({ year_from: e.target.value || undefined })}
              aria-label={t.filters.yearFrom}
              className="tabular w-full rounded-md border px-2 py-1.5 text-sm"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            />
            <span style={{ color: "var(--ink-5)" }}>{t.filters.to}</span>
            <input
              type="number"
              placeholder={t.filters.to}
              defaultValue={val("year_to")}
              onBlur={(e) => push({ year_to: e.target.value || undefined })}
              aria-label={t.filters.yearTo}
              className="tabular w-full rounded-md border px-2 py-1.5 text-sm"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            />
          </div>
        </div>

        <Select
          label={t.filters.consensus}
          value={val("n_in")}
          onChange={(v) => push({ n_in: v })}
        >
          {CONSENSUS.map((c) => (
            <option key={c.v} value={c.v}>
              {c.label}
            </option>
          ))}
        </Select>

        <Select
          label={t.filters.sort}
          value={val("sort") || "cited"}
          onChange={(v) => push({ sort: v })}
        >
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </Select>

        <div>
          <Label>{t.filters.flags}</Label>
          <div className="flex items-center gap-4 pt-1.5">
            <Check
              checked={val("retracted") === "1"}
              onChange={(c) => push({ retracted: c ? "1" : undefined })}
              label={t.filters.retracted}
            />
            <Check
              checked={val("no_abstract") === "1"}
              onChange={(c) => push({ no_abstract: c ? "1" : undefined })}
              label={t.filters.noAbstract}
            />
          </div>
        </div>
      </div>

      <ClassifierFilters
        lang={lang}
        value={val}
        push={push}
        categoryNames={t.cohort.categoryNames}
        designNames={t.cohort.designNames}
      />

      {directFilters.length > 0 && (
        <div
          className="mt-3 flex flex-wrap gap-2 border-t pt-3"
          role="group"
          aria-label={t.filters.appliedValues}
        >
          {directFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="chip record-filter-chip"
              onClick={() => push({ [filter.key]: undefined })}
              aria-label={t.filters.removeFilter(filter.label, displayText(filter.display))}
            >
              <span style={{ color: "var(--ink-4)" }}>{filter.label}:</span>
              <span>{displayText(filter.display)}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {active > 0 && (
        <div
          className="mt-3 flex items-center gap-3 border-t pt-3 text-xs"
          style={{ color: "var(--ink-4)" }}
        >
          <span>{t.filters.active(active)}</span>
          <button
            onClick={() => router.push(worksPath)}
            className="link"
            style={{ color: "var(--mc)" }}
          >
            {t.filters.clearAll}
          </button>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-1 text-xs uppercase tracking-wider"
      style={{ color: "var(--ink-4)" }}
    >
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full rounded-md border px-2 py-1.5 text-sm"
        style={{ background: "var(--surface-2)", color: "var(--ink)" }}
      >
        {children}
      </select>
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--mc)" }}
      />
      {label}
    </label>
  );
}

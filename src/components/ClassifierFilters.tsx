"use client";

import { LABEL_CATEGORIES, STUDY_DESIGNS } from "@/lib/labels";
import { classifierCopy } from "@/lib/classifier-copy";
import type { Lang } from "@/lib/lang";

type Push = (values: Record<string, string | undefined>) => void;

export function ClassifierFilters({
  lang,
  value,
  push,
  categoryNames,
  designNames,
}: {
  lang: Lang;
  value: (key: string) => string;
  push: Push;
  categoryNames: Record<string, string>;
  designNames: Record<string, string>;
}) {
  const copy = classifierCopy(lang);
  const classifier = value("label_source") === "classifier";

  return (
    <div className="mt-4 border-t pt-3">
      <FilterLabel>{copy.title}</FilterLabel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label={copy.source}
          value={classifier ? "classifier" : "direct"}
          onChange={(source) =>
            source === "classifier"
              ? push({
                  label_source: "classifier",
                  label_mode: "candidate",
                  agreement: undefined,
                  labeled: undefined,
                  ...(value("design") === "design_other"
                    ? { design: undefined }
                    : {}),
                })
              : push({
                  label_source: undefined,
                  label_mode: undefined,
                  classified: undefined,
                  classifier_version: undefined,
                })
          }
        >
          <option value="direct">{copy.direct}</option>
          <option value="classifier">{copy.classifier}</option>
        </FilterSelect>

        <FilterSelect
          label={copy.category}
          value={value("category")}
          onChange={(category) => push({ category })}
        >
          <option value="">{copy.anyCategory}</option>
          {LABEL_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryNames[category] ?? category}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label={copy.design}
          value={value("design")}
          onChange={(design) => push({ design })}
        >
          <option value="">{copy.anyDesign}</option>
          {STUDY_DESIGNS.filter(
            (design) => !classifier || design !== "design_other",
          ).map((design) => (
            <option key={design} value={design}>
              {designNames[design] ?? design}
            </option>
          ))}
        </FilterSelect>

        {classifier ? (
          <FilterSelect
            label={copy.mode}
            value={value("label_mode") || "candidate"}
            onChange={(label_mode) => push({ label_mode })}
          >
            <option value="candidate">{copy.candidate}</option>
            <option value="consensus">{copy.consensus}</option>
          </FilterSelect>
        ) : (
          <FilterSelect
            label={copy.agreement}
            value={value("agreement")}
            onChange={(agreement) => push({ agreement })}
          >
            <option value="">{copy.anyAgreement}</option>
            <option value="all">{copy.allAgreement}</option>
          </FilterSelect>
        )}

        {classifier ? (
          <FilterSelect
            label={copy.classifierCoverage}
            value={value("classified")}
            onChange={(classified) => push({ classified })}
          >
            <option value="">{copy.anyClassifierCoverage}</option>
            <option value="1">{copy.classifiedOnly}</option>
            <option value="0">{copy.classifiedNone}</option>
          </FilterSelect>
        ) : (
          <FilterSelect
            label={copy.directCoverage}
            value={value("labeled")}
            onChange={(labeled) => push({ labeled })}
          >
            <option value="">{copy.anyDirectCoverage}</option>
            <option value="1">{copy.directOnly}</option>
            <option value="0">{copy.directNone}</option>
          </FilterSelect>
        )}

        {classifier && (
          <label>
            <FilterLabel>{copy.version}</FilterLabel>
            <input
              key={value("classifier_version")}
              defaultValue={value("classifier_version")}
              onBlur={(event) =>
                push({ classifier_version: event.target.value || undefined })
              }
              placeholder={copy.activeVersion}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            />
          </label>
        )}
      </div>
      <p
        className="mt-2 text-xs leading-snug"
        style={{ color: "var(--ink-5)" }}
      >
        {classifier ? copy.classifierHint : copy.directHint}
      </p>
    </div>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-1 text-xs uppercase tracking-wider"
      style={{ color: "var(--ink-4)" }}
    >
      {children}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <FilterLabel>{label}</FilterLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="w-full rounded-md border px-2 py-1.5 text-sm"
        style={{ background: "var(--surface-2)", color: "var(--ink)" }}
      >
        {children}
      </select>
    </label>
  );
}

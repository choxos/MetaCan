"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  structureAbstract,
  type AbstractSection,
} from "@/lib/structured-abstract";

function abstractPreview(
  sections: AbstractSection[],
  limit: number,
): AbstractSection[] {
  const preview: AbstractSection[] = [];
  let remaining = limit;
  for (const section of sections) {
    if (remaining <= 0) break;
    if (section.body.length <= remaining) {
      preview.push(section);
      remaining -= section.body.length;
      continue;
    }
    preview.push({
      label: section.label,
      body: `${section.body.slice(0, remaining).trimEnd()}…`,
    });
    break;
  }
  return preview;
}

export function ReadableAbstract({
  text,
  expandLabel,
  collapseLabel,
}: {
  text: string;
  expandLabel: string;
  collapseLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const abstractId = useId();
  const sections = structureAbstract(text);
  const isLong = sections.reduce((length, section) => length + section.body.length, 0) > 900;
  const visibleSections = isLong && !expanded ? abstractPreview(sections, 500) : sections;

  return (
    <div className="mt-3">
      <div
        id={abstractId}
        className="abstract-viewport"
        data-expanded={isLong ? String(expanded) : "full"}
      >
        {visibleSections.map((section, index) => (
          <div className="abstract-section" key={`${section.label ?? "paragraph"}-${index}`}>
            {section.label && <h3 className="abstract-section-label">{section.label}</h3>}
            <p className="abstract-body">{section.body}</p>
          </div>
        ))}
      </div>
      {isLong && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={abstractId}
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-[var(--surface-2)]"
          style={{ color: "var(--mc)" }}
        >
          {expanded ? collapseLabel : expandLabel}
          <ChevronDown
            aria-hidden="true"
            size={17}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

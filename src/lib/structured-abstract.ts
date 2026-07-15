import { displayText } from "@/lib/display-text";

const SECTION_LABELS = [
  "Strengths and limitations of this study",
  "Patient and public involvement",
  "Main outcomes and measures",
  "Main outcome measures",
  "Outcome measures",
  "Measurements and main results",
  "Materials and methods",
  "Material and methods",
  "Patients and methods",
  "Subjects and methods",
  "Methods and analysis",
  "Ethics and dissemination",
  "Methods and findings",
  "Methods and results",
  "Systematic review registration",
  "Trial registration number",
  "Trial registration",
  "Clinical trial registration",
  "Study registration",
  "Protocol registration",
  "Registration",
  "Study selection",
  "Study design",
  "Study setting",
  "Data sources",
  "Data source",
  "Data collection",
  "Data extraction",
  "Data synthesis",
  "Data analysis",
  "Statistical analysis",
  "Sources of evidence",
  "Eligibility criteria",
  "Inclusion criteria",
  "Exclusion criteria",
  "Search strategy",
  "Selection criteria",
  "Primary outcomes",
  "Primary outcome",
  "Secondary outcomes",
  "Secondary outcome",
  "Primary endpoint",
  "Clinical implications",
  "Clinical relevance",
  "Plain language summary",
  "Key messages",
  "Take-home message",
  "Main results",
  "Key results",
  "Principal findings",
  "Background and aims",
  "Background and objectives",
  "Background and purpose",
  "Aims and objectives",
  "Background",
  "Introduction",
  "Context",
  "Rationale",
  "Overview",
  "Importance",
  "Scope",
  "Objective",
  "Objectives",
  "Aim",
  "Aims",
  "Purpose",
  "Goal",
  "Goals",
  "Hypothesis",
  "Question",
  "Method",
  "Methods",
  "Methodology",
  "Approach",
  "Design",
  "Setting",
  "Settings",
  "Procedures",
  "Participants",
  "Patients",
  "Subjects",
  "Population",
  "Sample",
  "Cohort",
  "Intervention",
  "Interventions",
  "Exposure",
  "Exposures",
  "Treatment",
  "Treatments",
  "Comparators",
  "Outcomes",
  "Outcome",
  "Results",
  "Result",
  "Findings",
  "Observations",
  "Conclusion",
  "Conclusions",
  "Interpretation",
  "Discussion",
  "Summary",
  "Significance",
  "Implications",
  "Limitations",
  "Funding",
  "Keywords",
  "Relevance",
  "Recommendations",
  "Contexte",
  "Introduction",
  "Objectif",
  "Objectifs",
  "But",
  "Buts",
  "Méthode",
  "Méthodes",
  "Méthodologie",
  "Approche",
  "Devis",
  "Cadre",
  "Participants",
  "Patientes et patients",
  "Population",
  "Échantillon",
  "Intervention",
  "Interventions",
  "Résultat principal",
  "Résultats principaux",
  "Résultats",
  "Conclusion",
  "Conclusions",
  "Interprétation",
  "Discussion",
  "Importance",
  "Limites",
  "Financement",
  "Mots-clés",
  "Recommandations",
];

export interface AbstractSection {
  label: string | null;
  body: string;
}

interface SectionHit {
  labelStart: number;
  bodyStart: number;
  label: string;
}

function isAllCaps(value: string): boolean {
  return /\p{Lu}/u.test(value) && value === value.toLocaleUpperCase();
}

function sectionHits(text: string): SectionHit[] {
  const escaped = SECTION_LABELS.slice()
    .sort((a, b) => b.length - a.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const generic =
    "[\\p{L}][\\p{L}\\p{N}]{2,}(?:[ &/-]+(?:and|of|the|et|de|des|du|la|le|les|&|[\\p{L}\\p{N}]+)){0,6}";
  const pattern = new RegExp(
    `(^|[.!?]\\s+|\\n+)(${escaped.join("|")}|${generic})\\s*[:.]\\s+`,
    "giu",
  );
  const known = new Set(SECTION_LABELS.map((label) => label.toLocaleLowerCase()));
  const hits: SectionHit[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const label = match[2]?.trim();
    if (!label) continue;
    if (!known.has(label.toLocaleLowerCase()) && !isAllCaps(label)) {
      pattern.lastIndex = match.index + Math.max(match[1]?.length ?? 0, 1);
      continue;
    }
    hits.push({
      labelStart: match.index + (match[1]?.length ?? 0),
      bodyStart: pattern.lastIndex,
      label,
    });
  }
  const unknownCount = hits.filter(
    (hit) => !known.has(hit.label.toLocaleLowerCase()),
  ).length;
  return hits.filter(
    (hit) =>
      known.has(hit.label.toLocaleLowerCase()) || unknownCount >= 2,
  );
}

export function normaliseAbstractText(value: string): string {
  const headings = value.replace(
    /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    "\n\n$1: ",
  );
  const paragraphs = headings
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  return displayText(paragraphs)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n{2,} */g, "\n\n")
    .trim();
}

export function structureAbstract(value: string): AbstractSection[] {
  const clean = normaliseAbstractText(value);
  if (!clean) return [];
  const hits = sectionHits(clean);
  const firstHit = hits[0];
  if (firstHit) {
    const sections: AbstractSection[] = [];
    const preamble = clean.slice(0, firstHit.labelStart).trim();
    if (preamble) sections.push({ label: null, body: preamble });
    hits.forEach((hit, index) => {
      const end = hits[index + 1]?.labelStart ?? clean.length;
      const body = clean.slice(hit.bodyStart, end).replace(/\s+/g, " ").trim();
      if (body) sections.push({ label: hit.label, body });
    });
    return sections;
  }

  return clean
    .split(/\n{2,}/)
    .map((body) => body.trim())
    .filter(Boolean)
    .map((body) => ({ label: null, body }));
}

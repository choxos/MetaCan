/**
 * The label vocabulary and agreement logic, in a module with NO server-only
 * imports: the client-side facet panel needs these lists, and importing them
 * from query.ts would drag PrismaClient into the browser bundle.
 *
 * These values are the API's vocabulary, verbatim from the labelling rounds
 * (deploy/load_labels.py validates every file against the same lists).
 */

/** The category vocabulary the labelling rounds use. Facet values, verbatim. */
export const LABEL_CATEGORIES = [
  'metaresearch',
  'metaepi_narrow',
  'metaepi_broad',
  'bibliometrics',
  'sts',
  'scholarly_communication',
  'open_science',
  'research_integrity',
] as const

/** The study-design vocabulary. None of these is MEDLINE-validated yet. */
export const STUDY_DESIGNS = [
  'randomized_trial',
  'nonrandomized_trial',
  'observational',
  'systematic_review',
  'meta_analysis',
  'case_report',
  'qualitative',
  'simulation_or_modeling',
  'bench_or_experimental',
  'theoretical_or_conceptual',
  'not_applicable',
  'design_other',
] as const

/**
 * Label agreement on one work: did the models that labelled it say the same
 * thing? `agree` means identical category sets AND identical study designs;
 * `split` means they differ somewhere. One model alone cannot agree with
 * anyone, so a single row reports `single`.
 */
export function labelAgreement(
  labels: Array<{ categories: string[]; studyDesign: string | null }>,
): 'agree' | 'split' | 'single' | null {
  const [head] = labels
  if (head === undefined) return null
  if (labels.length === 1) return 'single'
  const key = (l: { categories: string[]; studyDesign: string | null }) =>
    `${[...l.categories].sort().join(',')}|${l.studyDesign ?? ''}`
  const first = key(head)
  return labels.every((l) => key(l) === first) ? 'agree' : 'split'
}

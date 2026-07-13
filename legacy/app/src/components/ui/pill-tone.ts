/**
 * Pill tones map to the screening tiers of protocol/rubric.md, plus the one
 * tone that is not a tier: `gap`, the amber that marks what the pipeline missed.
 *
 * The tracker's tones named kinds of retraction notice. These name kinds of
 * evidence, and one kind of absence.
 */
export type PillTone =
  | 'default'
  | 't1' // core metaresearch
  | 't2' // adjacent: STS, LIS, research infrastructure, research policy
  | 't3' // contextual: editorials, commentary, policy documents, announcements
  | 'gap' // not retrieved: the thing the audit exists to measure

/** The tier labels as the rubric writes them. */
export type Tier = 'T1' | 'T2' | 'T3' | 'OUT'

/**
 * Map a screening tier to a Pill tone. `OUT` has no tone of its own: a work
 * ruled out of scope is not a gap in the pipeline, it is the pipeline working,
 * so it falls back to the neutral chip.
 */
export function tierTone(tier?: string | null): PillTone {
  if (!tier) return 'default'
  switch (tier.trim().toUpperCase()) {
    case 'T1':
      return 't1'
    case 'T2':
      return 't2'
    case 'T3':
      return 't3'
    default:
      return 'default'
  }
}

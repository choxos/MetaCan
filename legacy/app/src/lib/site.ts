/**
 * Site-level constants. URLs live here rather than in the dictionary, because a
 * URL is not a translatable string and duplicating it across two language trees
 * is how one of them goes stale.
 */

export const siteConfig = {
  name: 'MétaCan',
  tagline: 'A map of Canadian metaresearch',
  description:
    'An open, provenance-tracked, coverage-audited map of Canadian metaresearch. Every record shows why it was found and why it counts as Canadian, and a bilingual human audit quantifies what the pipeline missed.',
  url: 'https://openscience.xera.ac/metacan',
  domain: 'openscience.xera.ac',
  locale: 'en_CA',
  themeColor: '#0E7490',
  author: 'Ahmad Sofi-Mahmudi',
  email: 'ahmad.pub@gmail.com',
} as const

const REPO = 'https://github.com/choxos/CaRN-data-challenge'

export const links = {
  repo: REPO,
  protocol: `${REPO}/blob/main/protocol/PROTOCOL.md`,
  rubric: `${REPO}/blob/main/protocol/rubric.md`,
  proposal: `${REPO}/blob/main/proposal/metacan-proposal.md`,
  findings: `${REPO}/blob/main/pilot/results/FINDINGS.md`,
  findingsJson: `${REPO}/blob/main/pilot/results/findings.json`,
  pilot: `${REPO}/tree/main/pilot`,
  /**
   * The deviations log, which PROTOCOL.md §9 requires and which the /methods
   * corrections section is the public face of. Every error found in this project,
   * with the date it was found and what was done about it.
   */
  deviations: `${REPO}/blob/main/DEVIATIONS.md`,
  challenge: 'https://opensciencecanada.ca',
  openalex: 'https://openalex.org',
  erudit: 'https://www.erudit.org',
} as const

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'v0.1.0'

import raw from '@/data/findings.json'

export const metadata = { title: 'Findings' }

/**
 * The 22 findings, rendered FROM `findings.json` — the file the pilot scripts
 * write. Not one number on this page is typed by hand.
 *
 * That is the point, and it is load-bearing. A site that restates its own results
 * in prose will, sooner or later, restate them wrongly: someone tunes a threshold,
 * a rate moves from 1.31% to 1.4%, and the paragraph on the website still says
 * 1.31% because nobody thought to grep for it. Rendering the artefact makes that
 * class of drift impossible rather than merely unlikely.
 */

interface Finding {
  headline: string
  values: Record<string, unknown>
  computed_at_utc: string
}

const findings = raw as unknown as Record<string, Finding>

const TITLES: Record<string, string> = {
  affiliation_gap: 'The affiliation gap',
  topics: 'The topic route',
  erudit: 'Érudit is invisible to OpenAlex',
  language_gap: 'The language gap',
  polysemy: 'Polysemy defeats the lexicon',
  capture_recapture_fails: 'Capture-recapture is void here',
  canadian_linkage: 'Canadian linkage',
  openalex_is_metered: 'OpenAlex is metered',
  base_rate: 'The base rate',
  agreement: 'Swap the screener, move the answer',
  base_rate_robustness: 'Base-rate robustness',
  topic_route_recall: 'Topic-route recall',
  screening_cost: 'What screening costs',
  audit_power: 'The power of a human audit',
  label_limits: 'What the labels cannot tell us',
  agent_variance: 'Agent variance',
  retraction_record: 'A boolean over a four-state space',
  funder_route_recall: 'Funder-route recall',
  abstract_cascade: 'The abstract gap is structural',
  preprint_coverage: 'Preprint coverage',
  trial_linkage: 'Trial linkage',
  three_model_screen: 'The three-model screen',
}

/** The order tells the story: the frame's problem, then the screen, then the limits. */
const ORDER = [
  'affiliation_gap',
  'topics',
  'polysemy',
  'language_gap',
  'erudit',
  'capture_recapture_fails',
  'three_model_screen',
  'agreement',
  'base_rate',
  'base_rate_robustness',
  'label_limits',
  'agent_variance',
  'abstract_cascade',
  'retraction_record',
  'topic_route_recall',
  'funder_route_recall',
  'canadian_linkage',
  'trial_linkage',
  'preprint_coverage',
  'audit_power',
  'screening_cost',
  'openalex_is_metered',
]

function fmt(v: unknown): string {
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-CA') : String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v === null || v === undefined) return '—'
  return String(v)
}

function Value({ v }: { v: unknown }) {
  if (Array.isArray(v)) {
    return (
      <ul className="space-y-0.5">
        {v.map((x, i) => (
          <li key={i} className="text-xs">
            {typeof x === 'object' && x !== null ? (
              <span className="font-mono">{JSON.stringify(x)}</span>
            ) : (
              fmt(x)
            )}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof v === 'object' && v !== null) {
    return (
      <dl className="space-y-0.5">
        {Object.entries(v as Record<string, unknown>).map(([k, x]) => (
          <div key={k} className="flex gap-2 text-xs">
            <dt style={{ color: 'var(--ink-5)' }}>{k}:</dt>
            <dd className="tabular font-medium">{fmt(x)}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return <span className="tabular font-medium">{fmt(v)}</span>
}

export default function Findings() {
  const keys = [...ORDER.filter((k) => k in findings), ...Object.keys(findings).filter((k) => !ORDER.includes(k))]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Findings</h1>
        <p className="mt-2 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          All {keys.length} findings, rendered directly from{' '}
          <code className="font-mono text-xs">pilot/results/findings.json</code> — the file the pilot scripts write.
          No number on this page was typed by a human, which is the only way to guarantee the site and the analysis
          cannot drift apart.
        </p>
        <p className="mt-3 text-sm">
          <a className="link" href="/api/v1/findings">
            the same file over the API →
          </a>
        </p>
      </div>

      <div className="space-y-6">
        {keys.map((k, i) => {
          const f = findings[k]
          if (!f) return null
          return (
            <article key={k} className="card p-6">
              <div className="flex items-baseline gap-3">
                <span className="tabular text-sm font-semibold" style={{ color: 'var(--mc)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-serif text-xl">{TITLES[k] ?? k}</h2>
              </div>

              <p className="mt-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {f.headline}
              </p>

              {f.values && Object.keys(f.values).length > 0 && (
                <div className="scroll-x mt-4 rounded-md p-4" style={{ background: 'var(--surface-2)' }}>
                  <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {Object.entries(f.values).map(([vk, vv]) => (
                      <div key={vk} className="min-w-0">
                        <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
                          {vk.replace(/_/g, ' ')}
                        </dt>
                        <dd className="mt-0.5 break-words text-sm">
                          <Value v={vv} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div className="mt-3 font-mono text-xs" style={{ color: 'var(--ink-5)' }}>
                {k} · computed {f.computed_at_utc}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

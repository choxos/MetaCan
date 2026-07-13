import type { Metadata } from 'next'
import raw from '@/data/findings.json'
import { getDict } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, type Lang } from '@/lib/lang'
import { frFinding } from '@/lib/findings-fr'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).meta.findings, alternates: langAlternates(lang, '/findings') }
}

/**
 * The 22 findings, rendered FROM `findings.json` — the file the pilot scripts
 * write. Not one number on this page is typed by hand.
 *
 * That is the point, and it is load-bearing. A site that restates its own results
 * in prose will, sooner or later, restate them wrongly: someone tunes a threshold,
 * a rate moves from 1.31% to 1.4%, and the paragraph on the website still says
 * 1.31% because nobody thought to grep for it. Rendering the artefact makes that
 * class of drift impossible rather than merely unlikely.
 *
 * The French page shows a hand-checked translation of each headline WITH the
 * verbatim English artifact underneath, and only while the translation's
 * recorded source still matches the artifact (see findings-fr.ts). A
 * regenerated headline therefore falls back to English rather than serving a
 * stale French text: the same drift guarantee, extended to the translation.
 */

interface Finding {
  headline: string
  values: Record<string, unknown>
  computed_at_utc: string
}

const findings = raw as unknown as Record<string, Finding>

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

function fmtFactory(lang: Lang) {
  return function fmt(v: unknown): string {
    if (typeof v === 'number') return Number.isInteger(v) ? formatInt(lang, v) : String(v)
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    if (v === null || v === undefined) return '—'
    return String(v)
  }
}

function Value({ v, lang }: { v: unknown; lang: Lang }) {
  const fmt = fmtFactory(lang)
  if (Array.isArray(v)) {
    return (
      <ul className="space-y-0.5">
        {v.map((x, i) => (
          <li key={i} className="text-xs">
            {typeof x === 'object' && x !== null ? <span className="font-mono">{JSON.stringify(x)}</span> : fmt(x)}
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

export default function Findings({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)

  const keys = [...ORDER.filter((k) => k in findings), ...Object.keys(findings).filter((k) => !ORDER.includes(k))]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">{t.findings.title}</h1>
        <p className="mt-2 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.findings.lead(keys.length)}
        </p>
        <p className="mt-3 text-sm">
          <a className="link" href="/api/v1/findings">
            {t.findings.apiLink}
          </a>
        </p>
      </div>

      <div className="space-y-6">
        {keys.map((k, i) => {
          const f = findings[k]
          if (!f) return null
          const translated = lang === 'fr' ? frFinding(k, f.headline) : null
          return (
            <article key={k} className="card p-6">
              <div className="flex items-baseline gap-3">
                <span className="tabular text-sm font-semibold" style={{ color: 'var(--mc)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-serif text-xl">{t.findings.titles[k] ?? k}</h2>
              </div>

              <p className="mt-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {translated ?? f.headline}
              </p>

              {/* The artifact itself stays on the page: the French text above is a
                  translation, and the English below is the evidence it translates. */}
              {translated && (
                <p className="mt-3 border-l-2 pl-3 text-xs leading-relaxed" lang="en-CA" style={{ color: 'var(--ink-5)', borderColor: 'var(--border)' }}>
                  <span className="font-medium">{t.findings.originalLabel}</span> {f.headline}
                </p>
              )}

              {f.values && Object.keys(f.values).length > 0 && (
                <div className="scroll-x mt-4 rounded-md p-4" style={{ background: 'var(--surface-2)' }}>
                  <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {Object.entries(f.values).map(([vk, vv]) => (
                      <div key={vk} className="min-w-0">
                        <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
                          {vk.replace(/_/g, ' ')}
                        </dt>
                        <dd className="mt-0.5 break-words text-sm">
                          <Value v={vv} lang={lang} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div className="mt-3 font-mono text-xs" style={{ color: 'var(--ink-5)' }}>
                {t.findings.computed(k, f.computed_at_utc)}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

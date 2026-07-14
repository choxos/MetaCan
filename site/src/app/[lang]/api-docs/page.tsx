import type { Metadata } from 'next'
import { getDict, type Dictionary } from '@/lib/i18n'
import { SITE_URL, isLang, langAlternates, localePath, type Lang } from '@/lib/lang'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).meta.api, alternates: langAlternates(lang, '/api-docs') }
}

const BASE = SITE_URL

/**
 * The public API, documented with curl examples that actually run.
 *
 * Every example here is copy-pasteable against the live host. A documentation page
 * whose examples have never been executed is a liability, not a feature.
 *
 * The endpoints, parameter names and JSON payloads are NOT translated: field
 * names are code, not copy, and a French reader pastes the same curl command an
 * English reader does. Only the human prose around them switches language.
 */

interface Param {
  name: string
  type: string
  desc: string
}

function Endpoint({
  t,
  method = 'GET',
  path,
  desc,
  params,
  example,
  note,
}: {
  t: Dictionary
  method?: string
  path: string
  desc: React.ReactNode
  params?: Param[]
  example: string
  note?: React.ReactNode
}) {
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="chip font-mono"
          style={{ borderColor: 'var(--mc-accent)', color: 'var(--mc-accent)', background: 'transparent' }}
        >
          {method}
        </span>
        <code className="font-mono text-sm font-medium">{path}</code>
      </div>

      <p className="mt-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        {desc}
      </p>

      {note && (
        <div
          className="mt-3 rounded-md border-l-2 p-3 text-sm leading-relaxed"
          style={{ borderColor: 'var(--contested)', background: 'var(--surface-2)', color: 'var(--ink-3)' }}
        >
          {note}
        </div>
      )}

      {params && params.length > 0 && (
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ color: 'var(--ink-4)' }}>
                <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wider">{t.apiDocs.thParam}</th>
                <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wider">{t.apiDocs.thType}</th>
                <th className="py-2 text-xs font-medium uppercase tracking-wider">{t.apiDocs.thMeaning}</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.name} className="border-b last:border-0">
                  <td className="whitespace-nowrap py-2 pr-4">
                    <code className="font-mono text-xs" style={{ color: 'var(--mc)' }}>
                      {p.name}
                    </code>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs" style={{ color: 'var(--ink-5)' }}>
                    {p.type}
                  </td>
                  <td className="py-2" style={{ color: 'var(--ink-3)' }}>
                    {p.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="scroll-x mt-4 rounded-md p-3" style={{ background: 'var(--surface-3)' }}>
        <pre className="font-mono text-xs leading-relaxed">
          <code>{example}</code>
        </pre>
      </div>
    </section>
  )
}

export default function ApiDocs({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">{t.apiDocs.title}</h1>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.apiDocs.lead(p)}
        </p>
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-4)' }}>
          {t.apiDocs.baseUrl} <code className="font-mono">{BASE}/api/v1</code>
        </p>
      </div>

      <Endpoint
        t={t}
        path="/api/v1/cohort"
        desc={t.apiDocs.cohortDesc(p)}
        note={t.apiDocs.cohortNote}
        params={[
          { name: 'topic', type: 'string', desc: t.apiDocs.cohortParams.topic },
          { name: 'venue', type: 'string', desc: t.apiDocs.cohortParams.venue },
          {
            name: 'route_aff, route_fund, route_venue, route_about',
            type: '1 | 0',
            desc: t.apiDocs.cohortParams.routesTri,
          },
          { name: 'retracted', type: '1 | 0', desc: t.apiDocs.cohortParams.retracted },
          { name: 'abstract', type: 'has | none', desc: t.apiDocs.cohortParams.abstract },
          {
            name: 'category',
            type: 'metaresearch | metaepi_narrow | metaepi_broad | bibliometrics | sts | scholarly_communication | open_science | research_integrity',
            desc: t.apiDocs.cohortParams.category,
          },
          {
            name: 'design',
            type: 'randomized_trial | nonrandomized_trial | observational | systematic_review | meta_analysis | case_report | qualitative | simulation_or_modeling | bench_or_experimental | theoretical_or_conceptual | not_applicable | design_other',
            desc: t.apiDocs.cohortParams.design,
          },
          { name: 'agreement', type: 'any | all', desc: t.apiDocs.cohortParams.agreement },
          { name: 'labeled', type: '1 | 0', desc: t.apiDocs.cohortParams.labeled },
        ]}
        example={t.apiDocs.cohortExample(BASE)}
      />

      <Endpoint
        t={t}
        path="/api/v1/cohort/export"
        desc={t.apiDocs.exportDesc}
        note={t.apiDocs.exportNote}
        params={[{ name: 'format', type: 'csv | json', desc: t.apiDocs.exportParams.format }]}
        example={t.apiDocs.exportExample(BASE)}
      />

      <Endpoint
        t={t}
        method="POST"
        path="/api/v1/permalink"
        desc={t.apiDocs.permalinkDesc}
        example={t.apiDocs.permalinkExample(BASE)}
      />

      <Endpoint
        t={t}
        path="/api/v1/facets/{venue,topic}"
        desc={t.apiDocs.facetsDesc}
        example={t.apiDocs.facetsExample(BASE)}
      />

      <Endpoint
        t={t}
        path="/api/v1/stats/labels"
        desc={t.apiDocs.labelsStatsDesc}
        example={`curl -sS ${BASE}/api/v1/stats/labels | jq '{coverage, top: .by_category[:3]}'`}
      />

      <Endpoint
        t={t}
        path="/api/v1/stats/summary"
        desc={t.apiDocs.summaryDesc}
        example={`curl -sS ${BASE}/api/v1/stats/summary | jq`}
      />

      <Endpoint
        t={t}
        path="/api/v1/works"
        desc={t.apiDocs.worksDesc}
        note={t.apiDocs.worksNote}
        params={[
          { name: 'q', type: 'string', desc: t.apiDocs.worksParams.q },
          { name: 'year_from, year_to', type: 'int', desc: t.apiDocs.worksParams.year },
          { name: 'lang', type: 'string', desc: t.apiDocs.worksParams.lang },
          { name: 'type', type: 'string', desc: t.apiDocs.worksParams.type },
          { name: 'field', type: 'string', desc: t.apiDocs.worksParams.field },
          { name: 'route', type: 'aff | fund | venue | about | no_aff', desc: t.apiDocs.worksParams.route },
          { name: 'retracted', type: '1', desc: t.apiDocs.worksParams.retracted },
          { name: 'no_abstract', type: '1', desc: t.apiDocs.worksParams.noAbstract },
          { name: 'n_in', type: '0..3', desc: t.apiDocs.worksParams.nIn },
          { name: 'sort', type: 'cited | year_desc | year_asc', desc: t.apiDocs.worksParams.sort },
          { name: 'page, per_page', type: 'int', desc: t.apiDocs.worksParams.page },
        ]}
        example={t.apiDocs.worksExample(BASE)}
      />

      <Endpoint
        t={t}
        path="/api/v1/works/{id}"
        desc={t.apiDocs.workDesc}
        params={[{ name: 'abstract', type: '1', desc: t.apiDocs.workAbstractParam }]}
        example={t.apiDocs.workExample(BASE)}
      />

      <Endpoint
        t={t}
        path="/api/v1/screened"
        desc={t.apiDocs.screenedDesc}
        note={t.apiDocs.screenedNote}
        params={[
          { name: 'contested_only', type: '1', desc: t.apiDocs.screenedParams.contestedOnly },
          { name: 'n_in', type: '0..3', desc: t.apiDocs.screenedParams.nIn },
          { name: 'stratum', type: 'string', desc: t.apiDocs.screenedParams.stratum },
          { name: 'page, per_page', type: 'int', desc: t.apiDocs.screenedParams.page },
        ]}
        example={t.apiDocs.screenedExample(BASE)}
      />

      <Endpoint
        t={t}
        path="/api/v1/stats/by-route"
        desc={t.apiDocs.byRouteDesc}
        note={t.apiDocs.byRouteNote}
        example={`curl -sS ${BASE}/api/v1/stats/by-route | jq '{no_aff: .meta.no_aff, marginals, combinations: .combinations[:5]}'`}
      />

      <Endpoint
        t={t}
        path="/api/v1/stats/by-year"
        desc={t.apiDocs.byYearDesc}
        example={`curl -sS ${BASE}/api/v1/stats/by-year | jq '.results[-5:]'`}
      />

      <Endpoint
        t={t}
        path="/api/v1/stats/by-field"
        desc={t.apiDocs.byFieldDesc}
        example={`curl -sS ${BASE}/api/v1/stats/by-field | jq '.retraction_states'`}
      />

      <Endpoint
        t={t}
        path="/api/v1/findings"
        desc={t.apiDocs.findingsDesc}
        example={`curl -sS ${BASE}/api/v1/findings | jq '.findings.three_model_screen.headline'`}
      />

      <section className="card p-6">
        <h2 className="font-serif text-xl">{t.apiDocs.notesTitle}</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          <li>{t.apiDocs.noteCors}</li>
          <li>{t.apiDocs.noteCache}</li>
          <li>{t.apiDocs.noteLimit}</li>
          <li>{t.apiDocs.noteLicense}</li>
        </ul>
      </section>
    </div>
  )
}

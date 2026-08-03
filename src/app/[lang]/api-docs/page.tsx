import type { Metadata } from 'next'
import { getDict, type Dictionary } from '@/lib/i18n'
import { getApiSample } from '@/lib/stats'
import { SITE_URL, isLang, langAlternates, localePath, type Lang } from '@/lib/lang'

export const dynamic = 'force-dynamic'

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

export default async function ApiDocs({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)

  // The dark sample panel shows a REAL response: the funder-without-affiliation
  // French stratum, counted live (cached hourly) and hashed with the same
  // function the API uses. No number in the panel is typed.
  const sample = await getApiSample()

  return (
    <div className="space-y-8">
      <div className="grid items-start gap-10 pt-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="eyebrow">API</div>
          <h1
            className="font-serif mt-2.5"
            style={{ fontSize: 'clamp(28px, 3.4vw, 36px)', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
          >
            {t.apiDocs.aTitle}
          </h1>
          <p className="mt-3 max-w-[560px] text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            {t.apiDocs.aBody}
          </p>
          <p className="mt-3 max-w-[560px] text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            {t.apiDocs.lead(p)}
          </p>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-4)' }}>
            {t.apiDocs.baseUrl} <code className="font-mono">{BASE}/api/v1</code>
          </p>

          <div className="card mt-6 overflow-hidden">
            <div
              className="micro-label grid grid-cols-[56px_180px_1fr] gap-3 border-b px-5 py-2.5"
              style={{ background: 'var(--surface-2)' }}
            >
              <span>{t.apiDocs.colMethod}</span>
              <span>{t.apiDocs.colEndpoint}</span>
              <span>{t.apiDocs.colDesc}</span>
            </div>
            {t.apiDocs.overview.map((ap) => (
              <div
                key={ap.path}
                className="grid grid-cols-[56px_180px_1fr] items-baseline gap-3 border-b px-5 py-3 text-[13px] last:border-0"
              >
                <span
                  className="chip chip-teal justify-self-start"
                  style={{ fontSize: 10 }}
                >
                  {ap.path === '/api/v1/permalink' ? 'POST' : 'GET'}
                </span>
                <span className="break-all font-mono text-xs" style={{ color: 'var(--ink)' }}>
                  {ap.path}
                </span>
                <span style={{ color: 'var(--ink-3)' }}>{ap.d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-[76px]">
          {/* Always dark, both themes, per the design. */}
          <div className="overflow-hidden rounded-lg border" style={{ background: '#0B0E14', borderColor: '#232A3B' }}>
            <div
              className="flex items-center gap-2.5 border-b px-4 py-3"
              style={{ borderColor: '#232A3B' }}
            >
              <span className="min-w-0 break-all font-mono text-[11px]" style={{ color: '#9DA3B4' }}>
                GET /api/v1/cohort?route_fund=1&route_aff=0&lang=fr
              </span>
              <span
                className="ml-auto shrink-0 rounded border px-1.5 font-mono text-[10px]"
                style={{ color: '#58D6A5', borderColor: 'rgba(88,214,165,.4)' }}
              >
                {t.apiDocs.sampleStatus}
              </span>
            </div>
            <pre
              className="scroll-x m-0 px-4 py-4 font-mono text-[11.5px] leading-[1.7]"
              style={{ color: '#D9DCE5' }}
            >{`{
  "meta": {
    "total": ${sample.total},
    "direct_labels_cover": ${sample.directLabeled},
    "predictions_cover": ${sample.predicted},
    "query_hash": "${sample.hash}",
    "filters": { "route_fund": true,
                 "route_aff": false,
                 "lang": "fr" }
  },
  "results": [ … ]
}`}</pre>
          </div>

          <section className="card overflow-hidden">
            <div className="card-head">
              <h3>{t.apiDocs.notesTitle}</h3>
            </div>
            <ul className="space-y-2 px-5 py-4 text-[13px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              <li>{t.apiDocs.noteCors}</li>
              <li>{t.apiDocs.noteCache}</li>
              <li>{t.apiDocs.noteLimit}</li>
              <li>{t.apiDocs.noteLicense}</li>
            </ul>
          </section>
        </div>
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
          { name: 'label_source', type: 'direct | predicted', desc: t.apiDocs.cohortParams.labelSource },
          {
            name: 'prediction_mode',
            type: 'candidate | consensus',
            desc: t.apiDocs.cohortParams.predictionMode,
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
        path="/api/v1/facets/author"
        desc={t.apiDocs.facetAuthorDesc}
        example={`curl -sS "${BASE}/api/v1/facets/author?q=tricco" | jq '.results[:3]'`}
      />

      <Endpoint
        t={t}
        path="/api/v1/network"
        desc={t.apiDocs.networkDesc}
        params={[{ name: 'author_id', type: 'string', desc: t.apiDocs.networkParams.authorId }]}
        example={`curl -sS "${BASE}/api/v1/network?author_id=A5044517411" | jq '.meta, .graph.nodes[:3]'`}
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
          { name: 'author', type: 'string', desc: t.apiDocs.worksParams.author },
          { name: 'author_id', type: 'string', desc: t.apiDocs.worksParams.authorId },
          { name: 'year_from, year_to', type: 'int', desc: t.apiDocs.worksParams.year },
          { name: 'cited_min', type: 'int', desc: t.apiDocs.worksParams.citedMin },
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

      <Endpoint
        t={t}
        path="/api/v1/predictions"
        desc={t.apiDocs.predictionsDesc}
        example={`curl -sS ${BASE}/api/v1/predictions | jq '{status: .predictions.prediction_status, n: .predictions.n_predictions, evidence: .meta.evidence_level, limitations: .predictions.limitations}'`}
      />

    </div>
  )
}

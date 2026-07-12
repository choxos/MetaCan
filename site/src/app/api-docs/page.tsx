import Link from 'next/link'

export const metadata = { title: 'API' }

const BASE = 'https://metacan.xera.ac'

/**
 * The public API, documented with curl examples that actually run.
 *
 * Every example here is copy-pasteable against the live host. A documentation page
 * whose examples have never been executed is a liability, not a feature.
 */

interface Param {
  name: string
  type: string
  desc: string
}

function Endpoint({
  method = 'GET',
  path,
  desc,
  params,
  example,
  note,
}: {
  method?: string
  path: string
  desc: string
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
                <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wider">Parameter</th>
                <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wider">Type</th>
                <th className="py-2 text-xs font-medium uppercase tracking-wider">Meaning</th>
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

export default function ApiDocs() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">The public API</h1>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Read-only, JSON, CORS-enabled, no key. Every endpoint is backed by the same functions the pages call —{' '}
          <code className="font-mono text-xs">searchWorks()</code> serves both{' '}
          <Link href="/works" className="link">
            /works
          </Link>{' '}
          and <code className="font-mono text-xs">/api/v1/works</code> — so the API cannot answer a different question
          from the page above it.
        </p>
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-4)' }}>
          Base URL: <code className="font-mono">{BASE}/api/v1</code>
        </p>
      </div>

      <Endpoint
        path="/api/v1/stats/summary"
        desc="The frame in one object: total works, the no-affiliation and no-abstract counts, the four route marginals, and the screen's consensus histogram."
        example={`curl -sS ${BASE}/api/v1/stats/summary | jq`}
      />

      <Endpoint
        path="/api/v1/works"
        desc="Browse and search the whole frame. Full-text over titles, every filter the browse page offers, paginated."
        note={
          <>
            <strong>The count is capped at 10,000.</strong> Counting 4.3M rows exactly costs seconds and nobody reads
            the number, so <code className="font-mono text-xs">total_is_capped: true</code> means &ldquo;at least
            10,000&rdquo;, not &ldquo;exactly 10,000&rdquo;. Page through if you need more.
          </>
        }
        params={[
          { name: 'q', type: 'string', desc: 'Full-text search over titles (Postgres tsvector; terms are ANDed).' },
          { name: 'year_from, year_to', type: 'int', desc: 'Inclusive publication-year bounds.' },
          { name: 'lang', type: 'string', desc: 'Language code, e.g. en, fr.' },
          { name: 'type', type: 'string', desc: 'Work type, e.g. article, preprint, dissertation.' },
          { name: 'field', type: 'string', desc: "OpenAlex primary field, e.g. 'Medicine'." },
          {
            name: 'route',
            type: 'aff | fund | venue | about | no_aff',
            desc: 'Route provenance: why the work is in the frame. no_aff returns the works with NO Canadian affiliation — the ones an affiliation-only frame never sees.',
          },
          { name: 'retracted', type: '1', desc: 'Only works OpenAlex flags as retracted.' },
          { name: 'no_abstract', type: '1', desc: 'Only works with no abstract. The screen finds half as much metaresearch here.' },
          { name: 'n_in', type: '0..3', desc: 'Screening consensus: how many of the three models called it metaresearch.' },
          { name: 'sort', type: 'cited | year_desc | year_asc', desc: 'Default: cited.' },
          { name: 'page, per_page', type: 'int', desc: 'per_page max 100, default 25.' },
        ]}
        example={`# The works an affiliation-only frame would never have seen,
# most-cited first:
curl -sS "${BASE}/api/v1/works?route=no_aff&sort=cited&per_page=5" | jq '.results[] | {id, title, cited_by, routes}'

# French-language works with no abstract, published since 2015:
curl -sS "${BASE}/api/v1/works?lang=fr&no_abstract=1&year_from=2015&per_page=5" | jq

# Full-text search:
curl -sS "${BASE}/api/v1/works?q=reproducibility+crisis&per_page=3" | jq '.results[].title'`}
      />

      <Endpoint
        path="/api/v1/works/{id}"
        desc="One work, every field, the routes that admitted it, its Retraction Watch state if any, and all three models' labels and reasons if it was screened."
        params={[
          {
            name: 'abstract',
            type: '1',
            desc: 'Fetch the abstract live from OpenAlex and de-invert it. Off by default: abstracts are not in this database, so asking for one costs an upstream round-trip.',
          },
        ]}
        example={`# A work, with its provenance:
curl -sS ${BASE}/api/v1/works/W2342586781 | jq '{id, title, routes}'

# With the abstract fetched live from OpenAlex:
curl -sS "${BASE}/api/v1/works/W2342586781?abstract=1" | jq '.abstract'`}
      />

      <Endpoint
        path="/api/v1/screened"
        desc="The 1,000 screened works with all three models' tiers, genres, confidences and reasons, plus the design weight."
        note={
          <>
            <strong>The sample is stratified.</strong> Every record carries a <code className="font-mono text-xs">weight</code>{' '}
            (inverse selection probability). Any rate you compute from these rows without applying the weight is wrong.
          </>
        }
        params={[
          {
            name: 'contested_only',
            type: '1',
            desc: 'THE DISAGREEMENT DOSSIER: every work any model called metaresearch. This subset, not the base rate, is the project’s deliverable.',
          },
          { name: 'n_in', type: '0..3', desc: 'Exact consensus count.' },
          { name: 'stratum', type: 'string', desc: 'e.g. aff_core, about_only, french, venue_new, fund_new.' },
          { name: 'page, per_page', type: 'int', desc: 'per_page max 100.' },
        ]}
        example={`# The disagreement dossier: the works that mark the field's boundary.
curl -sS "${BASE}/api/v1/screened?contested_only=1" | jq '.meta.summary'

# The works only ONE model called metaresearch:
curl -sS "${BASE}/api/v1/screened?n_in=1" \\
  | jq '.results[] | {title, opus: .opus.tier, gpt: .gpt.tier, grok: .grok.tier}'`}
      />

      <Endpoint
        path="/api/v1/stats/by-route"
        desc="The four routes: marginals, and the exact route combinations."
        note={
          <>
            The routes <strong>overlap</strong> — a work can be admitted by several — so{' '}
            <code className="font-mono text-xs">marginals</code> sums to more than the frame.{' '}
            <code className="font-mono text-xs">combinations</code> counts each work once and sums to the total.
          </>
        }
        example={`curl -sS ${BASE}/api/v1/stats/by-route | jq '{no_aff: .meta.no_aff, marginals, combinations: .combinations[:5]}'`}
      />

      <Endpoint
        path="/api/v1/stats/by-year"
        desc="Works per year, with the no-affiliation and no-abstract counts alongside, because both gaps move over time."
        example={`curl -sS ${BASE}/api/v1/stats/by-year | jq '.results[-5:]'`}
      />

      <Endpoint
        path="/api/v1/stats/by-field"
        desc="The field breakdown, plus languages, the abstract gap by type, top venues, top funders, and the four-state retraction record — everything the analytics page draws, in one call."
        example={`curl -sS ${BASE}/api/v1/stats/by-field | jq '.retraction_states'`}
      />

      <Endpoint
        path="/api/v1/findings"
        desc="All 22 findings, served verbatim from the file the pilot scripts write. Every number quoted anywhere on this site comes from here."
        example={`curl -sS ${BASE}/api/v1/findings | jq '.findings.three_model_screen.headline'`}
      />

      <section className="card p-6">
        <h2 className="font-serif text-xl">Notes</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          <li>
            <strong>CORS</strong> is open (<code className="font-mono text-xs">*</code>). This is a public CC-BY
            research dataset; the point of publishing it is that you can query it from your own page without proxying.
          </li>
          <li>
            <strong>Caching.</strong> Responses carry{' '}
            <code className="font-mono text-xs">s-maxage=3600</code>. The frame is a pinned snapshot: it does not
            change between deploys, so a stale aggregate is not a risk and re-scanning 4.3M rows per request would be.
          </li>
          <li>
            <strong>No key, no rate limit</strong> — but it is one small server. Be reasonable, and if you need the
            whole frame, take{' '}
            <a className="link" href="https://github.com/choxos/CaRN-data-challenge">
              the repository
            </a>{' '}
            and rebuild it locally rather than paginating four million rows out of this box.
          </li>
          <li>
            <strong>Licence.</strong> Data CC-BY-4.0, code MIT. Cite OpenAlex and Retraction Watch as the upstream
            sources.
          </li>
        </ul>
      </section>
    </div>
  )
}

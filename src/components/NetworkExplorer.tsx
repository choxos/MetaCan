'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getDict } from '@/lib/i18n'
import { formatInt, localePath, type Lang } from '@/lib/lang'
import { NetworkGraph, type GraphEdge, type GraphNode } from '@/components/NetworkGraph'

/**
 * The network page's interactive shell: the overview map of the strongest
 * Canada-only ties, a researcher search, and the ego view (one researcher's
 * neighborhood) with a side list that links every collaborator back to the
 * cohort builder via the citable ?author_id= filter. All data arrives from
 * /api/v1/network, the same endpoint an API user reads, so the page cannot
 * show a graph the API would not.
 */

interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function NetworkExplorer({ lang, overview }: { lang: Lang; overview: Graph }) {
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)

  const [center, setCenter] = useState<string | null>(null)
  const [ego, setEgo] = useState<Graph | null>(null)
  const [loading, setLoading] = useState(false)

  const [q, setQ] = useState('')
  const [results, setResults] = useState<Array<{ id: string; name: string; ca_works: number }>>([])
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const focus = useCallback((id: string) => {
    setCenter(id)
    setEgo(null)
    setLoading(true)
    setResults([])
    fetch(`/api/v1/network?author_id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => setEgo(d.graph ?? null))
      .catch(() => setEgo(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    debounce.current = setTimeout(() => {
      fetch(`/api/v1/facets/author?q=${encodeURIComponent(term)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results ?? []))
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(debounce.current)
  }, [q])

  const graph = center ? ego : overview
  const centerNode = center && ego ? ego.nodes.find((n) => n.id === center) : null

  // The ego side list: spokes only, strongest first.
  const spokes =
    center && ego
      ? ego.edges
          .filter((e) => e.a === center || e.b === center)
          .map((e) => {
            const other = e.a === center ? e.b : e.a
            const node = ego.nodes.find((n) => n.id === other)
            return node ? { node, sharedWorks: e.sharedWorks, weight: e.weight } : null
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .sort((x, y) => y.weight - x.weight)
      : []

  return (
    <div>
      {/* Search + mode strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-[380px]">
          <div className="control flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 15 15" aria-hidden="true" className="shrink-0">
              <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="var(--ink-4)" strokeWidth="1.5" />
              <line x1="10" y1="10" x2="13.5" y2="13.5" stroke="var(--ink-4)" strokeWidth="1.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.network.searchPlaceholder}
              aria-label={t.network.searchLabel}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--ink)' }}
            />
          </div>
          {results.length > 0 && (
            <ul
              className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border shadow-lg"
              style={{ background: 'var(--surface)' }}
            >
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQ('')
                      focus(r.id)
                    }}
                    className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-[13px] hover:underline"
                    style={{ color: 'var(--ink-2)', background: 'none', border: 0, cursor: 'pointer' }}
                  >
                    <span className="min-w-0 truncate">{r.name}</span>
                    <span className="tabular font-mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                      {formatInt(lang, r.ca_works)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {center && (
          <button
            type="button"
            className="btn px-3 py-1.5 text-[13px]"
            onClick={() => {
              setCenter(null)
              setEgo(null)
            }}
          >
            ← {t.network.backOverview}
          </button>
        )}
      </div>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <div className="card overflow-hidden p-2">
          {loading ? (
            <div className="p-10 text-center text-[13px]" style={{ color: 'var(--ink-4)' }}>
              {t.network.loading}
            </div>
          ) : graph && graph.nodes.length > 0 ? (
            <NetworkGraph
              lang={lang}
              nodes={graph.nodes}
              edges={graph.edges}
              centerId={center ?? undefined}
              onPick={focus}
              pickLabel={t.network.focusLabel}
            />
          ) : (
            <div className="p-10 text-center text-[13px]" style={{ color: 'var(--ink-4)' }}>
              {t.network.empty}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {centerNode ? (
            <div className="card">
              <div className="border-b px-4 py-3">
                <div className="micro-label mb-1">{t.network.egoTitle}</div>
                <div className="font-serif text-[17px]" style={{ color: 'var(--ink)' }}>
                  {centerNode.name}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: 'var(--ink-4)' }}>
                  {t.network.caWorksOf(formatInt(lang, centerNode.caWorks))}
                </div>
                <Link
                  href={`${p('/cohort')}?author_id=${encodeURIComponent(centerNode.id)}`}
                  className="link mt-1 inline-block text-xs"
                >
                  {t.network.viewCohort} →
                </Link>
              </div>
              <div className="max-h-[440px] overflow-y-auto">
                {spokes.map((s) => (
                  <div key={s.node.id} className="flex items-baseline gap-2 border-b px-4 py-2 last:border-0">
                    <button
                      type="button"
                      onClick={() => focus(s.node.id)}
                      className="min-w-0 truncate text-left text-[13px] hover:underline"
                      style={{ color: 'var(--ink-2)', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                    >
                      {s.node.name}
                    </button>
                    <span className="ml-auto shrink-0 font-mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                      {t.network.sharedN(formatInt(lang, s.sharedWorks))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="callout-plain">{t.network.overviewHint}</div>
          )}
        </div>
      </div>
    </div>
  )
}

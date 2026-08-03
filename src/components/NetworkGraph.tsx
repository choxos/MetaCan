'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatInt, type Lang } from '@/lib/lang'

/**
 * A dependency-free force-directed graph. The site takes no charting library
 * for one page (matching ResultsByYear, which hand-rolls its histogram), and
 * the node counts here (<= ~400) are far below where hand-rolled layout
 * breaks down.
 *
 * Layout: plain velocity-Verlet-ish iteration with pairwise repulsion,
 * spring forces along edges (rest length shrinks with edge weight), and
 * centering gravity. The simulation runs on mount and on data change, NOT
 * per frame forever: a few hundred ticks, animated while they last, then the
 * layout is static and cheap. Deterministic: nodes start on a circle in a
 * stable order, so the same data always draws the same map (no Math.random,
 * so server and client cannot disagree either).
 */

export interface GraphNode {
  id: string
  name: string
  caWorks: number
}

export interface GraphEdge {
  a: string
  b: string
  sharedWorks: number
  weight: number
}

interface P {
  x: number
  y: number
  vx: number
  vy: number
}

const W = 920
const H = 620
const TICKS = 260

export function NetworkGraph({
  lang,
  nodes,
  edges,
  centerId,
  onPick,
  pickLabel,
}: {
  lang: Lang
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Ego view: this node is pinned to the middle and drawn hollow. */
  centerId?: string
  onPick?: (id: string) => void
  /** Accessible label for node buttons, e.g. "Focus on this researcher". */
  pickLabel: string
}) {
  const [pos, setPos] = useState<Map<string, P> | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const raf = useRef<number>(0)

  const index = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes])
  const maxCa = useMemo(() => Math.max(1, ...nodes.map((n) => n.caWorks)), [nodes])
  const maxW = useMemo(() => Math.max(1e-6, ...edges.map((e) => e.weight)), [edges])

  const radius = (n: GraphNode) => 3.5 + 9 * Math.sqrt(n.caWorks / maxCa)

  useEffect(() => {
    if (!nodes.length) {
      setPos(null)
      return
    }
    // Deterministic start: a circle, ordered as given.
    const ps: P[] = nodes.map((n, i) => {
      const th = (2 * Math.PI * i) / nodes.length
      const r = n.id === centerId ? 0 : Math.min(W, H) * 0.38
      return { x: W / 2 + r * Math.cos(th), y: H / 2 + r * Math.sin(th), vx: 0, vy: 0 }
    })
    const links = edges.flatMap((e) => {
      const i = index.get(e.a)
      const j = index.get(e.b)
      return i !== undefined && j !== undefined ? [{ i, j, w: e.weight / maxW }] : []
    })

    let tick = 0
    const step = () => {
      const alpha = 1 - tick / TICKS
      // Repulsion, O(n^2): fine at n <= ~400.
      for (let i = 0; i < ps.length; i++) {
        const pi = ps[i]!
        for (let j = i + 1; j < ps.length; j++) {
          const pj = ps[j]!
          let dx = pi.x - pj.x
          let dy = pi.y - pj.y
          const d2 = dx * dx + dy * dy + 0.01
          if (d2 > 40000) continue
          const f = (900 * alpha) / d2
          const d = Math.sqrt(d2)
          dx /= d
          dy /= d
          pi.vx += dx * f
          pi.vy += dy * f
          pj.vx -= dx * f
          pj.vy -= dy * f
        }
      }
      // Springs: stronger ties pull closer.
      for (const { i, j, w } of links) {
        const pi = ps[i]!
        const pj = ps[j]!
        const dx = pj.x - pi.x
        const dy = pj.y - pi.y
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01
        const rest = 130 - 90 * w
        const f = ((d - rest) / d) * 0.03 * alpha * (0.5 + w)
        pi.vx += dx * f
        pi.vy += dy * f
        pj.vx -= dx * f
        pj.vy -= dy * f
      }
      // Gravity toward the middle; the ego center is pinned outright.
      for (let i = 0; i < ps.length; i++) {
        const pi = ps[i]!
        if (nodes[i]!.id === centerId) {
          pi.x = W / 2
          pi.y = H / 2
          pi.vx = 0
          pi.vy = 0
          continue
        }
        pi.vx += (W / 2 - pi.x) * 0.0012 * alpha
        pi.vy += (H / 2 - pi.y) * 0.0012 * alpha
        pi.vx *= 0.82
        pi.vy *= 0.82
        pi.x = Math.max(14, Math.min(W - 14, pi.x + pi.vx))
        pi.y = Math.max(14, Math.min(H - 14, pi.y + pi.vy))
      }
      tick++
      setPos(new Map(nodes.map((n, i) => [n.id, { ...ps[i]! }])))
      if (tick < TICKS) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, centerId])

  if (!nodes.length) return null

  const neighborIds = hover
    ? new Set(edges.flatMap((e) => (e.a === hover ? [e.b] : e.b === hover ? [e.a] : [])))
    : null

  // Label the biggest nodes only; a fully labeled hairball is unreadable.
  const labeled = new Set(
    [...nodes].sort((x, y) => y.caWorks - x.caWorks).slice(0, 18).map((n) => n.id),
  )
  const hoverNode = hover ? nodes[index.get(hover)!] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${nodes.length} nodes, ${edges.length} edges`}
      >
        {pos &&
          edges.map((e, k) => {
            const pa = pos.get(e.a)
            const pb = pos.get(e.b)
            if (!pa || !pb) return null
            const active = hover !== null && (e.a === hover || e.b === hover)
            return (
              <line
                key={k}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={active ? 'var(--mc)' : 'var(--ink-5)'}
                strokeWidth={active ? 1.6 : 0.6 + 1.6 * (e.weight / maxW)}
                opacity={hover === null ? 0.35 : active ? 0.9 : 0.08}
              />
            )
          })}
        {pos &&
          nodes.map((n) => {
            const p = pos.get(n.id)
            if (!p) return null
            const dim = hover !== null && hover !== n.id && !neighborIds?.has(n.id)
            const isCenter = n.id === centerId
            return (
              <g key={n.id} opacity={dim ? 0.25 : 1}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={radius(n)}
                  fill={isCenter ? 'var(--surface)' : 'var(--mc)'}
                  stroke={isCenter ? 'var(--mc)' : 'var(--surface)'}
                  strokeWidth={isCenter ? 2.5 : 1}
                  opacity={isCenter ? 1 : 0.88}
                  role={onPick ? 'button' : undefined}
                  aria-label={onPick ? `${pickLabel}: ${n.name}` : n.name}
                  tabIndex={onPick ? 0 : undefined}
                  style={{ cursor: onPick ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(n.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => onPick?.(n.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault()
                      onPick?.(n.id)
                    }
                  }}
                />
                {(labeled.has(n.id) || hover === n.id) && (
                  <text
                    x={p.x + radius(n) + 3}
                    y={p.y + 3}
                    fontSize={10.5}
                    fill="var(--ink-3)"
                    style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 2.5 }}
                  >
                    {n.name}
                  </text>
                )}
              </g>
            )
          })}
      </svg>
      {hoverNode && (
        <div
          className="pointer-events-none absolute left-2 top-2 rounded-md border px-2.5 py-1.5 text-xs shadow-sm"
          style={{ background: 'var(--surface)', color: 'var(--ink-2)' }}
        >
          <strong style={{ color: 'var(--ink)' }}>{hoverNode.name}</strong>
          {' · '}
          <span className="tabular">{formatInt(lang, hoverNode.caWorks)}</span>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDict } from '@/lib/i18n'
import { formatInt, localePath, type Lang } from '@/lib/lang'

// Structurally identical to query.ts's YearCount; declared here because a
// client component must not import from a module that carries Prisma.
type YearCount = { year: number; n: number }

/**
 * The PubMed-style results-by-year widget: a per-year histogram of the
 * current cohort with a dual-handle range slider under it.
 *
 * Three interactions, all writing the same ?year_from/?year_to params the
 * numeric inputs in the query panel already use (one vocabulary, two
 * controls):
 *
 *   - hover a bar  -> tooltip with the year and its exact count
 *   - click a bar  -> that single year becomes the range
 *   - drag a handle -> live preview, committed on release
 *
 * The bars are LINEAR in count. The distribution is violently right-skewed
 * (recent years dwarf the tail), and that skew is a true fact about the
 * frame; a sqrt or log scale would flatter the tail at the price of lying
 * about proportions, and this site does not do that.
 *
 * The histogram always shows the FULL distribution for the current non-year
 * filters, with the selected range at full opacity and the rest dimmed:
 * the widget is the control that sets the year range, so it must not
 * amputate its own context when a range is active.
 */
export function ResultsByYear({ lang, data }: { lang: Lang; data: YearCount[] }) {
  const router = useRouter()
  const sp = useSearchParams()
  const t = getDict(lang)
  const basePath = localePath(lang, '/cohort')

  const domain = useMemo(() => {
    if (!data.length) return null
    const years = data.map((d) => d.year)
    const min = Math.min(...years)
    const max = Math.max(...years)
    const byYear = new Map(data.map((d) => [d.year, d.n]))
    const bars: YearCount[] = []
    for (let y = min; y <= max; y++) bars.push({ year: y, n: byYear.get(y) ?? 0 })
    return { min, max, bars, peak: Math.max(...data.map((d) => d.n), 1) }
  }, [data])

  const urlFrom = Number(sp.get('year_from') ?? NaN)
  const urlTo = Number(sp.get('year_to') ?? NaN)

  // The pending range while a handle is mid-drag; null means "mirror the URL".
  const [pending, setPending] = useState<{ from: number; to: number } | null>(null)
  useEffect(() => setPending(null), [sp])

  const [hover, setHover] = useState<{ year: number; n: number; x: number } | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'from' | 'to' | null>(null)

  const push = useCallback(
    (from: number, to: number) => {
      if (!domain) return
      const p = new URLSearchParams(sp.toString())
      // The full domain is "no filter": drop the params instead of writing a
      // range that matches everything but looks like a constraint.
      if (from <= domain.min) p.delete('year_from')
      else p.set('year_from', String(from))
      if (to >= domain.max) p.delete('year_to')
      else p.set('year_to', String(to))
      p.delete('page')
      const qs = p.toString()
      router.push(qs ? `${basePath}?${qs}` : basePath)
    },
    [router, sp, basePath, domain],
  )

  if (!domain) return null
  const { min, max, bars, peak } = domain

  const clamp = (y: number) => Math.min(Math.max(y, min), max)
  const from = pending?.from ?? (Number.isFinite(urlFrom) ? clamp(urlFrom) : min)
  const to = pending?.to ?? (Number.isFinite(urlTo) ? clamp(urlTo) : max)

  const span = Math.max(max - min, 1)
  const frac = (y: number) => (y - min) / span

  const yearAtClientX = (clientX: number) => {
    const el = wrapRef.current
    if (!el) return min
    const r = el.getBoundingClientRect()
    const f = Math.min(Math.max((clientX - r.left) / r.width, 0), 1)
    return clamp(Math.round(min + f * span))
  }

  const beginDrag = (which: 'from' | 'to') => (e: React.PointerEvent) => {
    dragging.current = which
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const onDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const y = yearAtClientX(e.clientX)
    setPending((prev) => {
      const cur = prev ?? { from, to }
      // Handles may cross; keep the pair ordered by reassigning the grab.
      if (dragging.current === 'from') {
        return y > cur.to ? { from: cur.to, to: y } : { ...cur, from: y }
      }
      return y < cur.from ? { from: y, to: cur.from } : { ...cur, to: y }
    })
  }
  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = null
    setPending((cur) => {
      if (cur) push(cur.from, cur.to)
      return cur
    })
  }

  const nudge = (which: 'from' | 'to') => (e: React.KeyboardEvent) => {
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0
    if (!delta) return
    e.preventDefault()
    if (which === 'from') push(clamp(Math.min(from + delta, to)), to)
    else push(from, clamp(Math.max(to + delta, from)))
  }

  const CHART_H = 64
  const active = Number.isFinite(urlFrom) || Number.isFinite(urlTo) || pending !== null

  return (
    <div className="border-b py-3">
      <div className="micro-label mb-2 flex items-baseline justify-between">
        <span>{t.cohort.resultsByYear}</span>
        {active && !pending && (
          <button
            type="button"
            onClick={() => push(min, max)}
            className="text-[10px] font-medium normal-case tracking-normal"
            style={{ color: 'var(--mc)', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
          >
            {t.filters.clearAll}
          </button>
        )}
      </div>

      <div ref={wrapRef} className="relative select-none" style={{ touchAction: 'none' }}>
        {/* Histogram */}
        <svg
          width="100%"
          height={CHART_H}
          viewBox={`0 0 ${bars.length} ${CHART_H}`}
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          role="img"
          aria-label={t.cohort.resultsByYear}
          onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => {
            if (dragging.current) return
            const y = yearAtClientX(e.clientX)
            const b = bars[y - min]
            const el = wrapRef.current
            if (b && el) {
              const r = el.getBoundingClientRect()
              setHover({ year: b.year, n: b.n, x: e.clientX - r.left })
            }
          }}
          onClick={(e) => {
            const y = yearAtClientX(e.clientX)
            push(y, y)
          }}
          style={{ cursor: 'pointer', display: 'block' }}
        >
          {bars.map((b, i) => {
            const h = b.n > 0 ? Math.max((b.n / peak) * CHART_H, 1) : 0
            const inRange = b.year >= from && b.year <= to
            return (
              <rect
                key={b.year}
                x={i}
                y={CHART_H - h}
                width={1}
                height={h}
                fill="var(--teal)"
                opacity={inRange ? (hover?.year === b.year ? 1 : 0.85) : 0.22}
              />
            )
          })}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded border px-2 py-1 font-mono text-[11px] tabular"
            style={{
              left: `min(max(${hover.x}px, 40px), calc(100% - 40px))`,
              top: -8,
              transform: 'translate(-50%, -100%)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            {hover.year} · {formatInt(lang, hover.n)}
          </div>
        )}

        {/* Slider track */}
        <div className="relative mt-1.5 h-4">
          <div
            className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
            style={{ background: 'var(--line)' }}
          />
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
            style={{
              left: `${frac(from) * 100}%`,
              width: `${(frac(to) - frac(from)) * 100}%`,
              background: 'var(--teal)',
            }}
          />
          {(['from', 'to'] as const).map((which) => {
            const y = which === 'from' ? from : to
            return (
              <button
                key={which}
                type="button"
                role="slider"
                aria-label={which === 'from' ? t.filters.yearFrom : t.filters.yearTo}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={y}
                onPointerDown={beginDrag(which)}
                onPointerMove={onDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={nudge(which)}
                className="absolute top-1/2 h-3.5 w-3.5 rounded-full border-2"
                style={{
                  left: `${frac(y) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  background: 'var(--surface)',
                  borderColor: 'var(--teal)',
                  cursor: 'ew-resize',
                  padding: 0,
                }}
              />
            )
          })}
        </div>

        {/* Range labels, PubMed style */}
        <div className="mt-0.5 flex justify-between font-mono text-[11px] tabular" style={{ color: 'var(--ink-3)' }}>
          <span>{from}</span>
          <span>{to}</span>
        </div>
      </div>
    </div>
  )
}

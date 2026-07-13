'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import { POLYSEMY_ROWS } from '@/data/findings'
import { fmtInt, fmtPct } from '@/lib/format'
import type { Dictionary, Lang } from '@/lib/i18n'
import { useChartTokens } from './tokens'

/**
 * Finding 5, drawn out: how much of what each term returns is actually on topic.
 *
 * The colours come from ./tokens, which resolves the design system's `--chart-*`
 * custom properties off the live document: Recharts writes `fill` as an SVG
 * presentation attribute, where `var(--t1)` does not resolve.
 */
interface Row {
  term: string
  precision: number
  hits: number
  onTopic: number
}

export function PolysemyChart({ lang, t }: { lang: Lang; t: Dictionary }) {
  const c = useChartTokens()

  const data: Row[] = POLYSEMY_ROWS.map((r) => ({
    // Strip the quotes OpenAlex needs but a reader does not.
    term: r.term.replace(/"/g, ''),
    precision: r.precision,
    hits: r.hits,
    onTopic: r.onTopic,
  }))

  // The worst term gets the amber. It is the one the pilot singles out, and the
  // one that made semantic screening non-negotiable.
  const worst = data.reduce<Row | null>(
    (acc, r) => (acc === null || r.precision < acc.precision ? r : acc),
    null,
  )

  function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
    if (!active || !payload || payload.length === 0) return null
    const row = payload[0]?.payload as Row | undefined
    if (!row) return null
    return (
      <div
        style={{
          background: c.tooltipBg,
          border: `1px solid ${c.tooltipBorder}`,
          borderRadius: 'var(--r-md)',
          padding: '10px 12px',
          fontSize: 12,
        }}
      >
        <div className="mono" style={{ color: c.ink, marginBottom: 6 }}>
          {row.term}
        </div>
        <div style={{ color: c.ink3 }}>
          <span className="mono num" style={{ color: c.gap }}>
            {fmtInt(row.hits, lang)}
          </span>{' '}
          {t.findings.chartTooltipHits}
        </div>
        <div style={{ color: c.ink3 }}>
          <span className="mono num" style={{ color: c.t1 }}>
            {fmtInt(row.onTopic, lang)}
          </span>{' '}
          {t.findings.chartTooltipOnTopic}{' '}
          <span className="mono num">({fmtPct(row.precision, lang)})</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 20, left: 8 }}
          barCategoryGap="30%"
        >
          <CartesianGrid stroke={c.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 20]}
            tick={{ fill: c.axis, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            label={{
              value: t.findings.chartAxis,
              position: 'insideBottom',
              offset: -12,
              fill: c.axis,
              fontSize: 11,
            }}
          />
          <YAxis
            type="category"
            dataKey="term"
            width={110}
            tick={{ fill: c.axis, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar dataKey="precision" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((row) => (
              <Cell
                key={row.term}
                fill={worst && row.term === worst.term ? c.gap : c.t1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

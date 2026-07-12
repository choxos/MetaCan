'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import { MISSED_BY_FIELD } from '@/data/findings'
import { fmtInt } from '@/lib/format'
import type { Dictionary, Lang } from '@/lib/i18n'
import { useChartTokens } from './tokens'

/**
 * Finding 11, drawn out: the OpenAlex field each missed metaresearch work was
 * filed under instead.
 *
 * Every bar is amber, because every bar is a miss. There is no teal in this
 * chart and there should not be: the whole quantity being drawn is the part of
 * the field the topic route did not retrieve, broken down by the discipline it
 * was hiding in. Metaresearch about medicine is filed under Medicine; about
 * universities, under Social Sciences; about research software, under Computer
 * Science. The field disappears into the fields it studies.
 */
interface Row {
  field: string
  missed: number
}

/** OpenAlex's field names are long. Truncate the tick; the tooltip has the rest. */
const TICK_MAX = 26

function shorten(name: string): string {
  return name.length > TICK_MAX ? `${name.slice(0, TICK_MAX - 1).trimEnd()}…` : name
}

export function MissedFieldChart({ lang, t }: { lang: Lang; t: Dictionary }) {
  const c = useChartTokens()

  const data: Row[] = MISSED_BY_FIELD.map((r) => ({
    field: r.field,
    missed: r.missed,
  }))

  // Headroom for the count printed at the end of each bar. Computed, not a magic
  // number, so a re-run of the pilot cannot silently clip the longest bar.
  const max = data.reduce((m, r) => Math.max(m, r.missed), 0)
  const axisMax = Math.ceil(max * 1.2)

  // A bar chart conveys nothing to a screen reader. The same figures, as a
  // sentence, so no information is available only to sighted readers.
  const summary = `${t.findings.missedAxis}. ${data
    .map((r) => `${r.field}: ${fmtInt(r.missed, lang)}`)
    .join('. ')}.`

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
          maxWidth: 260,
        }}
      >
        <div className="mono" style={{ color: c.ink, marginBottom: 6 }}>
          {row.field}
        </div>
        <div style={{ color: c.ink3 }}>
          <span className="mono num" style={{ color: c.gap }}>
            {fmtInt(row.missed, lang)}
          </span>{' '}
          {t.findings.missedTooltip}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ width: '100%', height: 300 }}
      role="img"
      aria-label={summary}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 32, bottom: 20, left: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid stroke={c.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, axisMax]}
            allowDecimals={false}
            tick={{ fill: c.axis, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            label={{
              value: t.findings.missedAxis,
              position: 'insideBottom',
              offset: -12,
              fill: c.axis,
              fontSize: 11,
            }}
          />
          <YAxis
            type="category"
            dataKey="field"
            width={168}
            tickFormatter={shorten}
            tick={{ fill: c.axis, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar
            dataKey="missed"
            fill={c.gap}
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
          >
            {/* The count at the end of each bar, so the chart reads without a
                hover: on a touch device there is no hover to give. */}
            <LabelList
              dataKey="missed"
              position="right"
              formatter={(v: number) => fmtInt(v, lang)}
              style={{
                fill: c.ink3,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

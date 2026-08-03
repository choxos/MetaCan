'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { YearPoint, FieldPoint, LangPoint, TypePoint, RouteStats, RetractionState } from '@/lib/stats'
import { getDict } from '@/lib/i18n'
import { numberLocale, type Lang } from '@/lib/lang'

/**
 * Recharts over the frame's AGGREGATES. The client never sees a work row: every
 * series here is a GROUP BY that Postgres already reduced to at most a few dozen
 * points. Shipping 4.3M rows to a browser to draw a bar chart would be absurd.
 *
 * Colors come from the CSS custom properties, so every chart is correct in both
 * light and dark without a second palette.
 *
 * Every chart takes `lang`: series names and route labels come from the
 * dictionary, and numbers format under the reader's locale. The DATA (route
 * keys, field names, venue names, RW nature strings) stays exactly what the
 * API serves; only the labels around it switch.
 */

const AXIS = { fontSize: 11, fill: 'var(--chart-axis)' }
const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}k` : String(n)

function ChartTip({
  active,
  payload,
  label,
  suffix,
  locale,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string }>
  label?: string | number
  suffix?: string
  locale: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-sm"
      style={{ background: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', color: 'var(--ink)' }}
    >
      {label !== undefined && <div className="mb-1 font-medium">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="tabular flex items-center gap-2">
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: 'var(--ink-3)' }}>{p.name}:</span>
          <span className="font-medium">
            {typeof p.value === 'number' ? p.value.toLocaleString(locale) : p.value}
            {suffix ?? ''}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The card around a chart. It does NOT wrap the chart in a ResponsiveContainer.
 *
 * That distinction is load-bearing and cost an hour. ResponsiveContainer measures
 * itself and then injects `width` and `height` into its DIRECT child by cloning it.
 * If the direct child is a wrapper component (<ByYearChart/>) rather than the chart
 * itself (<AreaChart/>), the wrapper receives those props and drops them, the chart
 * underneath is left with no dimensions, and Recharts renders NOTHING: silently,
 * with no console error, leaving a correctly-sized empty box that looks like a
 * styling bug. Every chart below therefore owns its own ResponsiveContainer, whose
 * direct child is a real Recharts chart.
 */
export function Frame({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="card p-5">
      <h3 className="font-serif text-lg">{title}</h3>
      {note && (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          {note}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** The one place ResponsiveContainer is allowed, so its child is always a chart. */
function Responsive({ height, children }: { height: number; children: React.ReactElement }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export function ByYearChart({ data, lang, height = 340 }: { data: YearPoint[]; lang: Lang; height?: number }) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  return (
    <Responsive height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gWorks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mc)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--mc)" stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="gNoAff" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mc-accent)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--mc-accent)" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="year" tick={AXIS} stroke="var(--border-strong)" minTickGap={24} />
        <YAxis tick={AXIS} stroke="var(--border-strong)" tickFormatter={compact} width={48} />
        <Tooltip content={<ChartTip locale={locale} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="works"
          name={t.charts.allWorks}
          stroke="var(--mc)"
          fill="url(#gWorks)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="no_aff"
          name={t.charts.noCaAff}
          stroke="var(--mc-accent)"
          fill="url(#gNoAff)"
          strokeWidth={2}
        />
      </AreaChart>
    </Responsive>
  )
}

/** Route keys are API vocabulary; their display labels come from the dictionary. */
function routeLabel(lang: Lang, route: string, fallback: string): string {
  const t = getDict(lang)
  switch (route) {
    case 'aff':
      return t.charts.routeAff
    case 'fund':
      return t.charts.routeFund
    case 'venue':
      return t.charts.routeVenue
    case 'about':
      return t.charts.routeAbout
    default:
      return fallback
  }
}

export function ByRouteChart({ data, lang, height = 260 }: { data: RouteStats; lang: Lang; height?: number }) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  const rows = data.marginals.map((m) => ({ ...m, label: routeLabel(lang, m.route, m.label) }))
  return (
    <Responsive height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" tick={AXIS} stroke="var(--border-strong)" tickFormatter={compact} />
        <YAxis type="category" dataKey="label" tick={AXIS} stroke="var(--border-strong)" width={140} />
        <Tooltip content={<ChartTip locale={locale} />} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="works" name={t.charts.works} fill="var(--mc)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </Responsive>
  )
}

/** The overlap. The routes are not exclusive, so the combinations are the honest view. */
export function RouteOverlapChart({ data, lang, height = 260 }: { data: RouteStats; lang: Lang; height?: number }) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  const top = data.combinations.filter((c) => c.combo !== 'none').slice(0, 10)
  return (
    <Responsive height={height}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" tick={AXIS} stroke="var(--border-strong)" tickFormatter={compact} />
        <YAxis type="category" dataKey="combo" tick={AXIS} stroke="var(--border-strong)" width={140} />
        <Tooltip content={<ChartTip locale={locale} />} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="works" name={t.charts.works} radius={[0, 4, 4, 0]}>
          {top.map((c, i) => (
            <Cell
              key={i}
              // Single-route works are the ones a narrower frame would lose entirely.
              fill={c.n_routes === 1 ? 'var(--mc-accent)' : 'var(--mc)'}
            />
          ))}
        </Bar>
      </BarChart>
    </Responsive>
  )
}

export function ByFieldChart({ data, lang, height = 360 }: { data: FieldPoint[]; lang: Lang; height?: number }) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  const top = data.slice(0, 14)
  return (
    <Responsive height={height}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" tick={AXIS} stroke="var(--border-strong)" tickFormatter={compact} />
        <YAxis
          type="category"
          dataKey="field"
          tick={{ ...AXIS, fontSize: 10 }}
          stroke="var(--border-strong)"
          width={170}
        />
        <Tooltip content={<ChartTip locale={locale} />} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="works" name={t.charts.works} fill="var(--mc)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </Responsive>
  )
}

export function ByLangChart({ data, lang, height = 360 }: { data: LangPoint[]; lang: Lang; height?: number }) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  const top = data.slice(0, 10)
  return (
    <Responsive height={height}>
      <BarChart data={top} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="lang" tick={AXIS} stroke="var(--border-strong)" />
        <YAxis tick={AXIS} stroke="var(--border-strong)" tickFormatter={compact} width={48} />
        <Tooltip content={<ChartTip locale={locale} />} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="works" name={t.charts.works} radius={[4, 4, 0, 0]}>
          {top.map((l, i) => (
            // French is the language the frame oversamples and the cascade rescues worst.
            <Cell key={i} fill={l.lang === 'fr' ? 'var(--mc-accent)' : 'var(--mc)'} />
          ))}
        </Bar>
      </BarChart>
    </Responsive>
  )
}

/**
 * The abstract gap by type. Sorted by the SHARE with no abstract, not by volume:
 * the finding is that the gap is structural: concentrated in types that never
 * carry an abstract: rather than uniform noise a better index would fix.
 */
export function AbstractGapChart({ data, lang, height = 400 }: { data: TypePoint[]; lang: Lang; height?: number }) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  const sorted = [...data].sort((a, b) => b.pct_no_abstract - a.pct_no_abstract)
  return (
    <Responsive height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={AXIS}
          stroke="var(--border-strong)"
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="type"
          tick={{ ...AXIS, fontSize: 10 }}
          stroke="var(--border-strong)"
          width={110}
        />
        <Tooltip content={<ChartTip suffix="%" locale={locale} />} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="pct_no_abstract" name={t.charts.noAbstract} fill="var(--contested)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </Responsive>
  )
}

export function VenueChart({
  data,
  lang,
  height = 380,
}: {
  data: Array<{ venue: string; works: number }>
  lang: Lang
  height?: number
}) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  const top = data.slice(0, 12)
  return (
    <Responsive height={height}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" tick={AXIS} stroke="var(--border-strong)" tickFormatter={compact} />
        <YAxis
          type="category"
          dataKey="venue"
          tick={{ ...AXIS, fontSize: 10 }}
          stroke="var(--border-strong)"
          width={190}
        />
        <Tooltip content={<ChartTip locale={locale} />} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="works" name={t.charts.works} fill="var(--mc)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </Responsive>
  )
}

export function FunderChart({
  data,
  lang,
  height = 380,
}: {
  data: Array<{ funder: string; works: number }>
  lang: Lang
  height?: number
}) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  const top = data.slice(0, 12)
  return (
    <Responsive height={height}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" tick={AXIS} stroke="var(--border-strong)" tickFormatter={compact} />
        <YAxis
          type="category"
          dataKey="funder"
          tick={{ ...AXIS, fontSize: 10 }}
          stroke="var(--border-strong)"
          width={190}
        />
        <Tooltip content={<ChartTip locale={locale} />} cursor={{ fill: 'var(--surface-2)' }} />
        <Bar dataKey="works" name={t.charts.works} fill="var(--mc-accent)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </Responsive>
  )
}

/**
 * FOUR states, not a boolean. `openalex_missed` is the bar that matters: those are
 * the works whose post-publication status OpenAlex's `is_retracted` reports as
 * false, which a reader takes to mean "fine".
 */
export function RetractionChart({ data, lang, height = 320 }: { data: RetractionState[]; lang: Lang; height?: number }) {
  const t = getDict(lang)
  const locale = numberLocale(lang)
  const color = (nature: string) => {
    const n = nature.toLowerCase()
    if (n.includes('concern')) return 'var(--concern)'
    if (n.includes('correction')) return 'var(--correction)'
    if (n.includes('reinstat')) return 'var(--reinstatement)'
    return 'var(--retraction)'
  }
  return (
    <Responsive height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="nature" tick={{ ...AXIS, fontSize: 10 }} stroke="var(--border-strong)" />
        <YAxis tick={AXIS} stroke="var(--border-strong)" width={40} allowDecimals={false} />
        <Tooltip content={<ChartTip locale={locale} />} cursor={{ fill: 'var(--surface-2)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="openalex_flagged" name={t.charts.flagged} stackId="a" radius={[0, 0, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={color(d.nature)} fillOpacity={0.85} />
          ))}
        </Bar>
        <Bar dataKey="openalex_missed" name={t.charts.missed} stackId="a" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={color(d.nature)} fillOpacity={0.28} stroke={color(d.nature)} strokeDasharray="3 2" />
          ))}
        </Bar>
      </BarChart>
    </Responsive>
  )
}

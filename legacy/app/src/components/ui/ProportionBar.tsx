'use client'

import type { Bar } from '@/data/findings'
import { fmtInt, fmtPct, fmtUsd, pctWidth } from '@/lib/format'
import type { Lang } from '@/lib/i18n'

interface ProportionBarProps {
  bar: Bar
  lang: Lang
  /** What the teal segment is, in this finding's terms. */
  foundLabel: string
  /** What the amber segment is. */
  missedLabel: string
}

/**
 * The found/missed split for one finding. Teal is what the pipeline accounts
 * for; amber is what it does not.
 *
 * The bar is given an explicit `role="img"` with a full-sentence label, because
 * a two-div flexbox conveys nothing to a screen reader and the split IS the
 * argument on this page. The visible legend carries the same figures, so no
 * information is available only to sighted readers, or only to assistive ones.
 */
export function ProportionBar({
  bar,
  lang,
  foundLabel,
  missedLabel,
}: ProportionBarProps) {
  // Most bars split a number of works, and the legend prints the count with its
  // share. Finding 11 splits a share the pilot only ever states in percent, so
  // its segments are printed as percentages rather than as works the artefact
  // never counted, and the share is not repeated twice. Finding 13 splits money.
  // See Bar.unit.
  const amount = (n: number) => {
    switch (bar.unit) {
      case 'pct':
        return fmtPct(n, lang)
      case 'usd':
        return fmtUsd(n, lang)
      default:
        return fmtInt(n, lang)
    }
  }

  const segment = (n: number, pct: number) =>
    bar.unit === 'pct' ? fmtPct(n, lang) : `${amount(n)} (${fmtPct(pct, lang)})`

  const summary =
    `${foundLabel}: ${segment(bar.found, bar.foundPct)}. ` +
    `${missedLabel}: ${segment(bar.missed, bar.missedPct)}.`

  return (
    <div>
      <div className="prop-bar" role="img" aria-label={summary}>
        <div
          className="prop-found"
          style={{ width: pctWidth(bar.foundPct) }}
          aria-hidden
        />
        <div
          className="prop-missed"
          style={{ width: pctWidth(bar.missedPct) }}
          aria-hidden
        />
      </div>
      <div className="prop-legend" aria-hidden>
        <span className="key">
          <span className="swatch" style={{ background: 'var(--t1)' }} />
          <span style={{ color: 'var(--ink-3)' }}>{foundLabel}</span>
          <span className="num" style={{ color: 'var(--ink-2)' }}>
            {amount(bar.found)}
          </span>
        </span>
        <span className="key">
          <span className="swatch" style={{ background: 'var(--gap)' }} />
          <span style={{ color: 'var(--ink-3)' }}>{missedLabel}</span>
          <span className="num" style={{ color: 'var(--gap)' }}>
            {amount(bar.missed)}
          </span>
        </span>
      </div>
    </div>
  )
}

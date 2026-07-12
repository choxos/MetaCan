'use client'

import type { Hero } from '@/data/findings'
import {
  fmtInt,
  fmtPct,
  fmtPctExact,
  fmtTimesExact,
  fmtUsd,
  fmtValue,
  fmtYear,
} from '@/lib/format'
import type { Lang } from '@/lib/i18n'

/**
 * Render a figure from findings.json in the reader's language.
 *
 * Every number on this site goes through here or through `fmtInt`. There is no
 * path by which a figure reaches the page without having come from the pilot's
 * output, which is the whole reason findings.json exists.
 *
 * A `pct` or `times` hero is a figure the pilot stated, so it keeps the digits
 * the pilot stated it with: the base rate is 1.31%, not 1.3%, and the screener
 * swap moves the field by 2.24x, not 2.2x. A `pctDerived` hero is a percentage
 * this site COMPUTED, so it is rounded to one decimal: the superseded 32.4% is a
 * quotient of two integers, and printing its fifteen float digits would be
 * inventing precision for a figure we are in the middle of retracting.
 *
 * `num` is a bare quantity, which here means a p-value, and it keeps every digit
 * the artefact carries: an interaction at p = 0.141 must not round to "0.1".
 */
export function figureText(hero: Hero, lang: Lang): string {
  switch (hero.kind) {
    case 'int':
      return fmtInt(hero.value, lang)
    case 'ratio':
      return `${fmtInt(hero.num, lang)} / ${fmtInt(hero.den, lang)}`
    case 'pct':
      return fmtPctExact(hero.value, lang)
    case 'pctDerived':
      return fmtPct(hero.value, lang)
    case 'times':
      return fmtTimesExact(hero.value, lang)
    case 'usd':
      return fmtUsd(hero.value, lang)
    case 'num':
      return fmtValue(hero.value, lang)
    case 'year':
      return fmtYear(hero.value, lang)
  }
}

interface FigureProps {
  hero: Hero
  lang: Lang
  className?: string
}

export function Figure({ hero, lang, className = '' }: FigureProps) {
  return <span className={`num ${className}`.trim()}>{figureText(hero, lang)}</span>
}

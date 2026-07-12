import type { Lang } from './i18n'

/**
 * Deterministic, locale-aware number formatting.
 *
 * Deliberately NOT Intl.NumberFormat. The language is chosen on the client
 * (localStorage) while the first paint is server-rendered, so any formatter
 * whose output can vary between the Node and browser ICU builds is a hydration
 * mismatch waiting to happen. These functions are pure string manipulation and
 * produce byte-identical output in both.
 *
 * Canadian conventions:
 *   en-CA  1,234   64.1%   9.2x
 *   fr-CA  1 234   64,1 %  9,2x     (narrow no-break space as group separator,
 *                                    comma as decimal mark, no-break space
 *                                    before the percent sign)
 */

const NNBSP = ' ' // narrow no-break space
const NBSP = ' ' // no-break space

const GROUP: Record<Lang, string> = { en: ',', fr: NNBSP }
const DECIMAL: Record<Lang, string> = { en: '.', fr: ',' }

function group(digits: string, sep: string): string {
  // Insert `sep` every three digits from the right.
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
}

/** 793883 -> "793,883" (en) / "793 883" (fr). */
export function fmtInt(n: number, lang: Lang): string {
  const neg = n < 0
  const digits = group(String(Math.abs(Math.round(n))), GROUP[lang])
  return neg ? `-${digits}` : digits
}

/**
 * 64.1 -> "64.1%" (en) / "64,1 %" (fr).
 * Trailing ".0" is dropped, so 59 renders as "59%", not "59.0%".
 */
export function fmtPct(n: number, lang: Lang, decimals = 1): string {
  const fixed = n.toFixed(decimals)
  const [intPart = '0', fracPart] = fixed.split('.')
  const frac = fracPart && Number(fracPart) !== 0 ? DECIMAL[lang] + fracPart : ''
  const num = group(intPart, GROUP[lang]) + frac
  return lang === 'fr' ? `${num}${NBSP}%` : `${num}%`
}

/**
 * US dollars: 4767 -> "US$4,767" (en) / "4 767 $ US" (fr).
 *
 * The sign goes before the figure in English and after it in French, which is the
 * Canadian convention and not a detail we get to skip on this site of all sites.
 * "US" is carried explicitly because the grant is quoted in Canadian dollars and
 * the Batch API bill is in American ones; a bare "$" would silently conflate two
 * currencies inside a single finding about whether the project can be afforded.
 */
export function fmtUsd(n: number, lang: Lang): string {
  const digits = fmtInt(n, lang)
  return lang === 'fr' ? `${digits}${NBSP}$${NBSP}US` : `US$${digits}`
}

/**
 * A mean publication year: 2013.7 -> "2013.7" (en) / "2013,7" (fr).
 *
 * Deliberately NOT `fmtValue`, which group-separates: that would render the mean
 * year of the abstract-less stratum as "2,013.7", which is not a year. A year is
 * a number that never takes a thousands separator, and the corrections section
 * quotes two of them side by side to show that "missing abstracts track OLDER
 * records" was backwards.
 */
export function fmtYear(n: number, lang: Lang): string {
  const raw = String(n)
  const [intPart = '0', fracPart] = raw.split('.')
  return fracPart ? intPart + DECIMAL[lang] + fracPart : intPart
}

/**
 * A percentage that findings.json states, rendered with exactly the digits the
 * artefact carries: 1.31 -> "1.31%", 12 -> "12%", 5.6 -> "5,6 %".
 *
 * `fmtPct` rounds to one decimal, which is right for a percentage this site
 * COMPUTES (a bar's found-share is a float with fifteen digits, and one is
 * plenty). It is wrong for a percentage this site QUOTES. The base rate is
 * 1.31% with a 95% interval of 1.03% to 1.64%; put those through `fmtPct` and
 * the interval renders "1% to 1.6%", which is a different claim from the one the
 * pilot made, tightened at one end and moved at the other. Same failure as
 * `fmtValue` was written to prevent, one component further out.
 */
export function fmtPctExact(n: number, lang: Lang): string {
  const raw = String(n)
  const dot = raw.indexOf('.')
  return fmtPct(n, lang, dot < 0 ? 0 : raw.length - dot - 1)
}

/**
 * Format a raw value out of findings.json for the provenance table.
 *
 * The table's job is to show the reader exactly what the pilot wrote, so this
 * MUST NOT round. An earlier version forced one decimal and turned a Cohen's
 * kappa of 0.702 into "0.7" and a base rate of 1.31% into "1.3": the site
 * quietly reporting different numbers from the artefact it claims to be quoting,
 * which is precisely the drift this project exists to complain about.
 *
 * Every significant digit the JSON carries is preserved; only the group and
 * decimal separators are localised.
 */
export function fmtValue(v: number | string | boolean, lang: Lang): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'string') return v
  if (Number.isInteger(v)) return fmtInt(v, lang)

  // String(v) gives the shortest round-tripping representation, so no digit the
  // JSON actually carries is lost and none is invented.
  const raw = String(v)
  const neg = raw.startsWith('-')
  const [intPart = '0', fracPart] = (neg ? raw.slice(1) : raw).split('.')
  const body =
    group(intPart, GROUP[lang]) + (fracPart ? DECIMAL[lang] + fracPart : '')
  return neg ? `-${body}` : body
}

/** 9.2 -> "9.2x" (en) / "9,2x" (fr). The multiplier in finding 6. */
export function fmtTimes(n: number, lang: Lang, decimals = 1): string {
  const fixed = n.toFixed(decimals)
  const [intPart = '0', fracPart] = fixed.split('.')
  const frac = fracPart && Number(fracPart) !== 0 ? DECIMAL[lang] + fracPart : ''
  return `${intPart}${frac}×`
}

/**
 * A multiplier that findings.json states, with the digits it states it with:
 * 9.2 -> "9.2x", 2.24 -> "2.24x", 2 -> "2x".
 *
 * Same reason as `fmtPctExact`. The screener swap moves the field's size by
 * 2.24x; rounding that to "2.2x" on the way to the page is the site quoting a
 * number the pilot did not write.
 */
export function fmtTimesExact(n: number, lang: Lang): string {
  const raw = String(n)
  const dot = raw.indexOf('.')
  return fmtTimes(n, lang, dot < 0 ? 0 : raw.length - dot - 1)
}

/**
 * "2026-07-11T12:33:18Z" -> "11 July 2026" / "11 juillet 2026".
 * Parsed by hand off the ISO string rather than via Date, so the rendered value
 * cannot shift with the server's or the reader's time zone. A UTC timestamp
 * that silently becomes "10 July" for anyone west of Greenwich would be a
 * provenance bug, not a cosmetic one.
 */
const MONTHS: Record<Lang, string[]> = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  fr: [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ],
}

export function fmtDateUtc(iso: string, lang: Lang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  if (!y || !mo || !d) return iso
  const monthIndex = Number(mo) - 1
  const month = MONTHS[lang][monthIndex]
  if (month === undefined) return iso
  const day = String(Number(d))
  return lang === 'fr' ? `${day} ${month} ${y}` : `${day} ${month} ${y}`
}

/** Clamp a percentage into [0, 100] for use as a CSS width. */
export function pctWidth(n: number): string {
  return `${Math.max(0, Math.min(100, n))}%`
}

/**
 * Substitute {a}, {b}, … into a dictionary template.
 *
 * This is how a sentence can contain a number without the number living in the
 * dictionary. The template carries the word order, which differs between the
 * two languages, and the figures are injected from findings.json at render.
 */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match)
}

/**
 * Language plumbing, kept free of React so the middleware (edge runtime) can
 * import it without dragging the dictionary or JSX along.
 *
 * The dictionary itself lives in i18n.tsx. This file is only: what languages
 * exist, how they appear in URLs, and how the preference cookie is named.
 */

export const SITE_URL = 'https://metacan.xera.ac'

export type Lang = 'en' | 'fr'

export const LANGS: readonly Lang[] = ['en', 'fr'] as const
export const DEFAULT_LANG: Lang = 'en'

export const LANG_LABEL: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
}

/** BCP-47 tag for <html lang> and hreflang. This is a Canadian site in both languages. */
export const LANG_TAG: Record<Lang, string> = {
  en: 'en-CA',
  fr: 'fr-CA',
}

/**
 * The preference cookie. Set ONLY by an explicit click on the language toggle,
 * never by merely visiting a /fr URL: a shared French link must not silently
 * flip an anglophone reader's preference, nor the reverse.
 */
export const LANG_COOKIE = 'metacan_lang'

export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'fr'
}

/**
 * URL scheme: English is the bare path (the site's existing URLs, already
 * shared and indexed, keep working unchanged); French lives under /fr.
 * A French link therefore stays French when shared, which is the point.
 */
export function localePath(lang: Lang, path: string): string {
  if (lang === 'en') return path
  return path === '/' ? '/fr' : `/fr${path}`
}

/** The number locale follows the language: 4,299,418 in English, 4 299 418 in French. */
export function numberLocale(lang: Lang): string {
  return lang === 'fr' ? 'fr-CA' : 'en-CA'
}

export function formatInt(lang: Lang, n: number): string {
  return n.toLocaleString(numberLocale(lang))
}

/**
 * A percentage with one decimal, in the language's own convention:
 * "23.3%" in English, "23,3 %" in French (comma decimal, space before %).
 */
export function formatPct(lang: Lang, value: number | string, digits = 1): string {
  const s = typeof value === 'number' ? value.toFixed(digits) : value
  return lang === 'fr' ? `${s.replace('.', ',')} %` : `${s}%`
}

/**
 * hreflang alternates for one page, shared by every page's generateMetadata.
 * Each language variant is a real URL that really serves that language, which
 * is the only condition under which declaring alternates is honest.
 */
export function langAlternates(lang: Lang, path: string) {
  return {
    canonical: localePath(lang, path),
    languages: {
      'en-CA': localePath('en', path),
      'fr-CA': localePath('fr', path),
      'x-default': localePath('en', path),
    },
  }
}

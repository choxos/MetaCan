import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LANG, LANG_COOKIE, isLang } from '@/lib/lang'

/**
 * Language routing.
 *
 * URL scheme: English is the bare path, French is /fr/<path>. Pages live under
 * app/[lang]/, so a bare English URL must be REWRITTEN (URL unchanged, /en
 * prepended internally) and a /fr URL passes through as-is.
 *
 * The preference cookie redirects in exactly two cases, both explicit:
 *   1. The reader chose French earlier (cookie fr) and opens a bare URL:
 *      redirect to the /fr twin, so the choice persists across visits.
 *   2. First contact on the home page with no cookie and a French
 *      Accept-Language: redirect / to /fr. A francophone reader should not
 *      have to ask for French on this site of all sites.
 *
 * Deliberately NOT done: setting the cookie from a mere /fr visit (a shared
 * French link must not flip an anglophone's stored preference; only the
 * toggle sets the cookie), and redirecting deep English links for fr-cookie
 * readers is done but /fr links are never redirected for en-cookie readers,
 * because an explicit /fr URL is an explicit request for French.
 */

/** Paths the language layer must never touch. */
function isExempt(pathname: string): boolean {
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.[^/]+$/.test(pathname)
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isExempt(pathname)) return NextResponse.next()

  // Explicit French URL: strip nothing, rewrite nothing; app/[lang] matches it.
  if (pathname === '/fr' || pathname.startsWith('/fr/')) {
    return NextResponse.next()
  }

  // /en is not a public URL (English is the bare path). Normalize it away so
  // the same page never lives at two URLs.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = req.nextUrl.clone()
    url.pathname = pathname === '/en' ? '/' : pathname.slice(3)
    return NextResponse.redirect(url, 308)
  }

  const cookie = req.cookies.get(LANG_COOKIE)?.value
  const stored = isLang(cookie) ? cookie : undefined

  // Case 1: the reader chose French earlier.
  if (stored === 'fr') {
    const url = req.nextUrl.clone()
    url.pathname = pathname === '/' ? '/fr' : `/fr${pathname}`
    return NextResponse.redirect(url, 307)
  }

  // Case 2: first contact on the home page, browser prefers French.
  if (!stored && pathname === '/') {
    const accept = req.headers.get('accept-language') ?? ''
    const prefersFrench = /^\s*fr\b/i.test(accept)
    if (prefersFrench) {
      const url = req.nextUrl.clone()
      url.pathname = '/fr'
      return NextResponse.redirect(url, 307)
    }
  }

  // English: serve the bare URL from app/[lang] by prepending /en internally.
  const url = req.nextUrl.clone()
  url.pathname = pathname === '/' ? `/${DEFAULT_LANG}` : `/${DEFAULT_LANG}${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Everything except Next internals and static files; the function re-checks
  // anyway, so a matcher miss fails safe rather than wrong.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

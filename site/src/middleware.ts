import { NextRequest, NextResponse } from 'next/server'
import { LANG_COOKIE, isLang } from '@/lib/lang'

interface RatePolicy {
  name: string
  limit: number
  windowMs: number
}

interface RateWindow {
  count: number
  resetsAt: number
}

const RATE_STATE_MAX_ENTRIES = 10_000
const rateWindows = new Map<string, RateWindow>()

function ratePolicy(pathname: string): RatePolicy | null {
  if (pathname === '/api/v1/cohort/export') {
    return { name: 'export', limit: 4, windowMs: 60_000 }
  }
  if (pathname === '/api/v1/permalink') {
    return { name: 'permalink', limit: 10, windowMs: 60_000 }
  }
  if (/^\/api\/v1\/(?:works|recent)\/[^/]+$/.test(pathname)) {
    return { name: 'detail', limit: 60, windowMs: 60_000 }
  }
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return { name: 'api', limit: 600, windowMs: 60_000 }
  }
  return null
}

function clientAddress(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || 'unknown'
}

function rateLimit(req: NextRequest): NextResponse | null {
  if (req.method === 'OPTIONS') return null
  const policy = ratePolicy(req.nextUrl.pathname)
  if (!policy) return null

  const now = Date.now()
  const key = `${policy.name}:${clientAddress(req)}`
  const current = rateWindows.get(key)
  const window =
    current && current.resetsAt > now
      ? current
      : { count: 0, resetsAt: now + policy.windowMs }
  window.count += 1
  rateWindows.set(key, window)

  if (rateWindows.size > RATE_STATE_MAX_ENTRIES) {
    for (const [candidate, value] of rateWindows) {
      if (value.resetsAt <= now || rateWindows.size > RATE_STATE_MAX_ENTRIES) {
        rateWindows.delete(candidate)
      }
      if (rateWindows.size <= RATE_STATE_MAX_ENTRIES) break
    }
  }

  if (window.count <= policy.limit) return null
  const retryAfter = Math.max(1, Math.ceil((window.resetsAt - now) / 1_000))
  return NextResponse.json(
    { error: 'Too many requests. Try again shortly.' },
    {
      status: 429,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfter),
      },
    },
  )
}

/**
 * Language routing.
 *
 * English uses bare paths; French uses /fr. This middleware handles language
 * preference redirects. next.config.js maps known bare English pages into
 * app/[lang] and normalizes explicit /en URLs before middleware runs.
 *
 * The preference cookie redirects in exactly two cases, both explicit:
 *   1. The reader chose French earlier (cookie fr) and opens a bare URL:
 *      redirect to the /fr twin, so the choice persists across visits.
 *   2. First contact on the home page with no cookie and a French
 *      Accept-Language: redirect / to /fr. A francophone reader should not
 *      have to ask for French on this site of all sites.
 *
 * Only the language toggle sets the cookie. A shared French link must not
 * change an anglophone reader's stored preference. An explicit /fr URL is
 * always treated as an explicit request for French.
 */

/**
 * Paths the language layer must never touch. The API check matches /api and
 * /api/... but NOT /api-docs: the docs are a page and get a French twin, the
 * API payloads do not. startsWith('/api') alone would 404 /api-docs, because
 * it would reach the [lang] router unprefixed and dynamicParams=false rejects
 * 'api-docs' as a language.
 */
function isExempt(pathname: string): boolean {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.[^/]+$/.test(pathname)
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const limited = rateLimit(req)
  if (limited) return limited

  if (isExempt(pathname)) return NextResponse.next()

  // Explicit French URL: strip nothing, rewrite nothing; app/[lang] matches it.
  if (pathname === '/fr' || pathname.startsWith('/fr/')) {
    return NextResponse.next()
  }

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return NextResponse.next()
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

  return NextResponse.next()
}

export const config = {
  // Everything except Next internals and static files; the function re-checks
  // anyway, so a matcher miss fails safe rather than wrong.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

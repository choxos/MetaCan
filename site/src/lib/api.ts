import { NextResponse } from 'next/server'
import { LABEL_CATEGORIES, STUDY_DESIGNS, type WorkFilters } from '@/lib/query'

/**
 * The public API's response envelope.
 *
 * CORS is open (`*`) on purpose: this is a read-only public research dataset under
 * CC-BY, and the point of publishing it is that other people can query it from
 * their own pages without proxying through a server of their own.
 */
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const

export function json(data: unknown, init?: { status?: number; cache?: string }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      ...CORS,
      'Cache-Control': init?.cache ?? 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

export function apiError(message: string, status = 400) {
  return json({ error: message }, { status, cache: 'no-store' })
}

/** Preflight. Every route re-exports this. */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

/**
 * Parse `WorkFilters` out of a URL's query string.
 *
 * The browse page and the API MUST agree on what `?route=no_aff` means, so both
 * ultimately hand a `WorkFilters` to the same `searchWorks()`. This is the API's
 * half of that contract.
 */
export function filtersFromParams(sp: URLSearchParams): WorkFilters {
  const s = (k: string) => {
    const v = sp.get(k)
    return v !== null && v.length > 0 ? v : undefined
  }
  const num = (k: string) => {
    const v = s(k)
    if (v === undefined) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  const truthy = (k: string) => {
    const v = s(k)
    return v === '1' || v === 'true' ? true : undefined
  }
  // Tri-state: 1/true requires, 0/false excludes, absent means "any". The
  // distinction matters: `retracted=0` is a filter, an unchecked box is not.
  const tri = (k: string) => {
    const v = s(k)
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
    return undefined
  }
  const route = s('route')
  const sort = s('sort')
  const abstract = s('abstract')
  const agreement = s('agreement')
  const category = s('category')
  const design = s('design')

  return {
    q: s('q'),
    year_from: num('year_from'),
    year_to: num('year_to'),
    lang: s('lang'),
    type: s('type'),
    field: s('field'),
    topic: s('topic'),
    venue: s('venue'),
    route: (['aff', 'fund', 'venue', 'about', 'no_aff'] as const).find((r) => r === route),
    route_aff: tri('route_aff'),
    route_fund: tri('route_fund'),
    route_venue: tri('route_venue'),
    route_about: tri('route_about'),
    retracted: tri('retracted'),
    no_abstract: truthy('no_abstract'),
    abstract: (['has', 'none'] as const).find((x) => x === abstract),
    n_in: num('n_in'),
    category: (LABEL_CATEGORIES as readonly string[]).find((c) => c === category),
    design: (STUDY_DESIGNS as readonly string[]).find((d) => d === design),
    agreement: (['any', 'all'] as const).find((a) => a === agreement),
    labeled: tri('labeled'),
    sort: (['relevance', 'cited', 'year_desc', 'year_asc'] as const).find((x) => x === sort),
    page: num('page'),
    per_page: num('per_page'),
  }
}

/**
 * The same parser, over Next's `searchParams` object. The cohort page and the
 * API MUST parse identically, so the page adapts its record into
 * URLSearchParams and calls the one parser instead of growing a twin.
 */
export function filtersFromRecord(sp: Record<string, string | string[] | undefined>): WorkFilters {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') usp.set(k, v)
  }
  return filtersFromParams(usp)
}

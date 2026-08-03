import type { Metadata } from 'next'
import Link from 'next/link'
import { searchWorks, type WorkFilters } from '@/lib/query'
import { getFacets } from '@/lib/stats'
import { WorkRow } from '@/components/WorkRow'
import { Filters } from '@/components/Filters'
import { getDict } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, type Lang } from '@/lib/lang'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).meta.works, alternates: langAlternates(lang, '/works') }
}

function parse(sp: Record<string, string | string[] | undefined>): WorkFilters {
  const s = (k: string) => {
    const v = sp[k]
    return typeof v === 'string' && v.length ? v : undefined
  }
  const num = (k: string) => {
    const v = s(k)
    if (v === undefined) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  const route = s('route')
  return {
    q: s('q'),
    year_from: num('year_from'),
    year_to: num('year_to'),
    lang: s('lang'),
    type: s('type'),
    field: s('field'),
    route: (['aff', 'fund', 'venue', 'about', 'no_aff'] as const).find((r) => r === route),
    // `retracted` is tri-state in WorkFilters (false means EXCLUDE retracted),
    // so an unchecked box must be undefined, never false.
    retracted: s('retracted') === '1' ? true : undefined,
    no_abstract: s('no_abstract') === '1' ? true : undefined,
    n_in: num('n_in'),
    sort: (['cited', 'year_desc', 'year_asc'] as const).find((x) => x === s('sort')) ?? 'cited',
    page: num('page') ?? 1,
    per_page: num('per_page') ?? 25,
  }
}

export default async function Works({
  params,
  searchParams,
}: {
  params: { lang: string }
  searchParams: Record<string, string | string[] | undefined>
}) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)

  const f = parse(searchParams)
  // The filter options come from the DB, not a hardcoded list: a language or type
  // that exists in the frame but not in a literal in this file would be unfilterable.
  const [{ rows, total, page, perPage, capped }, facets] = await Promise.all([searchWorks(f), getFacets()])
  const pages = Math.ceil(total / perPage)

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...searchParams, ...over })) {
      if (v !== undefined && v !== '' && typeof v !== 'object') p.set(k, String(v))
    }
    return `?${p.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">{t.works.title}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-4)' }}>
          {t.works.sub}
        </p>
      </div>

      <Filters facets={facets} lang={lang} />

      <div className="flex items-baseline justify-between text-sm" style={{ color: 'var(--ink-4)' }}>
        <span className="tabular">
          {t.works.countWorks(capped ? t.works.countCapped : formatInt(lang, total))}
          {f.q ? t.works.matching(f.q) : null}
        </span>
        <span className="tabular">
          {!capped && pages > 0
            ? t.common.pageOf(formatInt(lang, page), formatInt(lang, pages))
            : t.common.page(formatInt(lang, page))}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: 'var(--ink-4)' }}>
          {t.works.empty}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {rows.map((w) => (
            <WorkRow key={w.id} w={w} lang={lang} />
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2">
        {page > 1 ? (
          <Link className="link text-sm" href={qs({ page: page - 1 })}>
            {t.common.previous}
          </Link>
        ) : (
          <span />
        )}
        {rows.length === perPage ? (
          <Link className="link text-sm" href={qs({ page: page + 1 })}>
            {t.common.next}
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}

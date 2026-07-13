'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LANGS, LANG_COOKIE, LANG_LABEL, type Lang } from '@/lib/lang'

/**
 * EN | FR segmented control, same design decision as the prototype's toggle:
 * with only two languages both options stay visible and the reader clicks
 * straight to the other one. French is not hidden behind an interaction,
 * which is the honest layout for a bilingual site.
 *
 * Each option is a real link to the SAME page in the other language (query
 * string preserved), so it works without JavaScript and can be opened in a
 * new tab. The click also writes the preference cookie; the middleware reads
 * it on later visits. Only this explicit click ever sets the cookie.
 */
export function LangToggle({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? '/'
  const search = useSearchParams()?.toString()
  const qs = search ? `?${search}` : ''

  // Current path without its language prefix.
  const bare = pathname === '/fr' ? '/' : pathname.startsWith('/fr/') ? pathname.slice(3) : pathname

  const hrefFor = (code: Lang) => (code === 'fr' ? (bare === '/' ? '/fr' : `/fr${bare}`) : bare) + qs

  const remember = (code: Lang) => {
    try {
      document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`
    } catch {
      // Storage refused: the switch still works, the choice just is not kept.
    }
  }

  return (
    <div
      role="group"
      aria-label={lang === 'fr' ? 'Langue' : 'Language'}
      className="inline-flex items-center overflow-hidden rounded-md border text-xs"
      style={{ background: 'var(--surface-2)' }}
    >
      {LANGS.map((code, i) => {
        const active = code === lang
        return (
          <Link
            key={code}
            href={hrefFor(code)}
            onClick={() => remember(code)}
            aria-current={active ? 'true' : undefined}
            lang={code}
            hrefLang={code === 'fr' ? 'fr-CA' : 'en-CA'}
            title={LANG_LABEL[code]}
            className="px-2 py-1.5 font-medium uppercase tracking-wider"
            style={{
              borderLeft: i > 0 ? '1px solid var(--border)' : undefined,
              background: active ? 'var(--surface-3)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-4)',
            }}
          >
            {code}
          </Link>
        )
      })}
    </div>
  )
}

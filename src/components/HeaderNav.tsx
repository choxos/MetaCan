'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface NavItem {
  href: string
  label: string
  /** Additional path prefixes (locale-relative) that count as "this section". */
  also?: string[]
}

/** Strip the /fr prefix so active-state logic works in both languages. */
function bare(pathname: string): string {
  if (pathname === '/fr') return '/'
  return pathname.startsWith('/fr/') ? pathname.slice(3) : pathname
}

function barePath(href: string): string {
  return bare(href)
}

function isActive(pathname: string, item: NavItem): boolean {
  const here = bare(pathname)
  const target = barePath(item.href)
  if (target === '/') return here === '/'
  if (here === target || here.startsWith(`${target}/`)) return true
  return (item.also ?? []).some((a) => here === a || here.startsWith(`${a}/`))
}

/**
 * The two-tier header nav, per the design: primary items as soft pills, the
 * "How this was built" group as smaller quiet links. Client-side only for the
 * active state; every item is a plain link.
 */
export function HeaderNav({ items, secondary, howBuilt }: { items: NavItem[]; secondary: NavItem[]; howBuilt: string }) {
  const pathname = usePathname() ?? '/'

  return (
    <>
      <nav className="ml-2.5 hidden gap-0.5 md:flex">
        {items.map((n) => {
          const active = isActive(pathname, n)
          return (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium"
              style={{
                background: active ? 'var(--surface-2)' : 'none',
                color: active ? 'var(--ink)' : 'var(--ink-3)',
              }}
            >
              {n.label}
            </Link>
          )
        })}
      </nav>
      <div className="ml-auto hidden items-baseline gap-0.5 lg:flex">
        <span className="micro-label mr-2 whitespace-nowrap" style={{ color: 'var(--ink-5)' }}>
          {howBuilt}
        </span>
        {secondary.map((n) => {
          const active = isActive(pathname, n)
          return (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded px-1.5 py-1 text-xs"
              style={{
                color: active ? 'var(--ink)' : 'var(--ink-4)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {n.label}
            </Link>
          )
        })}
      </div>
    </>
  )
}

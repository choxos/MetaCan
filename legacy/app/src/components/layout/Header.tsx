'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LangToggle } from '@/components/ui/LangToggle'
import { useLang } from '@/components/providers/LangProvider'

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useLang()

  // Built from the dictionary, so the nav switches language with everything
  // else. There is no search field: MétaCan has a pilot, not yet a corpus, and
  // a search box over nothing would be a promise the site cannot keep.
  const navigation = [
    { name: t.nav.overview, href: '/' },
    { name: t.nav.findings, href: '/findings' },
    { name: t.nav.methods, href: '/methods' },
    { name: t.nav.about, href: '/about' },
  ]

  return (
    <header
      className="sticky top-0 z-50 border-b border-border"
      style={{
        background: 'color-mix(in oklab, var(--bg) 92%, transparent)',
        backdropFilter: 'saturate(140%) blur(14px)',
        WebkitBackdropFilter: 'saturate(140%) blur(14px)',
      }}
    >
      <div className="shell flex items-center gap-8 h-[60px]">
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <span
            className="grid place-items-center mono font-bold"
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontSize: 13,
              letterSpacing: '-0.04em',
            }}
            aria-hidden
          >
            M
          </span>
          <span className="hidden sm:inline text-[14px] font-semibold tracking-[-0.015em]">
            métacan
            <span className="mx-1.5 font-normal" style={{ color: 'var(--ink-4)' }}>
              /
            </span>
            <span style={{ color: 'var(--ink-3)' }}>metaresearch</span>
          </span>
        </Link>

        <nav aria-label={t.nav.primary} className="hidden md:flex items-center gap-1 ml-auto">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors"
                style={{
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                }}
              >
                {item.name}
              </Link>
            )
          })}
          <span
            className="w-px h-[18px] mx-2"
            style={{ background: 'var(--border)' }}
            aria-hidden
          />
          <LangToggle />
          <span className="w-1" aria-hidden />
          <ThemeToggle />
        </nav>

        <div className="ml-auto md:hidden flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
          <button
            type="button"
            aria-label={t.nav.toggleNav}
            aria-expanded={mobileOpen}
            className="grid place-items-center w-8 h-8 rounded-md border"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-3)' }}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border">
          <nav aria-label={t.nav.primary} className="shell flex flex-col py-3">
            {navigation.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className="px-3 py-2 rounded-md text-[14px] font-medium"
                  style={{
                    color: active ? 'var(--ink)' : 'var(--ink-3)',
                    background: active ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}

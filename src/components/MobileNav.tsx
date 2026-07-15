'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import type { Lang } from '@/lib/lang'
import { LangToggle } from '@/components/LangToggle'
import { ThemeToggle } from '@/components/ThemeToggle'

interface NavigationItem {
  href: string
  label: string
}

interface MobileNavProps {
  primary: NavigationItem[]
  secondary: NavigationItem[]
  howBuilt: string
  menuLabel: string
  closeLabel: string
  navigationLabel: string
  lang: Lang
  themeLabel: string
}

export function MobileNav({
  primary,
  secondary,
  howBuilt,
  menuLabel,
  closeLabel,
  navigationLabel,
  lang,
  themeLabel,
}: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative ml-auto md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? closeLabel : menuLabel}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium"
        style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
      >
        {open ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
        <span>{open ? closeLabel : menuLabel}</span>
      </button>

      {open && (
        <nav
          id="mobile-navigation"
          aria-label={navigationLabel}
          className="absolute right-0 top-full mt-2 max-h-[calc(100dvh-5rem)] w-[min(20rem,calc(100vw-2.5rem))] overflow-y-auto rounded-lg border shadow-xl"
          style={{ background: 'var(--surface)' }}
        >
          <div className="grid gap-1 p-2">
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-[var(--surface-2)] hover:text-[var(--mc)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="border-t p-2">
            <p
              className="px-3 pb-1 pt-2 text-xs font-medium"
              style={{ color: 'var(--ink-4)' }}
            >
              {howBuilt}
            </p>
            <div className="grid gap-1">
              {secondary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-2)] hover:text-[var(--mc)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t px-5 py-3">
            <Suspense fallback={null}>
              <LangToggle lang={lang} />
            </Suspense>
            <ThemeToggle label={themeLabel} />
          </div>
        </nav>
      )}
    </div>
  )
}

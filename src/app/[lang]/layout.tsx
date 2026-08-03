import type { Metadata } from 'next'
import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import '@/styles/globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LangToggle } from '@/components/LangToggle'
import { HeaderNav } from '@/components/HeaderNav'
import { getDict } from '@/lib/i18n'
import { SNAPSHOT } from '@/lib/permalink'
import { LANGS, LANG_TAG, SITE_URL, isLang, langAlternates, localePath, type Lang } from '@/lib/lang'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans', weight: ['400', '500', '600'] })
const serif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['400', '500', '600'],
})
const mono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono', weight: ['400', '500', '600'] })

/**
 * The language segment. English lives at the bare path (the middleware
 * rewrites / to /en internally, so the site's public English URLs are
 * unchanged) and French lives under /fr. Anything that is not exactly 'en' or
 * 'fr' 404s loudly instead of rendering the site under a nonsense language.
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}
export const dynamicParams = false

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.titleDefault, template: t.meta.titleTemplate },
    description: t.meta.description,
    alternates: langAlternates(lang, '/'),
    openGraph: {
      type: 'website',
      locale: lang === 'fr' ? 'fr_CA' : 'en_CA',
      alternateLocale: lang === 'fr' ? 'en_CA' : 'fr_CA',
      siteName: 'MétaCan',
      title: t.meta.titleDefault,
      description: t.meta.description,
    },
  }
}

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { lang: string }
}) {
  // dynamicParams = false already 404s unknown segments; this guard keeps the
  // type honest and fails loudly if that ever changes.
  if (!isLang(params.lang)) notFound()
  const lang: Lang = params.lang
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)

  // Two tiers, per the design. The site is a TOOL first: the cohort builder,
  // the live layer, the Landscape and the API are what a meta-researcher came
  // for. The project's account of itself (the screen, the findings, the about
  // page) is kept in full but demoted to a labeled secondary group.
  const NAV = [
    { href: p('/cohort'), label: t.nav.cohort, also: ['/works'] },
    { href: p('/recent'), label: t.nav.recent },
    { href: p('/landscape'), label: t.nav.landscape },
    { href: p('/network'), label: t.nav.network },
    { href: p('/api-docs'), label: t.nav.api },
  ]
  const NAV_SECONDARY = [
    { href: p('/screen'), label: t.nav.screen },
    { href: p('/findings'), label: t.nav.findings },
    { href: p('/about'), label: t.nav.about },
  ]

  return (
    // lang is per request, from the URL, so screen readers pick the right
    // voice and a shared French link announces itself in French.
    <html
      lang={LANG_TAG[lang]}
      suppressHydrationWarning
      className={`${inter.variable} ${serif.variable} ${mono.variable}`}
    >
      <body>
        <ThemeProvider>
          <header
            className="sticky top-0 z-50 border-b"
            style={{ background: 'var(--hdr)', backdropFilter: 'blur(14px) saturate(140%)' }}
          >
            <div className="mc-container flex h-[60px] items-center gap-3 sm:gap-[18px]">
              <Link href={p('/')} className="flex items-center gap-[9px]" style={{ color: 'var(--ink)' }}>
                <Image src="/metacan-mark.svg" alt="" width={30} height={30} priority />
                <span
                  className="font-serif"
                  style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--ink)' }}
                >
                  MétaCan
                </span>
              </Link>
              <HeaderNav items={NAV} secondary={NAV_SECONDARY} howBuilt={t.nav.howBuilt} />
              <div className="ml-auto lg:ml-0 h-[18px] w-px shrink-0" style={{ background: 'var(--border)' }} />
              {/* useSearchParams inside needs a Suspense boundary on statically rendered pages. */}
              <Suspense fallback={null}>
                <LangToggle lang={lang} />
              </Suspense>
              <ThemeToggle label={t.common.toggleTheme} />
              <details className="relative md:hidden">
                <summary className="btn cursor-pointer list-none px-2.5 py-1.5">{t.common.menu}</summary>
                <nav
                  className="absolute right-0 top-full mt-2 flex w-56 flex-col rounded-md border p-2 text-sm shadow-lg"
                  style={{ background: 'var(--surface)', color: 'var(--ink-3)' }}
                  aria-label={t.common.menu}
                >
                  {[...NAV, ...NAV_SECONDARY].map((n) => (
                    <Link key={n.href} href={n.href} className="rounded px-3 py-2 hover:text-[var(--mc)]">
                      {n.label}
                    </Link>
                  ))}
                </nav>
              </details>
            </div>
          </header>

          <main className="mc-container fade-in pb-4 pt-2">{children}</main>

          <footer className="mt-16 border-t">
            <div
              className="mc-container flex flex-wrap gap-x-7 gap-y-2 pb-4 pt-6 text-xs"
              style={{ color: 'var(--ink-3)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                MétaCan
              </span>
              <span>{t.footer.data}</span>
              <span>{t.footer.code}</span>
              <span>{t.footer.snapshot(SNAPSHOT.built)}</span>
              <span className="mono-meta sm:ml-auto">metacan.xera.ac</span>
            </div>
            <div className="mc-container pb-10 text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
              <p>{t.footer.line1}</p>
              <p className="mt-1">{t.footer.line2}</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}

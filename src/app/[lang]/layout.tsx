import type { Metadata } from 'next'
import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import '@/styles/globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LangToggle } from '@/components/LangToggle'
import { getDict } from '@/lib/i18n'
import { LANGS, LANG_TAG, SITE_URL, isLang, langAlternates, localePath, type Lang } from '@/lib/lang'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })
const serif = Source_Serif_4({ subsets: ['latin'], display: 'swap', variable: '--font-serif', weight: ['400', '600'] })
const mono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono', weight: ['400', '500'] })

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

  // Two tiers, on purpose. The site is a TOOL first: the cohort builder (the
  // home page), the Landscape and the API are what a meta-researcher came for.
  // The project's account of itself (the screen, the findings, the about page)
  // is kept in full but demoted to a labelled secondary group.
  const NAV = [
    { href: p('/'), label: t.nav.cohort },
    { href: p('/landscape'), label: t.nav.landscape },
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
          <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--surface)' }}>
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3">
              <Link href={p('/')} className="flex items-baseline gap-2 font-semibold">
                <span style={{ color: 'var(--mc)' }}>Méta</span>
                <span style={{ color: 'var(--ink)', marginLeft: -8 }}>Can</span>
              </Link>
              <nav className="flex flex-1 flex-wrap items-baseline gap-4 text-sm" style={{ color: 'var(--ink-3)' }}>
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="font-medium hover:text-[var(--mc)]">
                    {n.label}
                  </Link>
                ))}
                <span className="hidden items-baseline gap-3 text-xs md:inline-flex" style={{ color: 'var(--ink-5)' }}>
                  <span>{t.nav.howBuilt}</span>
                  {NAV_SECONDARY.map((n) => (
                    <Link key={n.href} href={n.href} className="hover:text-[var(--mc)]">
                      {n.label}
                    </Link>
                  ))}
                </span>
              </nav>
              {/* useSearchParams inside needs a Suspense boundary on statically rendered pages. */}
              <Suspense fallback={null}>
                <LangToggle lang={lang} />
              </Suspense>
              <ThemeToggle label={t.common.toggleTheme} />
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>

          <footer className="mt-16 border-t py-8" style={{ background: 'var(--surface-2)' }}>
            <div className="mx-auto max-w-7xl px-5 text-sm" style={{ color: 'var(--ink-4)' }}>
              <p className="mb-2">{t.footer.line1}</p>
              <p>{t.footer.line2}</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}

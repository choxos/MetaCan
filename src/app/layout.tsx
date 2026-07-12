import type { Metadata } from 'next'
import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import '@/styles/globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })
const serif = Source_Serif_4({ subsets: ['latin'], display: 'swap', variable: '--font-serif', weight: ['400', '600'] })
const mono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono', weight: ['400', '500'] })

export const metadata: Metadata = {
  title: { default: 'MétaCan — the Canadian research frame', template: '%s · MétaCan' },
  description:
    '4,299,418 Canadian works from a pinned OpenAlex snapshot. Every record shows why it was found and why it counts as Canadian.',
}

const NAV = [
  { href: '/works', label: 'Works' },
  { href: '/screen', label: 'The screen' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/findings', label: 'Findings' },
  { href: '/api-docs', label: 'API' },
  { href: '/about', label: 'About' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <ThemeProvider>
          <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--surface)' }}>
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-3">
              <Link href="/" className="flex items-baseline gap-2 font-semibold">
                <span style={{ color: 'var(--mc)' }}>Méta</span>
                <span style={{ color: 'var(--ink)', marginLeft: -8 }}>Can</span>
              </Link>
              <nav className="flex flex-1 flex-wrap gap-4 text-sm" style={{ color: 'var(--ink-3)' }}>
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="hover:text-[var(--mc)]">
                    {n.label}
                  </Link>
                ))}
              </nav>
              <ThemeToggle />
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>

          <footer className="mt-16 border-t py-8" style={{ background: 'var(--surface-2)' }}>
            <div className="mx-auto max-w-7xl px-5 text-sm" style={{ color: 'var(--ink-4)' }}>
              <p className="mb-2">
                Every number on this site is produced by a script in{' '}
                <a className="link" href="https://github.com/choxos/CaRN-data-challenge">
                  the repository
                </a>
                , and the errors are recorded in{' '}
                <a className="link" href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md">
                  DEVIATIONS.md
                </a>
                , written before submission.
              </p>
              <p>
                Data: OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT · Data CC-BY-4.0 ·
                Ahmad Sofi-Mahmudi
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import '@/styles/globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LangProvider } from '@/components/providers/LangProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkipLink } from '@/components/layout/SkipLink'
import { siteConfig, links } from '@/lib/site'
import { findingsRaw, COMPUTED_AT, FINDINGS } from '@/data/findings'

/**
 * Three faces, doing three jobs.
 *
 * Inter carries the body at 14px/1.55. Source Serif 4 carries every heading,
 * title, and KPI number: always weight 400, always with negative tracking. That
 * is the single choice that makes this read as an academic instrument rather
 * than a SaaS dashboard, and it is why the big numbers are serif rather than a
 * bold sans. JetBrains Mono carries eyebrows, table headers, chips, IDs, and
 * counts: anything that is a label or a machine-readable token.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: siteConfig.themeColor,
}

export const metadata: Metadata = {
  title: {
    default: 'MétaCan | A map of Canadian metaresearch',
    template: '%s | MétaCan',
  },
  description:
    'An open, provenance-tracked, coverage-audited map of Canadian metaresearch. Every record shows why it was found and why it counts as Canadian, and a bilingual human audit quantifies what the pipeline missed.',

  keywords: [
    'metaresearch',
    'metascience',
    'Canadian metaresearch',
    'métarecherche',
    'research on research',
    'bibliometrics',
    'scientometrics',
    'research integrity',
    'open science',
    'science ouverte',
    'OpenAlex',
    'Érudit',
    'coverage audit',
    'retrieval sensitivity',
    'francophone scholarship',
    'reproducibility',
  ],

  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  publisher: siteConfig.author,

  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: '/',
    // No hreflang alternates are declared: EN and FR are the same URL, switched
    // client-side. Claiming per-language URLs that do not exist would be worse
    // than claiming none. If the site ever needs indexed French, the honest fix
    // is /fr routes, not a fabricated alternate.
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    alternateLocale: 'fr_CA',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: 'MétaCan: a map of Canadian metaresearch',
    description: `${FINDINGS.length} pilot analyses against OpenAlex. No topic names the field, most works carry no affiliation string, and Érudit is invisible. A bilingual audit measures what the pipeline missed.`,
  },

  twitter: {
    card: 'summary_large_image',
    title: 'MétaCan | A map of Canadian metaresearch',
    description:
      'An open, provenance-tracked, coverage-audited map of Canadian metaresearch, honest about what it cannot see.',
  },

  applicationName: siteConfig.name,
  category: 'Science & Technology',
  classification: 'Research Tool',

  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,

  other: {
    'format-detection': 'telephone=no',
  },
}

/**
 * Structured data. The measured values are read from findings.json like
 * everything else on the site: a schema.org block that drifted from the pilot
 * would be exactly the failure this project is about.
 *
 * No aggregateRating and no invented counts: fabricated structured data is a
 * policy violation and, here, a self-refuting one.
 */
function StructuredData() {
  const t = findingsRaw.topics.values
  const a = findingsRaw.affiliation_gap.values
  const l = findingsRaw.language_gap.values

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${siteConfig.url}/#author`,
    name: siteConfig.author,
    email: siteConfig.email,
    jobTitle: 'Independent researcher',
    url: links.repo,
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    author: { '@id': `${siteConfig.url}/#author` },
    inLanguage: ['en-CA', 'fr-CA'],
  }

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${siteConfig.url}/#dataset`,
    name: 'MétaCan pilot findings',
    description: `${FINDINGS.length} analyses of the retrievability of Canadian metaresearch in OpenAlex and Érudit, each regenerable from raw API responses archived in the repository.`,
    url: `${siteConfig.url}/findings`,
    creator: { '@id': `${siteConfig.url}/#author` },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    keywords: [
      'metaresearch',
      'Canada',
      'coverage audit',
      'retrieval sensitivity',
      'OpenAlex',
      'Érudit',
      'francophone scholarship',
    ],
    temporalCoverage: '2000/2025',
    spatialCoverage: 'Canada',
    inLanguage: ['en', 'fr'],
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: 'OpenAlex topics naming metaresearch as a field',
        value: t.n_topics_naming_field,
        maxValue: t.n_topics_in_taxonomy,
      },
      {
        '@type': 'PropertyValue',
        name: 'Works in the topic space with no raw affiliation string (%)',
        value: a.pct_without,
        unitText: 'PERCENT',
      },
      {
        '@type': 'PropertyValue',
        name: 'French share of Canadian metaresearch in OpenAlex (%)',
        value: l.pct_french,
        unitText: 'PERCENT',
      },
    ],
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: links.findingsJson,
    },
    dateModified: COMPUTED_AT.slice(0, 10),
    codeRepository: links.repo,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // lang is en-CA at first paint and is corrected by LangProvider once the
    // reader's stored (or browser) preference is known. suppressHydrationWarning
    // covers both that and next-themes' class swap.
    <html
      lang="en-CA"
      dir="ltr"
      suppressHydrationWarning
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <StructuredData />
      </head>
      <body>
        <ThemeProvider>
          <LangProvider>
            <SkipLink />
            <div className="min-h-screen flex flex-col">
              <Header />
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

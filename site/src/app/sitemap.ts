import type { MetadataRoute } from 'next'
import { SITE_URL, localePath } from '@/lib/lang'

/**
 * The seven navigable pages, in both languages, each declaring the other as
 * its alternate. The 4.3M work detail pages are deliberately absent: a sitemap
 * is a curation, not an enumeration, and the works are reachable through
 * /works and the API.
 */
const PAGES = ['/', '/works', '/screen', '/landscape', '/findings', '/api-docs', '/about']

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((path) =>
    (['en', 'fr'] as const).map((lang) => ({
      url: `${SITE_URL}${localePath(lang, path)}`,
      changeFrequency: 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
      alternates: {
        languages: {
          'en-CA': `${SITE_URL}${localePath('en', path)}`,
          'fr-CA': `${SITE_URL}${localePath('fr', path)}`,
        },
      },
    })),
  )
}

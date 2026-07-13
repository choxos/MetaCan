import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'
import { COMPUTED_AT } from '@/data/findings'

/**
 * Four routes. EN and FR share each URL (the language is a client-side toggle),
 * so there are no per-language entries and no `alternates` block. Declaring
 * hreflang for URLs that do not exist would be worse than declaring none.
 *
 * `lastModified` is the pilot's own timestamp, not the build time: the content
 * of this site changes when the pilot is re-run, not when the container is
 * rebuilt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(COMPUTED_AT)

  return [
    { url: siteConfig.url, lastModified, changeFrequency: 'monthly', priority: 1 },
    {
      url: `${siteConfig.url}/findings`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/methods`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/about`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]
}

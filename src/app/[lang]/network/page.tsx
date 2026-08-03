import type { Metadata } from 'next'
import { getNetworkOverview, getNetworkStats } from '@/lib/network'
import { NetworkExplorer } from '@/components/NetworkExplorer'
import { AUTHOR_LAYER } from '@/lib/permalink'
import { getDict } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, type Lang } from '@/lib/lang'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).network.title, alternates: langAlternates(lang, '/network') }
}

/**
 * The Canada-only collaboration network.
 *
 * The construction rules live in the visible text, not a methods footnote,
 * because the graph is only citable if its edges mean one stated thing:
 * nodes are researchers with a Canadian-affiliated authorship on a frame
 * work; an edge exists only where BOTH authorships on the shared work were
 * Canadian-affiliated. International collaborators are therefore invisible
 * HERE, on purpose: this page maps the in-Canada network, and the cohort
 * builder remains the place where every work, whoever wrote it, is counted.
 */
export default async function Network({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const n = (x: number) => formatInt(lang, x)

  const stats = await getNetworkStats()
  const overview = stats.available ? await getNetworkOverview() : { nodes: [], edges: [] }

  return (
    <div>
      <div className="pt-5">
        <div className="eyebrow">{t.network.eyebrow}</div>
        <h1
          className="font-serif mt-2"
          style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
        >
          {t.network.title}
        </h1>
        <p className="mt-2 max-w-[720px] text-[13px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.network.sub}
        </p>
        {stats.available && (
          <p className="mt-1.5 text-[13px]" style={{ color: 'var(--ink-3)' }}>
            <strong className="tabular">{n(stats.caAuthors)}</strong> {t.network.kpiAuthors} ·{' '}
            <strong className="tabular">{n(stats.caEdges)}</strong> {t.network.kpiEdges} ·{' '}
            <span style={{ color: 'var(--ink-4)' }}>{t.network.kpiRelease(AUTHOR_LAYER.release)}</span>
          </p>
        )}
      </div>

      <div className="mt-5">
        {stats.available ? (
          <NetworkExplorer lang={lang} overview={overview} />
        ) : (
          <div className="card p-8 text-center text-[13px]" style={{ color: 'var(--ink-4)' }}>
            {t.network.notLoaded}
          </div>
        )}
      </div>

      {/* The honesty block: what this graph is, and what it deliberately is not. */}
      <div className="callout-plain mt-6 max-w-[860px] text-xs leading-relaxed">
        {t.network.honestyNodes} {t.network.honestyEdges} {t.network.honestyWeight}{' '}
        {stats.meta &&
          t.network.honestyGuard(String(stats.meta.maxCaAuthors), n(stats.meta.worksExcluded))}{' '}
        {t.network.honestyIntl}
      </div>
    </div>
  )
}

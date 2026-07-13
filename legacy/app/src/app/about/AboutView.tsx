'use client'

import { ArrowUpRight, Mail } from 'lucide-react'
import { useLang } from '@/components/providers/LangProvider'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { links, siteConfig } from '@/lib/site'

export function AboutView() {
  const { t } = useLang()

  const linkRows: { href: string; label: string; tag: string }[] = [
    { href: links.repo, label: t.about.links.repo, tag: 'github' },
    { href: links.protocol, label: t.about.links.protocol, tag: 'PROTOCOL.md' },
    { href: links.rubric, label: t.about.links.rubric, tag: 'rubric.md' },
    { href: links.proposal, label: t.about.links.proposal, tag: 'proposal' },
    { href: links.findings, label: t.about.links.findings, tag: 'FINDINGS.md' },
    { href: links.challenge, label: t.about.links.challenge, tag: 'opensciencecanada.ca' },
  ]

  return (
    <div className="fade-in">
      <section className="shell" style={{ paddingTop: 56, paddingBottom: 8 }}>
        <div style={{ maxWidth: 820 }}>
          <Eyebrow>{t.about.eyebrow}</Eyebrow>
          <h1 className="h-page mt-2">{t.about.title}</h1>
          <p className="muted mt-5" style={{ maxWidth: '72ch', lineHeight: 1.6 }}>
            {t.about.lead}
          </p>
        </div>
      </section>

      <section className="shell pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
          {/* Left column: the argument */}
          <div className="flex flex-col gap-5">
            <div className="card card-pad prose-block">
              <h2 className="h-card mb-3">{t.about.whyTitle}</h2>
              <p>{t.about.whyBody}</p>
            </div>

            <div
              className="card card-pad prose-block"
              style={{ borderLeft: '2px solid var(--gap)' }}
            >
              <h2 className="h-card mb-3">{t.about.reflexTitle}</h2>
              <p>{t.about.reflexBody}</p>
            </div>

            <div className="card card-pad prose-block">
              <h2 className="h-card mb-3">{t.about.ethicsTitle}</h2>
              <p>{t.about.ethicsBody}</p>
            </div>
          </div>

          {/* Right column: who, and where everything lives */}
          <div className="flex flex-col gap-5">
            <div className="card">
              <div className="card-head">
                <h3>{t.about.authorTitle}</h3>
              </div>
              <div className="card-pad">
                <div
                  className="serif"
                  style={{ fontSize: 22, letterSpacing: '-0.015em', color: 'var(--ink)' }}
                >
                  {siteConfig.author}
                </div>
                <div className="muted-sm mt-1">{t.about.authorRole}</div>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="btn mt-4 w-full justify-center"
                >
                  <Mail size={13} /> {siteConfig.email}
                </a>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="card-head">
                <h3>{t.about.linksTitle}</h3>
              </div>
              <div>
                {linkRows.map((row, i) => (
                  <a
                    key={row.href}
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                    style={{
                      padding: '14px var(--pad)',
                      borderBottom:
                        i < linkRows.length - 1 ? '1px solid var(--border)' : undefined,
                      transition: 'background 0.15s var(--ease)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        style={{ color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.45 }}
                      >
                        {row.label}
                      </span>
                      <ArrowUpRight
                        size={13}
                        aria-hidden
                        style={{ color: 'var(--ink-4)', flex: '0 0 auto', marginTop: 3 }}
                      />
                    </div>
                    <span className="chip chip-plain mt-2 inline-flex" style={{ padding: 0 }}>
                      <span className="mono muted-sm">{row.tag}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="card card-pad">
              <h3 className="h-card mb-2">{t.about.citeTitle}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {t.about.citeBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="h-16" aria-hidden />
    </div>
  )
}

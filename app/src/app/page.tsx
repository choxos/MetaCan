'use client'

import Link from 'next/link'
import { ArrowRight, EyeOff } from 'lucide-react'
import { useLang } from '@/components/providers/LangProvider'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { figureText } from '@/components/ui/Figure'
import { ProportionBar } from '@/components/ui/ProportionBar'
import { FINDINGS, KPIS, LEXICON } from '@/data/findings'
import { fill, fmtInt } from '@/lib/format'
import { links } from '@/lib/site'

export default function HomePage() {
  const { t, lang } = useLang()

  return (
    <div className="fade-in">
      {/* Hero */}
      <section className="shell" style={{ paddingTop: 60, paddingBottom: 24 }}>
        <div style={{ maxWidth: 920 }}>
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <Eyebrow>{t.home.eyebrow}</Eyebrow>
            <span className="chip chip-t1">
              <span className="dot" aria-hidden />
              {t.home.live}
            </span>
          </div>

          <h1 className="h-display">
            {t.home.headA}
            <br />
            {t.home.headB}
          </h1>

          {/* The thesis. One sentence, and the whole project is downstream of it. */}
          <blockquote
            className="serif mt-8"
            style={{
              margin: 0,
              paddingLeft: 20,
              borderLeft: '2px solid var(--t1)',
              fontSize: 20,
              lineHeight: 1.45,
              letterSpacing: '-0.012em',
              color: 'var(--ink)',
              maxWidth: 760,
            }}
          >
            {t.home.thesis}
          </blockquote>

          <p
            className="mt-7 leading-[1.55]"
            style={{ fontSize: 16, color: 'var(--ink-3)', maxWidth: 720 }}
          >
            {t.home.lead}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-8">
            <Link href="/findings" className="btn btn-primary btn-lg">
              {t.common.allFindings} <ArrowRight size={14} />
            </Link>
            <Link href="/methods" className="btn btn-lg">
              {t.common.readMethods}
            </Link>
          </div>
        </div>
      </section>

      {/* KPI strip: four figures, all of them read from findings.json */}
      <section className="shell pt-12">
        <div className="mb-4">
          <Eyebrow>{t.home.kpiEyebrow}</Eyebrow>
        </div>
        <div className="stats">
          {KPIS.map((k) => {
            const copy = t.home.kpi[k.id]
            const vars: Record<string, string> = {}
            for (const [name, hero] of Object.entries(k.vars)) {
              vars[name] = figureText(hero, lang)
            }
            return (
              <div className="stat" key={k.id}>
                <div className="stat-label">{copy.label}</div>
                <div
                  className="stat-value num"
                  style={k.tone === 'gap' ? { color: 'var(--gap)' } : undefined}
                >
                  {figureText(k.hero, lang)}
                </div>
                <div className="stat-trend up">{fill(copy.note, vars)}</div>
              </div>
            )
          })}
        </div>
        <p className="muted-sm mt-3" style={{ maxWidth: '78ch' }}>
          {t.home.kpiNote}
        </p>
      </section>

      {/* The findings, as cards. However many there now are. */}
      <section className="shell pt-16">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div style={{ maxWidth: 720 }}>
            <Eyebrow>
              {fill(t.home.findingsEyebrow, { n: fmtInt(FINDINGS.length, lang) })}
            </Eyebrow>
            <h2 className="h-section mt-1.5">{t.home.findingsTitle}</h2>
            <p className="muted mt-3" style={{ maxWidth: '68ch' }}>
              {t.home.findingsLead}
            </p>
          </div>
          <Link href="/findings" className="btn btn-ghost" style={{ color: 'var(--t1)' }}>
            {t.home.seeAll} <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FINDINGS.map((f) => {
            const copy = t.findings.items[f.id]
            return (
              <Link
                key={f.id}
                href={`/findings#${f.id}`}
                className="card card-pad flex flex-col"
                style={{ transition: 'border-color 0.15s var(--ease)' }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <Eyebrow>
                    {String(f.n).padStart(2, '0')} / {String(FINDINGS.length).padStart(2, '0')}
                  </Eyebrow>
                  <span className="mono muted-sm">{f.script}</span>
                </div>

                <div
                  className="serif num mt-3"
                  style={{
                    fontSize: 36,
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                  }}
                >
                  {figureText(f.hero, lang)}
                </div>

                <h3
                  className="mt-2 mb-4"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: 'var(--ink)',
                    lineHeight: 1.35,
                  }}
                >
                  {copy.title}
                </h3>

                <div className="mt-auto">
                  <ProportionBar
                    bar={f.bar}
                    lang={lang}
                    foundLabel={copy.found}
                    missedLabel={copy.missed}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* What we cannot see. The amber section. */}
      <section className="shell pt-16">
        <div className="banner mb-5">
          <span className="banner-tag">{t.home.gapTag}</span>
          <span style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}>
            {t.home.gapLead}
          </span>
        </div>

        <div className="card overflow-hidden">
          <div className="card-head flex-wrap gap-3" style={{ padding: '18px 24px' }}>
            <div>
              <Eyebrow>{t.home.gapEyebrow}</Eyebrow>
              <h2
                className="serif font-normal mt-1 m-0 flex items-center gap-2.5"
                style={{ fontSize: 26, letterSpacing: '-0.018em', color: 'var(--ink)' }}
              >
                <EyeOff size={20} style={{ color: 'var(--gap)' }} aria-hidden />
                {t.home.gapTitle}
              </h2>
            </div>
          </div>

          <ul className="card-pad" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {t.home.gapItems.map((item, i) => (
              <li
                key={i}
                className="flex gap-4"
                style={{
                  padding: '16px var(--pad)',
                  borderBottom:
                    i < t.home.gapItems.length - 1 ? '1px solid var(--border)' : undefined,
                }}
              >
                <span
                  className="mono num"
                  aria-hidden
                  style={{
                    color: 'var(--gap)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    paddingTop: 3,
                    flex: '0 0 auto',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>{item}</span>
              </li>
            ))}
          </ul>

          {/* The lexicon comparison, straight from finding 4. Two numbers that
              make the francophone gap concrete rather than rhetorical. */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}
          >
            {[
              { label: 'lexicon_en → CA', value: LEXICON.en, tone: 'var(--t1)' },
              { label: 'lexicon_fr → CA', value: LEXICON.fr, tone: 'var(--gap)' },
              { label: 'lexicon_fr → world', value: LEXICON.frWorld, tone: 'var(--ink-3)' },
            ].map((cell, i) => (
              <div
                key={cell.label}
                style={{
                  padding: '16px 24px',
                  borderRight: i < 2 ? '1px solid var(--border)' : undefined,
                }}
              >
                <div className="mono muted-sm">{cell.label}</div>
                <div
                  className="serif num mt-1"
                  style={{ fontSize: 24, letterSpacing: '-0.015em', color: cell.tone }}
                >
                  {fmtInt(cell.value, lang)}
                </div>
              </div>
            ))}
          </div>

          <div
            className="card-pad"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <p style={{ color: 'var(--ink-3)', margin: 0, maxWidth: '72ch' }}>
              {t.home.gapClosing}
            </p>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="shell pt-16">
        <div
          className="card overflow-hidden"
          style={{ background: '#0F171B', color: '#EEF3F4', border: 'none' }}
        >
          <div
            className="grid items-center gap-8 grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr]"
            style={{ padding: 36 }}
          >
            <div>
              <div
                className="mono uppercase mb-2"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {t.home.ctaEyebrow}
              </div>
              <h3
                className="serif font-normal m-0"
                style={{ fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.02em' }}
              >
                {t.home.ctaTitle.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i === 0 && <br />}
                  </span>
                ))}
              </h3>
              <a
                href={links.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="mono inline-flex items-center gap-1.5 mt-4"
                style={{ fontSize: 12, color: 'var(--metacan-light)' }}
              >
                {t.common.repository} <ArrowRight size={12} />
              </a>
            </div>
            {t.home.ctaItems.map((b) => (
              <div
                key={b.k}
                style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: 20 }}
              >
                <div
                  className="mono uppercase"
                  style={{ fontSize: 11, letterSpacing: '0.08em', opacity: 0.55 }}
                >
                  {b.k}
                </div>
                <div className="mono mt-1.5" style={{ fontSize: 14 }}>
                  {b.v}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{b.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-16" aria-hidden />
    </div>
  )
}

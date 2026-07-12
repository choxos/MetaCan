'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useLang } from '@/components/providers/LangProvider'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { figureText } from '@/components/ui/Figure'
import { Pill } from '@/components/ui/Pill'
import type { PillTone } from '@/components/ui/pill-tone'
import { CORRECTIONS, ERUDIT, findingsRaw } from '@/data/findings'
import { fill, fmtInt } from '@/lib/format'
import { links } from '@/lib/site'

/** The rubric's four verdicts, in rubric order, with their design-system tone. */
const TIER_TONES: readonly PillTone[] = ['t1', 't2', 't3', 'default']

export function MethodsView() {
  const { t, lang } = useLang()
  const cr = findingsRaw.capture_recapture_fails.values

  return (
    <div className="fade-in">
      <section className="shell" style={{ paddingTop: 56, paddingBottom: 8 }}>
        <div style={{ maxWidth: 820 }}>
          <Eyebrow>{t.methods.eyebrow}</Eyebrow>
          <h1 className="h-page mt-2">{t.methods.title}</h1>
          <p className="muted mt-5" style={{ maxWidth: '72ch', lineHeight: 1.6 }}>
            {t.methods.lead}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-6">
            <a
              href={links.protocol}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              PROTOCOL.md <ArrowUpRight size={13} />
            </a>
            <a
              href={links.rubric}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              rubric.md <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* 1. The estimand */}
      <Section eyebrow="01" title={t.methods.estimandTitle} lead={t.methods.estimandLead}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Panel
            tone="t1"
            kicker={t.methods.estimandPrimary}
            body={t.methods.estimandPrimaryBody}
          />
          <Panel
            tone="t2"
            kicker={t.methods.estimandSecondary}
            body={t.methods.estimandSecondaryBody}
          />
        </div>
        <div className="mt-5">
          <Panel
            tone="t3"
            kicker={t.methods.estimandDescriptive}
            body={t.methods.estimandDescriptiveBody}
          />
        </div>
        <p className="muted mt-5" style={{ maxWidth: '74ch' }}>
          {t.methods.estimandAlts}
        </p>
      </Section>

      {/* 2. The frame */}
      <Section eyebrow="02" title={t.methods.frameTitle} lead={t.methods.frameLead}>
        <div className="card overflow-hidden">
          <dl className="m-0">
            <FrameRow term={t.methods.frameSources} def={t.methods.frameSourcesBody}>
              <a
                href={ERUDIT.endpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="chip chip-t1 mt-2 inline-flex"
              >
                {ERUDIT.endpoint}
              </a>
              <span className="chip mt-2 ml-2 inline-flex">
                {fmtInt(ERUDIT.sets, lang)} sets · {ERUDIT.earliest}
              </span>
            </FrameRow>
            <FrameRow term={t.methods.frameWindow} def={t.methods.frameWindowBody} />
            <FrameRow term={t.methods.frameMembership} def={t.methods.frameMembershipBody} last />
          </dl>
        </div>
        <div className="banner banner-t1 mt-5">
          <span className="banner-tag">F</span>
          <span style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {t.methods.frameWhy}
          </span>
        </div>
      </Section>

      {/* 3. The routes */}
      <Section eyebrow="03" title={t.methods.routesTitle} lead={t.methods.routesLead}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {t.methods.routes.map((r) => (
            <div key={r.id} className="card card-pad">
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  className="mono grid place-items-center"
                  style={{
                    width: 30,
                    height: 22,
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--t1)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  {r.id}
                </span>
                <h3 className="h-card">{r.name}</h3>
              </div>
              <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. The tiers */}
      <Section eyebrow="04" title={t.methods.tiersTitle} lead={t.methods.tiersLead}>
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Tier</th>
                <th style={{ width: 220 }}>Label</th>
                <th>Definition</th>
              </tr>
            </thead>
            <tbody>
              {t.methods.tiers.map((tier, i) => (
                <tr key={tier.id}>
                  <td>
                    <Pill tone={TIER_TONES[i] ?? 'default'} showDot>
                      {tier.id}
                    </Pill>
                  </td>
                  <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{tier.name}</td>
                  <td className="muted" style={{ lineHeight: 1.55 }}>
                    {tier.body}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="h-section mt-10 mb-4" style={{ fontSize: 22 }}>
          {t.methods.errorsTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {t.methods.errors.map((err, i) => (
            <div key={err.name} className="card card-pad">
              <div
                className="mono num mb-2"
                style={{
                  color: 'var(--gap)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <h4 className="h-card mb-2">{err.name}</h4>
              <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
                {err.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. The audit */}
      <Section eyebrow="05" title={t.methods.auditTitle} lead={t.methods.auditLead}>
        <div className="card overflow-hidden">
          {t.methods.auditSteps.map((s, i) => (
            <div
              key={s.n}
              className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)]"
              style={{
                borderBottom:
                  i < t.methods.auditSteps.length - 1 ? '1px solid var(--border)' : undefined,
              }}
            >
              <div
                style={{
                  padding: '20px 24px',
                  background: 'var(--surface-2)',
                  borderRight: '1px solid var(--border)',
                }}
              >
                <div className="h-eyebrow">{s.n}</div>
                <div
                  className="serif mt-1"
                  style={{ fontSize: 17, letterSpacing: '-0.01em', color: 'var(--ink)' }}
                >
                  {s.name}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <p className="muted" style={{ margin: 0, lineHeight: 1.6, maxWidth: '74ch' }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Why capture–recapture was cut. The amber section: this is the
            project's most consequential negative result. */}
        <div className="card overflow-hidden mt-5">
          <div
            className="card-head flex-wrap gap-3"
            style={{
              padding: '16px 24px',
              background: 'color-mix(in oklab, var(--gap) 7%, var(--surface))',
              borderBottom: '1px solid color-mix(in oklab, var(--gap) 25%, var(--border))',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="banner-tag">
                {cr.estimator_void ? 'estimator_void = true' : 'estimator_void = false'}
              </span>
              <h3
                className="serif font-normal m-0"
                style={{ fontSize: 20, letterSpacing: '-0.015em', color: 'var(--ink)' }}
              >
                {t.methods.crTitle}
              </h3>
            </div>
          </div>

          <div
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {[
              { k: 'route1_topic', v: cr.route1_topic, tone: 'var(--ink)' },
              { k: 'route2_naive_lexical', v: cr.route2_naive_lexical, tone: 'var(--ink)' },
              { k: 'observed_union', v: cr.observed_union, tone: 'var(--t1)' },
              {
                k: 'lincoln_petersen_estimate',
                v: cr.lincoln_petersen_estimate,
                tone: 'var(--gap)',
              },
            ].map((cell, i) => (
              <div
                key={cell.k}
                style={{
                  padding: '18px 20px',
                  borderRight: i < 3 ? '1px solid var(--border)' : undefined,
                  borderTop: i > 1 ? undefined : undefined,
                }}
              >
                <div className="mono muted-sm" style={{ wordBreak: 'break-word' }}>
                  {cell.k}
                </div>
                <div
                  className="serif num mt-1"
                  style={{ fontSize: 26, letterSpacing: '-0.018em', color: cell.tone }}
                >
                  {fmtInt(cell.v, lang)}
                </div>
              </div>
            ))}
          </div>

          <div className="card-pad" style={{ padding: '20px 24px' }}>
            <p className="muted" style={{ margin: 0, lineHeight: 1.6, maxWidth: '78ch' }}>
              {t.methods.crBody}
            </p>
          </div>
        </div>
      </Section>

      {/* 6. Corrections.

          The protocol (§9) requires every departure to be recorded with a reason
          and a date, because silent revision is itself a research-integrity
          failure. DEVIATIONS.md is that record; this is its public face.

          It is a numbered section of the method, not an appendix and not a
          footnote, and it is written in the same voice as everything above it. A
          project whose entire thesis is MEASURE WHAT YOU MISSED, and which then
          tidied away its own misses, would be refuting itself in public. Six
          entries, one line each, every figure read from findings.json including
          the ones being retracted. It should read as rigour. It is not an
          apology, and it is not decorated as one. */}
      <section className="shell pt-14" id="corrections" style={{ scrollMarginTop: 80 }}>
        <div className="mb-6" style={{ maxWidth: 820 }}>
          <Eyebrow>06</Eyebrow>
          <h2 className="h-section mt-1.5">{t.methods.correctionsTitle}</h2>
          <p className="muted mt-3" style={{ maxWidth: '72ch', lineHeight: 1.6 }}>
            {t.methods.correctionsLead}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <a
              href={links.deviations}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              DEVIATIONS.md <ArrowUpRight size={13} />
            </a>
            <span className="muted-sm">{t.methods.correctionsLinkNote}</span>
          </div>
        </div>

        <div className="card overflow-hidden">
          {CORRECTIONS.map((c, i) => {
            const copy = t.methods.correctionsItems[c.id]
            const vars: Record<string, string> = {}
            for (const [name, hero] of Object.entries(c.vars)) {
              vars[name] = figureText(hero, lang)
            }
            return (
              <div
                key={c.id}
                className="grid grid-cols-1 md:grid-cols-[132px_minmax(0,1fr)]"
                style={{
                  borderBottom:
                    i < CORRECTIONS.length - 1 ? '1px solid var(--border)' : undefined,
                }}
              >
                {/* The reference: the DEVIATIONS.md entry, or the finding that
                    caught it. Kept beside the claim so a reader can go and check
                    the retraction rather than take it on trust. */}
                <div
                  style={{
                    padding: '20px 24px',
                    background: 'var(--surface-2)',
                    borderRight: '1px solid var(--border)',
                  }}
                >
                  <span
                    className="mono uppercase"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: 'var(--gap)',
                    }}
                  >
                    {t.methods.correctionsTag}
                  </span>
                  <div className="mono muted-sm mt-1">{c.ref}</div>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  <h3 className="h-card" style={{ maxWidth: '54ch' }}>
                    {copy.title}
                  </h3>
                  <p
                    className="muted mt-2"
                    style={{ margin: 0, lineHeight: 1.6, maxWidth: '74ch' }}
                  >
                    {fill(copy.body, vars)}
                  </p>
                  {c.finding && (
                    <Link
                      href={`/findings#${c.finding}`}
                      className="chip mt-3 inline-flex"
                    >
                      {t.common.seeFinding} <ArrowUpRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="banner banner-t1 mt-5">
          <span className="banner-tag">§9</span>
          <span style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {t.methods.correctionsClosing}
          </span>
        </div>
      </section>

      {/* 7. What this does not claim */}
      <section className="shell pt-14">
        <div className="banner">
          <span className="banner-tag">{t.methods.boundTitle}</span>
          <span style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {t.methods.boundBody}
          </span>
        </div>
      </section>

      <div className="h-16" aria-hidden />
    </div>
  )
}

function Section({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string
  title: string
  lead: string
  children: React.ReactNode
}) {
  return (
    <section className="shell pt-14">
      <div className="mb-6" style={{ maxWidth: 820 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="h-section mt-1.5">{title}</h2>
        <p className="muted mt-3" style={{ maxWidth: '72ch', lineHeight: 1.6 }}>
          {lead}
        </p>
      </div>
      {children}
    </section>
  )
}

function Panel({
  tone,
  kicker,
  body,
}: {
  tone: PillTone
  kicker: string
  body: string
}) {
  const toneVar =
    tone === 't1' ? 'var(--t1)' : tone === 't2' ? 'var(--t2)' : 'var(--t3)'
  return (
    <div className="card card-pad h-full" style={{ borderLeft: `2px solid ${toneVar}` }}>
      <h3 className="h-card mb-2">{kicker}</h3>
      <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
        {body}
      </p>
    </div>
  )
}

function FrameRow({
  term,
  def,
  children,
  last,
}: {
  term: string
  def: string
  children?: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)]"
      style={{ borderBottom: last ? undefined : '1px solid var(--border)' }}
    >
      <dt
        className="h-eyebrow"
        style={{
          padding: '18px 24px',
          background: 'var(--surface-2)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {term}
      </dt>
      <dd className="muted" style={{ padding: '18px 24px', margin: 0, lineHeight: 1.6 }}>
        {def}
        {children}
      </dd>
    </div>
  )
}

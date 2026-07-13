'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useLang } from '@/components/providers/LangProvider'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { figureText } from '@/components/ui/Figure'
import { ProportionBar } from '@/components/ui/ProportionBar'
import {
  FINDINGS,
  findingById,
  MISSED_BY_FIELD,
  MISSED_SHOWN,
  POLYSEMY_FINDING,
  RECALL_FINDING,
  SUPERSEDED_COVERAGE_PCT,
  type Interval,
} from '@/data/findings'
import { fill, fmtDateUtc, fmtInt, fmtPct, fmtValue } from '@/lib/format'
import { links } from '@/lib/site'
import type { Lang } from '@/lib/i18n'

const PolysemyChart = dynamic(
  () => import('@/components/charts/PolysemyChart').then((m) => m.PolysemyChart),
  {
    ssr: false,
    loading: () => <div style={{ height: 260 }} aria-hidden />,
  },
)

const MissedFieldChart = dynamic(
  () => import('@/components/charts/MissedFieldChart').then((m) => m.MissedFieldChart),
  {
    ssr: false,
    loading: () => <div style={{ height: 300 }} aria-hidden />,
  },
)

export function FindingsView() {
  const { t, lang } = useLang()

  /** "95% CI 5.6% to 21.6%", in whichever language is showing. */
  const ci = (interval: Interval, l: Lang) =>
    fill(t.findings.ci, {
      lo: figureText(interval.lo, l),
      hi: figureText(interval.hi, l),
    })

  const recallHero = figureText(RECALL_FINDING.hero, lang)

  return (
    <div className="fade-in">
      <section className="shell" style={{ paddingTop: 56, paddingBottom: 8 }}>
        <div style={{ maxWidth: 820 }}>
          <Eyebrow>{t.findings.eyebrow}</Eyebrow>
          <h1 className="h-page mt-2">
            {fill(t.findings.title, { n: fmtInt(FINDINGS.length, lang) })}
          </h1>
          <p className="muted mt-5" style={{ maxWidth: '72ch', lineHeight: 1.6 }}>
            {t.findings.lead}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-6">
            <a
              href={links.findingsJson}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              findings.json <ArrowUpRight size={13} />
            </a>
            <a href={links.pilot} target="_blank" rel="noopener noreferrer" className="btn">
              pilot/ <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* The correction.

          This site led with a number that was wrong, and the number it led with
          was the one the whole project turns on. A project whose thesis is
          "measure what you missed" does not get to quietly swap a figure and
          hope nobody diffs the repository, so the retraction is stated on the
          page, in both languages, above the findings it corrects.

          Both figures are injected: the superseded one is derived in findings.ts
          from the two quantities it wrongly divided, and the recall comes from
          the finding that replaces it. Even the number being retracted is read
          from the artefact rather than typed into a page. */}
      <section className="shell pt-8">
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--r-lg)',
            background: 'color-mix(in oklab, var(--gap) 6%, var(--surface))',
            border: '1px solid color-mix(in oklab, var(--gap) 25%, var(--border))',
          }}
        >
          <div
            className="mono uppercase"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--gap)',
              marginBottom: 6,
            }}
          >
            {t.findings.correctionTag}
          </div>
          <p
            style={{
              color: 'var(--ink-2)',
              margin: 0,
              maxWidth: '78ch',
              lineHeight: 1.55,
            }}
          >
            {fill(t.findings.correctionA, {
              a: fmtPct(SUPERSEDED_COVERAGE_PCT, lang),
            })}{' '}
            {fill(t.findings.correctionB, { b: recallHero })}
          </p>
          {/* This is one of six. The others are on /methods, beside the protocol
              clause that requires them to exist at all, so a reader who wants the
              whole ledger rather than the one figure this page leads with can have
              it in a click. */}
          <Link href="/methods#corrections" className="chip mt-3 inline-flex">
            {t.common.allCorrections} <ArrowRight size={12} />
          </Link>
        </div>
      </section>

      <section className="shell pt-10">
        <div className="flex flex-col gap-5">
          {FINDINGS.map((f) => {
            const copy = t.findings.items[f.id]
            // The finding that limits this one, if any. Resolved rather than
            // hard-coded, so the tag cannot end up citing the wrong number if the
            // pilot ever renumbers.
            const limitBy = f.limit ? findingById(f.limit.by) : undefined
            return (
              <article
                key={f.id}
                id={f.id}
                className="card overflow-hidden"
                style={{ scrollMarginTop: 80 }}
              >
                <div
                  className="card-head flex-wrap gap-3"
                  style={{ padding: '16px 24px' }}
                >
                  <div className="flex items-baseline gap-3">
                    <Eyebrow>
                      {String(f.n).padStart(2, '0')} /{' '}
                      {String(FINDINGS.length).padStart(2, '0')}
                    </Eyebrow>
                    <span className="mono muted-sm">{f.script}</span>
                  </div>
                  <span className="mono muted-sm">
                    {t.common.computed} {fmtDateUtc(f.computedAt, lang)}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
                  {/* Left: the number, the claim, the bar */}
                  <div
                    className="card-pad"
                    style={{ padding: 'var(--pad) 24px 24px' }}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                      <div
                        className="serif num"
                        style={{
                          fontSize: 48,
                          lineHeight: 1.02,
                          letterSpacing: '-0.025em',
                          color: 'var(--ink)',
                        }}
                      >
                        {figureText(f.hero, lang)}
                      </div>
                      <h2
                        className="serif"
                        style={{
                          fontSize: 22,
                          fontWeight: 400,
                          letterSpacing: '-0.015em',
                          lineHeight: 1.25,
                          color: 'var(--ink)',
                          margin: 0,
                          maxWidth: '32ch',
                        }}
                      >
                        {copy.title}
                      </h2>
                    </div>

                    {/* The interval on the hero, and any second figure that
                        belongs beside it. Finding 11 is the case that needs
                        both: a recall of 12% on nine works has a wide interval,
                        and a route with 60% precision is not merely missing the
                        field, it is also wrong about much of what it returns.
                        Reporting the point estimate alone would be the same
                        species of over-claim the correction above retracts. */}
                    {(f.heroCi || f.stats) && (
                      <div
                        className="mono flex flex-wrap items-baseline gap-x-5 gap-y-1 mt-3"
                        style={{ fontSize: 11, color: 'var(--ink-4)' }}
                      >
                        {f.heroCi && <span className="num">{ci(f.heroCi, lang)}</span>}
                        {f.stats?.map((s) => (
                          <span key={s.key}>
                            {t.findings.stat[s.key]}{' '}
                            <span className="num" style={{ color: 'var(--ink-2)' }}>
                              {figureText(s.hero, lang)}
                            </span>
                            {s.ci && <span className="num"> ({ci(s.ci, lang)})</span>}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-6" style={{ maxWidth: 620 }}>
                      <ProportionBar
                        bar={f.bar}
                        lang={lang}
                        foundLabel={copy.found}
                        missedLabel={copy.missed}
                      />
                    </div>

                    <div
                      className="mt-6 pt-5"
                      style={{ borderTop: '1px solid var(--border)' }}
                    >
                      <div className="h-eyebrow mb-2">{t.common.consequence}</div>
                      <p
                        style={{
                          color: 'var(--ink-2)',
                          margin: 0,
                          maxWidth: '70ch',
                          lineHeight: 1.55,
                        }}
                      >
                        {copy.consequence}
                      </p>
                    </div>

                    {/* A limit another finding places on this one.

                        Finding 15 says the 12% this project leads with is recall
                        against ONE machine's labels, and the other machine says 7%.
                        That belongs HERE, on the card carrying the number, and not
                        only on finding 15 where it was found. A caveat filed only
                        where it was discovered is a caveat filed where the people
                        who need it will not go.

                        Site prose, so it is translated, unlike the artefact's own
                        caveat below. The figures are still injected from the JSON. */}
                    {f.limit && limitBy && (
                      <div
                        className="mt-5"
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--r-md)',
                          background: 'var(--surface-2)',
                          borderLeft: '2px solid var(--gap)',
                          maxWidth: '78ch',
                        }}
                      >
                        <div
                          className="mono uppercase mb-1.5"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: 'var(--gap)',
                          }}
                        >
                          {fill(t.findings.limitTag, {
                            n: fmtInt(limitBy.n, lang),
                          })}
                        </div>
                        <p
                          style={{
                            color: 'var(--ink-2)',
                            margin: 0,
                            fontSize: 13,
                            lineHeight: 1.55,
                          }}
                        >
                          {fill(
                            t.findings.limit[f.limit.key],
                            Object.fromEntries(
                              Object.entries(f.limit.vars).map(([k, hero]) => [
                                k,
                                figureText(hero, lang),
                              ]),
                            ),
                          )}
                        </p>
                      </div>
                    )}

                    {/* The finding's own caveat, verbatim. Quoted rather than
                        translated, and said to be quoted: these two numbers are
                        the ones a reader is most likely to over-read, and the
                        sentence that says so is part of the pilot's output. */}
                    {f.caveat && (
                      <div
                        className="mt-5"
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--r-md)',
                          background: 'color-mix(in oklab, var(--gap) 6%, var(--surface))',
                          border:
                            '1px solid color-mix(in oklab, var(--gap) 22%, var(--border))',
                          maxWidth: '78ch',
                        }}
                      >
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span
                            className="mono uppercase"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: '0.06em',
                              color: 'var(--gap)',
                            }}
                          >
                            {t.common.caveat}
                          </span>
                          <span className="mono muted-sm">{t.common.caveatQuoted}</span>
                        </div>
                        <p
                          lang="en"
                          style={{
                            color: 'var(--ink-2)',
                            margin: 0,
                            fontSize: 13,
                            lineHeight: 1.55,
                          }}
                        >
                          {f.caveat}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: the raw values, exactly as findings.json wrote them */}
                  <div
                    style={{
                      borderLeft: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                    }}
                    className="lg:border-l"
                  >
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th style={{ background: 'var(--surface-3)' }}>
                            findings.json
                          </th>
                          <th
                            style={{
                              background: 'var(--surface-3)',
                              textAlign: 'right',
                            }}
                          >
                            {f.id}
                          </th>
                        </tr>
                      </thead>
                      {/* The raw JSON, including the figures this project has
                          withdrawn.

                          A retracted number is not deleted from the artefact and it
                          is not deleted from here either: removing the row would be
                          the tidier lie, and it would leave a reader unable to check
                          the retraction against the thing retracted. So the row
                          stays, struck through and labelled. It remains auditable;
                          it stops being assertable. No withdrawn figure appears on
                          any card face, which is enforced in findings.ts. */}
                      <tbody>
                        {f.values.map((v) => (
                          <tr key={v.key}>
                            <td
                              className="mono"
                              style={{
                                fontSize: 11,
                                color: 'var(--ink-4)',
                                padding: '9px 16px',
                                wordBreak: 'break-word',
                                textDecoration: v.withdrawn ? 'line-through' : undefined,
                              }}
                            >
                              {v.key}
                            </td>
                            <td
                              className="mono num"
                              style={{
                                fontSize: 11,
                                color: v.withdrawn ? 'var(--ink-4)' : 'var(--ink-2)',
                                padding: '9px 16px',
                                textAlign: 'right',
                                wordBreak: 'break-word',
                              }}
                            >
                              {v.withdrawn ? (
                                <>
                                  <span
                                    className="uppercase"
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 600,
                                      letterSpacing: '0.06em',
                                      color: 'var(--gap)',
                                      marginRight: 6,
                                    }}
                                  >
                                    {t.common.withdrawn}
                                  </span>
                                  <s>{fmtValue(v.value, lang)}</s>
                                </>
                              ) : (
                                fmtValue(v.value, lang)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <p className="muted-sm mt-4">{t.findings.barCaption}</p>
      </section>

      {/* Finding 11, drawn out. Placed first, and directly beneath its own card:
          it is the single most eloquent graphic the pilot produced. Every bar is
          amber because every bar is a miss, and what the bars name is the
          disciplines the missed metaresearch was filed under instead. The field
          hides inside the fields it studies. */}
      <section className="shell pt-16">
        <div className="card overflow-hidden">
          <div className="card-head flex-wrap gap-3" style={{ padding: '18px 24px' }}>
            <div>
              <Eyebrow>
                {fill(t.findings.missedEyebrow, {
                  n: fmtInt(RECALL_FINDING.n, lang),
                })}
              </Eyebrow>
              <h2
                className="serif font-normal mt-1 m-0"
                style={{ fontSize: 24, letterSpacing: '-0.015em', color: 'var(--ink)' }}
              >
                {t.findings.missedTitle}
              </h2>
            </div>
          </div>
          <div className="card-pad">
            <p className="muted mb-6" style={{ maxWidth: '72ch' }}>
              {t.findings.missedLead}
            </p>
            <MissedFieldChart lang={lang} t={t} />
            <p className="muted-sm mt-4" style={{ maxWidth: '78ch' }}>
              {fill(t.findings.missedNote, {
                n: fmtInt(MISSED_BY_FIELD.length, lang),
                a: fmtInt(MISSED_SHOWN, lang),
                b: fmtInt(RECALL_FINDING.bar.missed, lang),
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Finding 5, drawn out */}
      <section className="shell pt-16">
        <div className="card overflow-hidden">
          <div className="card-head flex-wrap gap-3" style={{ padding: '18px 24px' }}>
            <div>
              <Eyebrow>
                {fill(t.findings.chartEyebrow, {
                  n: fmtInt(POLYSEMY_FINDING.n, lang),
                })}
              </Eyebrow>
              <h2
                className="serif font-normal mt-1 m-0"
                style={{ fontSize: 24, letterSpacing: '-0.015em', color: 'var(--ink)' }}
              >
                {t.findings.chartTitle}
              </h2>
            </div>
          </div>
          <div className="card-pad">
            <p className="muted mb-6" style={{ maxWidth: '72ch' }}>
              {t.findings.chartLead}
            </p>
            <PolysemyChart lang={lang} t={t} />
          </div>
        </div>
      </section>

      <div className="h-16" aria-hidden />
    </div>
  )
}

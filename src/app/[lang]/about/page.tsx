import type { Metadata } from 'next'
import Link from 'next/link'
import raw from '@/data/findings.json'
import { getDict } from '@/lib/i18n'
import { formatInt, isLang, langAlternates, localePath, type Lang } from '@/lib/lang'
import { frFinding } from '@/lib/findings-fr'

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  return { title: getDict(lang).meta.about, alternates: langAlternates(lang, '/about') }
}

interface Finding {
  headline: string
  values: Record<string, unknown>
  computed_at_utc: string
}
const findings = raw as unknown as Record<string, Finding>

const REPO = 'https://github.com/choxos/CaRN-data-challenge'

/**
 * The method, the frame flip, and the errors.
 *
 * The errors are not an appendix here. A project whose thesis is that research maps
 * cannot be audited, published without an account of its own mistakes, would be
 * making exactly the claim it accuses others of making. So DEVIATIONS.md is linked
 * as prominently as the method.
 */
export default function About({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)

  // The three quoted limits come from findings.json; in French the checked
  // translation is used only while it still matches the artifact.
  const limitBody = (key: string): string | undefined => {
    const f = findings[key]
    if (!f) return undefined
    return (lang === 'fr' && frFinding(key, f.headline)) || f.headline
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-8">
      <section className="pt-4">
        <div className="eyebrow">{t.nav.about}</div>
        <h1
          className="font-serif mt-2.5"
          style={{ fontSize: 'clamp(28px, 3.4vw, 36px)', lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 400 }}
        >
          {t.about.title}
        </h1>
        <p className="mt-4 text-[15px] leading-[1.7]" style={{ color: 'var(--ink-2)', textWrap: 'pretty' }}>
          {t.about.intro1(formatInt(lang, 4_299_418))}
        </p>
        <p className="mt-3 text-[15px] leading-[1.7]" style={{ color: 'var(--ink-2)', textWrap: 'pretty' }}>
          {t.about.intro2}
        </p>
        <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.lead}
        </p>
      </section>

      {/* The maintainer, on the record. */}
      <section className="card flex items-center gap-4 p-5">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-white"
          style={{ background: 'linear-gradient(135deg, var(--mc), var(--teal))', fontWeight: 600, fontSize: 19, letterSpacing: '0.02em' }}
          aria-hidden="true"
        >
          AS
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
            Ahmad Sofi-Mahmudi
          </div>
          <div className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
            {t.about.role}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs" style={{ color: 'var(--mc)' }}>
            <a className="link" href="https://orcid.org/0000-0001-6829-0823" target="_blank" rel="noreferrer">
              ORCID 0000-0001-6829-0823
            </a>
            <a className="link" href="mailto:ahmad.pub@gmail.com">
              ahmad.pub@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Cite this release */}
      <section className="card overflow-hidden">
        <div className="card-head">
          <h3>{t.about.citeTitle}</h3>
        </div>
        <pre
          className="scroll-x m-0 px-5 py-4 font-mono text-xs leading-[1.7]"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
        >{`@misc{metacan2026,
  author = {Sofi-Mahmudi, Ahmad},
  title  = {MétaCan: a provenance-tracked map
            of Canadian metaresearch},
  year   = {2026},
  url    = {https://metacan.xera.ac}
}`}</pre>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">{t.about.flipTitle}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.flipP1}
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.flipP2}
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.flipP3(p)}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">{t.about.whyTitle}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.whyP1}
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.whyP2(p)}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">{t.about.limitsTitle}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.limitsLead}
        </p>
        <ul className="mt-4 space-y-4">
          <Limit title={t.about.limitAbstract} body={limitBody('abstract_cascade')} />
          <Limit title={t.about.limitRetraction} body={limitBody('retraction_record')} />
          <Limit title={t.about.limitAgreement} body={limitBody('agreement')} />
        </ul>
        <p className="mt-4 text-sm">
          <Link href={p('/findings')} className="link">
            {t.about.limitsAll}
          </Link>
        </p>
      </section>

      {/* The errors. Prominent, not buried. */}
      <section className="card p-6" style={{ borderColor: 'var(--mc)' }}>
        <h2 className="font-serif text-2xl">{t.about.errorsTitle}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.errorsP1}
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.errorsP2}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">{t.about.methodTitle}</h2>
        <dl className="mt-3 space-y-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          <Row k={t.about.methodFrameK}>{t.about.methodFrame}</Row>
          <Row k={t.about.methodScreenK}>{t.about.methodScreen}</Row>
          <Row k={t.about.methodWeightsK}>{t.about.methodWeights}</Row>
          <Row k={t.about.methodAbstractsK}>{t.about.methodAbstracts}</Row>
          <Row k={t.about.methodRetractionK}>{t.about.methodRetraction}</Row>
          <Row k={t.about.methodReproK}>{t.about.methodRepro}</Row>
        </dl>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">{t.about.sourcesTitle}</h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.about.sourcesBody}
        </p>
        <p className="mt-3 text-sm">
          <a className="link" href={REPO}>
            {t.about.repoLink}
          </a>{' '}
          ·{' '}
          <a className="link" href={`${REPO}/blob/main/DEVIATIONS.md`}>
            DEVIATIONS.md
          </a>{' '}
          ·{' '}
          <Link href={p('/api-docs')} className="link">
            {t.about.apiLink}
          </Link>
        </p>
      </section>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
        {t.about.licence}
      </p>
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="border-b pb-3 last:border-0">
      <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--mc)' }}>
        {k}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

function Limit({ title, body }: { title: string; body: string | undefined }) {
  if (!body) return null
  return (
    <li className="rounded-md p-4" style={{ background: 'var(--surface-2)' }}>
      <div className="font-medium" style={{ color: 'var(--contested)' }}>
        {title}
      </div>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        {body}
      </p>
    </li>
  )
}

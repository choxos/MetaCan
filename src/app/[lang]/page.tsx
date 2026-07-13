import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getDict } from '@/lib/i18n'
import { formatInt, formatPct, isLang, localePath, type Lang } from '@/lib/lang'

export const revalidate = 3600

/**
 * The home page leads with the frame's own argument, not with a welcome.
 *
 * The number that matters is not 4.3M works. It is the 1.57M works an
 * affiliation-only frame would never have seen, because that gap is the reason
 * this project exists and it is measured rather than asserted.
 */
async function stats() {
  const [total, noAff, noAbstract, screened, retr, eoc] = await Promise.all([
    prisma.work.count(),
    prisma.work.count({ where: { routeCaAff: false } }),
    prisma.work.count({ where: { hasAbstract: false } }),
    prisma.screened.count(),
    prisma.retraction.count(),
    prisma.retraction.count({ where: { nature: 'Expression of concern' } }),
  ])
  return { total, noAff, noAbstract, screened, retr, eoc }
}

export default async function Home({ params }: { params: { lang: string } }) {
  const lang: Lang = isLang(params.lang) ? params.lang : 'en'
  const t = getDict(lang)
  const p = (path: string) => localePath(lang, path)
  const n = (x: number) => formatInt(lang, x)

  const s = await stats()
  const pctNoAff = formatPct(lang, (s.noAff / s.total) * 100)
  const pctNoAbs = formatPct(lang, (s.noAbstract / s.total) * 100)

  return (
    <div className="space-y-12">
      <section>
        <p className="mb-3 text-xs uppercase tracking-wider" style={{ color: 'var(--mc)' }}>
          {t.home.eyebrow}
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl" style={{ maxWidth: '24ch' }}>
          {t.home.h1}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.home.lead}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.home.statFrameLabel} value={n(s.total)} note={t.home.statFrameNote} />
        <Stat
          label={t.home.statNoAffLabel}
          value={n(s.noAff)}
          note={t.home.statNoAffNote(pctNoAff)}
          tone="mc"
          href={`${p('/works')}?route=no_aff`}
        />
        <Stat
          label={t.home.statNoAbsLabel}
          value={n(s.noAbstract)}
          note={t.home.statNoAbsNote(pctNoAbs)}
          tone="contested"
          href={`${p('/works')}?no_abstract=1`}
        />
        <Stat
          label={t.home.statScreenedLabel}
          value={n(s.screened)}
          note={t.home.statScreenedNote}
          href={p('/screen')}
        />
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">{t.home.card1Title}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.home.card1P1}
        </p>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.home.card1P2(p)}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">{t.home.card2Title}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          {t.home.card2Body(n(s.retr), n(s.eoc))}
        </p>
        <Link href={`${p('/works')}?retracted=1`} className="link mt-4 inline-block text-sm">
          {t.home.card2Link}
        </Link>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  note,
  tone,
  href,
}: {
  label: string
  value: string
  note: string
  tone?: 'mc' | 'contested'
  href?: string
}) {
  const color = tone === 'mc' ? 'var(--mc)' : tone === 'contested' ? 'var(--contested)' : 'var(--ink)'
  const body = (
    <div className="card h-full p-5">
      <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>
        {label}
      </div>
      <div className="tabular mt-2 text-3xl font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="mt-2 text-xs leading-snug" style={{ color: 'var(--ink-4)' }}>
        {note}
      </div>
    </div>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

import type { Dictionary } from '@/lib/i18n'

/**
 * The provisional-scores banner. It travels with the machine scores and appears
 * ONLY on views that show them (the work detail scores block and the analytics
 * spread row), never site-wide: a warning painted on every page becomes
 * wallpaper, and this one exists to be read.
 *
 * The sentence is the contract: the scores are a BASELINE from an IMMATURE model
 * (pilot/results/maturity.json says passed = false), they order works for
 * review, and they never assert a category. No view may show a score without it.
 */
export function ScoreBanner({ t }: { t: Dictionary }) {
  return (
    <p
      role="note"
      className="rounded-md border px-4 py-3 text-sm leading-relaxed"
      style={{ borderColor: 'var(--contested)', background: 'var(--surface-2)', color: 'var(--ink-2)' }}
    >
      {t.scoreBanner.text}
    </p>
  )
}

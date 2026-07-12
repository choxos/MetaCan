'use client'

import Link from 'next/link'
import { useLang } from '@/components/providers/LangProvider'
import { appVersion, links } from '@/lib/site'
import { COMPUTED_AT } from '@/data/findings'
import { fmtDateUtc } from '@/lib/format'

export function Footer() {
  const { t, lang } = useLang()

  return (
    <footer
      className="mt-20 pt-10 pb-14 text-[12px]"
      style={{ borderTop: '1px solid var(--border)', color: 'var(--ink-3)' }}
    >
      <div className="shell flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="grid place-items-center mono font-bold"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: 'var(--ink)',
                color: 'var(--bg)',
                fontSize: 11,
                letterSpacing: '-0.04em',
              }}
              aria-hidden
            >
              M
            </span>
            <span className="font-medium" style={{ color: 'var(--ink-2)' }}>
              {t.footer.project}
            </span>
            <span className="muted-sm">· {t.footer.tagline}</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/methods" className="hover:text-ink">
              {t.footer.methodology}
            </Link>
            <Link href="/findings" className="hover:text-ink">
              {t.footer.findings}
            </Link>
            <a
              href={links.protocol}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              {t.footer.protocol}
            </a>
            <a
              href={links.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink"
            >
              {t.footer.repo}
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="muted-sm" style={{ maxWidth: '68ch' }}>
            {t.footer.sources}
          </div>
          <div className="muted-sm mono flex items-center gap-3 whitespace-nowrap">
            <span>
              {t.common.computed} {fmtDateUtc(COMPUTED_AT, lang)}
            </span>
            <span aria-hidden style={{ color: 'var(--ink-5)' }}>
              ·
            </span>
            <span>{appVersion}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

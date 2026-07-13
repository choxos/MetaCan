'use client'

import { useLang } from '@/components/providers/LangProvider'
import { LANGS, LANG_LABEL, type Lang } from '@/lib/i18n'

/**
 * EN | FR segmented control.
 *
 * A two-state segmented control rather than a cycling button (which is what the
 * theme toggle is), because with only two languages the reader should be able to
 * see which one is active and click straight to the other, not click and find
 * out. Both options are always visible, which is also the honest thing for a
 * bilingual site to do: French is not hidden behind an interaction.
 */
export function LangToggle() {
  const { lang, setLang, t, mounted } = useLang()

  return (
    <div
      role="group"
      aria-label={t.common.langLabel}
      className="inline-flex items-center overflow-hidden"
      style={{
        height: 32,
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {LANGS.map((code: Lang, i) => {
        const active = mounted && code === lang
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            lang={code}
            title={LANG_LABEL[code]}
            className="mono uppercase"
            style={{
              height: '100%',
              padding: '0 9px',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              border: 0,
              borderLeft: i > 0 ? '1px solid var(--border)' : undefined,
              background: active ? 'var(--surface-3)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-4)',
              transition: 'background 0.15s var(--ease), color 0.15s var(--ease)',
            }}
          >
            {code}
          </button>
        )
      })}
    </div>
  )
}

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_LANG,
  LANG_TAG,
  dictionaries,
  isLang,
  type Dictionary,
  type Lang,
} from '@/lib/i18n'

const STORAGE_KEY = 'metacan.lang'

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  t: Dictionary
  /** False until the stored preference has been read. See the note below. */
  mounted: boolean
}

const LangContext = createContext<LangContextValue | null>(null)

/**
 * Language state, held on the client and persisted to localStorage.
 *
 * Same shape as next-themes' handling of the theme, and for the same reason:
 * the server has no way to know the reader's stored preference, so the first
 * paint must be the default (EN) in both places or React will report a
 * hydration mismatch. The stored value is read in an effect and applied
 * immediately after mount. `mounted` is exposed so controls can avoid rendering
 * a state they are about to change.
 *
 * A cookie would let the server render FR directly and remove the flash. That
 * is the right upgrade if this ever gets meaningful francophone traffic; it is
 * deliberately not done here, because it drags in consent-banner questions that
 * a four-page static site does not otherwise have.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      // Private mode / storage disabled. Fall through to the default.
    }
    if (isLang(stored)) {
      setLangState(stored)
    } else if (typeof navigator !== 'undefined' && navigator.language.startsWith('fr')) {
      // No stored choice: honour the browser's own language. A francophone
      // reader should not have to ask for French on this site of all sites.
      setLangState('fr')
    }
    setMounted(true)
  }, [])

  // Keep <html lang> honest. Screen readers switch voice off this attribute, so
  // a French page announced as English is a real accessibility defect, not a
  // detail.
  useEffect(() => {
    document.documentElement.lang = LANG_TAG[lang]
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Non-fatal: the choice simply won't survive a reload.
    }
  }, [])

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === 'en' ? 'fr' : 'en'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Non-fatal.
      }
      return next
    })
  }, [])

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, toggle, t: dictionaries[lang], mounted }),
    [lang, setLang, toggle, mounted],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) {
    throw new Error('useLang must be used inside <LangProvider>')
  }
  return ctx
}

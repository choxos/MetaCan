'use client'

import { useLang } from '@/components/providers/LangProvider'

/**
 * The skip link has to be a client component only because its label is
 * translated. Keeping it out of layout.tsx lets the layout stay a server
 * component.
 */
export function SkipLink() {
  const { t } = useLang()
  return (
    <a href="#main" className="skip-link">
      {t.common.skipToContent}
    </a>
  )
}

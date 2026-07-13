import { ReactNode } from 'react'

interface EyebrowProps {
  children: ReactNode
  className?: string
  as?: 'span' | 'div' | 'p'
}

/**
 * Mono uppercase kicker used above section headings.
 * 11px, +0.06em tracking, ink-4 color.
 */
export function Eyebrow({ children, className = '', as = 'span' }: EyebrowProps) {
  const Component = as
  return (
    <Component className={`h-eyebrow ${className}`.trim()}>{children}</Component>
  )
}

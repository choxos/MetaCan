import { ReactNode } from 'react'
import { type PillTone, type Tier, tierTone } from './pill-tone'

export { tierTone }
export type { PillTone, Tier }

interface PillProps {
  tone?: PillTone
  showDot?: boolean
  children: ReactNode
  className?: string
}

const toneClass: Record<PillTone, string> = {
  default: 'chip',
  t1: 'chip chip-t1',
  t2: 'chip chip-t2',
  t3: 'chip chip-t3',
  gap: 'chip chip-gap',
}

export function Pill({
  tone = 'default',
  showDot = false,
  children,
  className = '',
}: PillProps) {
  return (
    <span className={`${toneClass[tone]} ${className}`.trim()}>
      {showDot && <span className="dot" aria-hidden />}
      {children}
    </span>
  )
}

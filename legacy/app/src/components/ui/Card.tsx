import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  pad?: boolean
  className?: string
}

export function Card({ children, pad = false, className = '' }: CardProps) {
  return (
    <div className={`card ${pad ? 'card-pad' : ''} ${className}`.trim()}>
      {children}
    </div>
  )
}

interface CardHeadProps {
  title: ReactNode
  meta?: ReactNode
  action?: ReactNode
}

export function CardHead({ title, meta, action }: CardHeadProps) {
  return (
    <div className="card-head">
      <div className="flex items-baseline gap-3">
        <h3>{title}</h3>
        {meta && <span className="meta">{meta}</span>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

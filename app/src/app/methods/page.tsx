import type { Metadata } from 'next'
import { MethodsView } from './MethodsView'

export const metadata: Metadata = {
  title: 'Methods',
  description:
    'The prespecified estimand, the frozen frame, the three retrieval routes, the screening rubric, and the two-phase stratified probability audit that replaces capture–recapture.',
}

export default function MethodsPage() {
  return <MethodsView />
}

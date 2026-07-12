import type { Metadata } from 'next'
import { AboutView } from './AboutView'

export const metadata: Metadata = {
  title: 'About',
  description:
    'MétaCan is a proposal to the Canadian Metaresearch Data Challenge by Ahmad Sofi-Mahmudi, an independent researcher. The pilot is complete and the repository is public.',
}

export default function AboutPage() {
  return <AboutView />
}

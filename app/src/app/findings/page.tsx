import type { Metadata } from 'next'
import { FINDINGS, findingsRaw } from '@/data/findings'
import { FindingsView } from './FindingsView'

// Every figure here is read from the data, not typed in. The count, because the
// pilot has grown twice already and a hard-coded "seven" would have been wrong
// within the hour. The recall, because this description used to end "the topic
// route retrieves about a third of the field", which was the discredited ratio,
// and a stale meta description is how a retracted number outlives its retraction
// in every search result and link preview that already cached it.
const rc = findingsRaw.topic_route_recall.values

export const metadata: Metadata = {
  title: 'Findings',
  description: `${FINDINGS.length} pilot analyses against the live OpenAlex API. No topic names the field; most works carry no affiliation string; Érudit is invisible; polysemy defeats keyword retrieval; capture–recapture is void; and the topic route finds only ${rc.recall_pct}% of the field, missing ${rc.false_negatives} of the ${rc.n_metaresearch} metaresearch works in the screened sample.`,
}

export default function FindingsPage() {
  return <FindingsView />
}

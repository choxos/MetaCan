import raw from '@/data/findings.json'
import { json, OPTIONS } from '@/lib/api'

export { OPTIONS }

/**
 * GET /api/v1/findings
 *
 * The pilot's findings.json, served verbatim. Every number quoted anywhere on this
 * site comes from this file; serving it raw means a reader can check that claim.
 */
export async function GET() {
  const findings = raw as unknown as Record<string, unknown>
  return json({
    meta: {
      count: Object.keys(findings).length,
      source: 'pilot/results/findings.json',
      note: 'Written by the pilot scripts. The site renders this file; it does not restate it.',
    },
    findings,
  })
}

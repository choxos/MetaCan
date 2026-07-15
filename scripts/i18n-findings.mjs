#!/usr/bin/env node
/**
 * Regenerate src/lib/findings-fr.ts from the generated findings and the
 * reviewed French translation store. The .metacan-app marker makes the script
 * work both inside the research checkout and at the root of the webapp branch.
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
const markers = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .filter((file) => /(^|\/)\.metacan-app$/.test(file))

if (markers.length !== 1) {
  console.error(`expected exactly one tracked .metacan-app marker, found ${markers.length}`)
  process.exit(1)
}

const app = join(repoRoot, dirname(markers[0]))
const findings = JSON.parse(readFileSync(join(app, 'src/data/findings.json'), 'utf8'))
const translations = JSON.parse(
  readFileSync(join(app, 'src/lib/findings-fr.translations.json'), 'utf8'),
)

const keys = Object.keys(findings).sort()
const missing = keys.filter((key) => !(key in translations))
const extra = Object.keys(translations).filter((key) => !(key in findings))

if (missing.length || extra.length) {
  console.error('translations out of step with findings.json', { missing, extra })
  process.exit(1)
}

let output = `import findings from '@/data/findings.json'

/**
 * French translations of the ${keys.length} finding headlines.
 *
 * Each entry records the exact English source that it translates. frFinding()
 * returns French only while that source still matches the generated artifact.
 * Regenerate this file with scripts/i18n-findings.mjs after updating the
 * reviewed translation store.
 */

interface FrFinding {
  source: string
  fr: string
}

export const FR_FINDINGS: Record<string, FrFinding> = {
`

for (const key of keys) {
  output += `  ${key}: {\n    source:\n      ${JSON.stringify(findings[key].headline)},\n    fr:\n      ${JSON.stringify(translations[key])},\n  },\n`
}

output += `}

export function frFinding(key: string, currentHeadline: string): string | null {
  const entry = FR_FINDINGS[key]
  if (!entry) return null
  return entry.source === currentHeadline ? entry.fr : null
}
`

writeFileSync(join(app, 'src/lib/findings-fr.ts'), output)
console.log(`findings-fr.ts regenerated: ${keys.length} findings`)

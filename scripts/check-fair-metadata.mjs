#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { strict as assert } from 'node:assert'

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

for (const name of ['codemeta.json', 'ro-crate-metadata.json']) {
  const root = await text(name)
  const published = await text(`public/${name}`)
  assert.equal(published, root, `${name} differs from its public copy`)
  JSON.parse(root)
}

const citation = await text('CITATION.cff')
assert.equal(await text('public/CITATION.cff'), citation, 'CITATION.cff differs from its public copy')

for (const value of [citation, await text('codemeta.json'), await text('ro-crate-metadata.json')]) {
  assert.match(value, /0000-0001-6829-0823/)
  assert.match(value, /1\.0\.0/)
  assert.doesNotMatch(value, /10\.5281\/zenodo\./)
}

console.log('FAIR metadata copies and core identifiers verified')

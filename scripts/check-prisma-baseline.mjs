#!/usr/bin/env node

import { Prisma, PrismaClient } from '@prisma/client'

const BASELINE = '20260714000000_existing_schema_baseline'
const EXPECTED_COLUMNS = {
  works: [
    'id',
    'doi',
    'title',
    'year',
    'lang',
    'type',
    'venue',
    'topic',
    'field',
    'cited_by',
    'is_retracted',
    'has_abstract',
    'route_ca_aff',
    'route_ca_fund',
    'route_ca_venue',
    'route_about_ca',
    'ca_institutions',
    'funders',
    'keywords',
  ],
  retractions: [
    'work_id',
    'nature',
    'reason',
    'retraction_date',
    'openalex_flagged',
  ],
  screened: [
    'id',
    'stratum',
    'stratum_n',
    'weight',
    'title',
    'abstract',
    'year',
    'lang',
    'type',
    'venue',
    'topic',
    'field',
    'opus_tier',
    'opus_genre',
    'opus_about_ca',
    'opus_confidence',
    'opus_reason',
    'gpt_tier',
    'gpt_genre',
    'gpt_about_ca',
    'gpt_confidence',
    'gpt_reason',
    'grok_tier',
    'grok_genre',
    'grok_about_ca',
    'grok_confidence',
    'grok_reason',
    'n_in',
  ],
  work_score: [
    'id',
    'score_opus',
    'score_gpt',
    'score_spread',
    'validation_status',
  ],
  work_label: [
    'id',
    'model',
    'categories',
    'domain',
    'study_design',
    'genre',
    'about_ca_system',
    'about_ca_topic',
    'confidence',
  ],
  classifier_model: [
    'version',
    'created_at',
    'active',
    'row_count',
    'output_hash',
    'frame_hash',
    'model_hash',
    'feature_contract_hash',
    'schema_hash',
    'score_encoding',
    'targets',
    'codex_targets',
    'gemma_targets',
    'decision_targets',
    'interpretation',
    'metadata',
  ],
  work_prediction: [
    'id',
    'classifier_version',
    'candidate_union',
    'consensus_intersection',
    'codex_scores',
    'gemma_scores',
  ],
  query_permalink: ['hash', 'filters', 'created_at'],
}

const prisma = new PrismaClient()

function fail(message) {
  console.error(`baseline preflight: ${message}`)
  process.exitCode = 1
}

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (${Prisma.join(Object.keys(EXPECTED_COLUMNS))})
  `
  const found = new Map()
  for (const row of columns) {
    const names = found.get(row.table_name) ?? new Set()
    names.add(row.column_name)
    found.set(row.table_name, names)
  }

  if (found.size === 0) {
    console.log('clean')
    return
  }

  const problems = []
  for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
    const actual = found.get(table)
    if (!actual) {
      problems.push(`missing table ${table}`)
      continue
    }
    const missing = expected.filter((column) => !actual.has(column))
    if (missing.length > 0) {
      problems.push(`table ${table} is missing columns ${missing.join(', ')}`)
    }
  }
  if (problems.length > 0) {
    fail(`partial legacy schema detected; ${problems.join('; ')}`)
    return
  }

  const [{ migrationTable }] = await prisma.$queryRaw`
    SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS "migrationTable"
  `
  if (!migrationTable) {
    console.log('needs-resolve')
    return
  }

  const rows = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at
    FROM _prisma_migrations
    WHERE migration_name = ${BASELINE}
  `
  const applied = rows.some(
    (row) => row.finished_at !== null && row.rolled_back_at === null,
  )
  console.log(applied ? 'resolved' : 'needs-resolve')
}

try {
  await main()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
} finally {
  await prisma.$disconnect()
}

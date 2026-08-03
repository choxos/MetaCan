#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Prisma, PrismaClient } from '@prisma/client'
import {
  OpenAlexClient,
  booleanSearchChunks,
  chunks,
  compileRouteLexicon,
  matchesAnyLexiconTerm,
  normaliseRecentWork,
  parseRecentDays,
  recentDateWindow,
  shortKeywordId,
  shortOpenAlexId,
} from './lib/recent-openalex.mjs'

const ROUTE_CONFIG_PATH = new URL(
  '../src/data/recent-frame-routes.json',
  import.meta.url,
)
const WORK_SELECT = [
  'id',
  'doi',
  'title',
  'publication_date',
  'publication_year',
  'language',
  'type',
  'cited_by_count',
  'is_retracted',
  'abstract_inverted_index',
  'authorships',
  'funders',
  'awards',
  'primary_location',
  'primary_topic',
  'keywords',
  'ids',
  'updated_date',
].join(',')

function loadLocalEnv(path = resolve(process.cwd(), '.env')) {
  let contents
  try {
    contents = readFileSync(path, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equal = trimmed.indexOf('=')
    if (equal < 1) continue
    const key = trimmed.slice(0, equal).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key]) continue
    let value = trimmed.slice(equal + 1).trim()
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

function help() {
  return `Usage: node scripts/sync-recent-openalex.mjs [options]

Options:
  --days N          Inclusive publication window from 15 through 30 days
  --today YYYY-MM-DD  End date for a reproducible run
  --if-stale-hours N  Skip when a successful run is newer than N hours
  --dry-run         Fetch and evaluate without writing to PostgreSQL
  --help            Show this help

Environment:
  DATABASE_URL                          Required unless --dry-run is used
  OPENALEX_API_KEY                      Required for a database-writing sync
  METACAN_RECENT_DAYS                   Default window, 15 when omitted
  METACAN_OPENALEX_MAX_PAGES_PER_QUERY  Safety limit, 2000 when omitted
  METACAN_OPENALEX_INTERVAL_MS           Delay between calls, 125 when omitted`
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    days: null,
    today: null,
    ifStaleHours: null,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help') return { ...options, showHelp: true }
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (arg === '--days' || arg === '--today' || arg === '--if-stale-hours') {
      const value = argv[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)
      if (arg === '--days') options.days = value
      else if (arg === '--today') options.today = value
      else options.ifStaleHours = value
      index += 1
      continue
    }
    if (arg.startsWith('--days=')) {
      options.days = arg.slice('--days='.length)
      continue
    }
    if (arg.startsWith('--today=')) {
      options.today = arg.slice('--today='.length)
      continue
    }
    if (arg.startsWith('--if-stale-hours=')) {
      options.ifStaleHours = arg.slice('--if-stale-hours='.length)
      continue
    }
    throw new Error(`unknown option: ${arg}`)
  }
  return options
}

function integerEnvironment(name, fallback, minimum = 0) {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer of at least ${minimum}`)
  }
  return value
}

function parseToday(value) {
  if (!value) return new Date()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('--today must use YYYY-MM-DD')
  }
  const date = new Date(`${value}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('--today must be a real calendar date')
  }
  return date
}

function routeConfig() {
  return JSON.parse(readFileSync(ROUTE_CONFIG_PATH, 'utf8'))
}

function baseFilter(window) {
  return `from_publication_date:${window.start},to_publication_date:${window.end}`
}

async function collectEntityIds(client, entity, prefix) {
  const ids = new Set()
  const metrics = await client.forEachPage(
    `/${entity}`,
    {
      filter:
        entity === 'sources'
          ? 'country_code:ca,works_count:>0'
          : 'country_code:ca',
      select: 'id',
    },
    (results) => {
      for (const result of results) {
        const id = shortOpenAlexId(result?.id, prefix)
        if (id) ids.add(id)
      }
    },
  )
  console.log(
    `${entity}: ${ids.size.toLocaleString('en-CA')} Canadian IDs across ${metrics.pages} pages`,
  )
  return ids
}

async function collectKeywordIds(client, compiledLexicon) {
  const ids = new Set()
  let pages = 0
  for (const search of booleanSearchChunks(compiledLexicon.allTerms)) {
    const metrics = await client.forEachPage(
      '/keywords',
      {
        filter: 'works_count:>0',
        search,
        select: 'id,display_name',
      },
      (results) => {
        for (const result of results) {
          if (
            !matchesAnyLexiconTerm(result?.display_name, compiledLexicon)
          ) {
            continue
          }
          const id = shortKeywordId(result?.id)
          if (id) ids.add(id)
        }
      },
    )
    pages += metrics.pages
  }
  console.log(
    `keywords: ${ids.size.toLocaleString('en-CA')} route-matching IDs across ${pages} pages`,
  )
  return ids
}

function workQuerySpecs(window, funderIds, sourceIds, keywordIds, lexicon) {
  const date = baseFilter(window)
  const specs = [
    {
      route: 'affiliation',
      params: {
        filter: `${date},authorships.institutions.country_code:ca`,
      },
    },
    {
      route: 'affiliation',
      params: { filter: `${date},authorships.countries:ca` },
    },
  ]

  for (const ids of chunks([...funderIds])) {
    const joined = ids.join('|')
    specs.push({
      route: 'funder',
      params: { filter: `${date},funders.id:${joined}` },
    })
    specs.push({
      route: 'funder',
      params: { filter: `${date},awards.funder_id:${joined}` },
    })
  }
  for (const ids of chunks([...sourceIds])) {
    specs.push({
      route: 'venue',
      params: {
        filter: `${date},primary_location.source.id:${ids.join('|')}`,
      },
    })
  }
  for (const search of booleanSearchChunks(lexicon.allTerms)) {
    specs.push({
      route: 'about Canada text',
      params: { filter: date, 'search.exact': search },
    })
  }
  for (const ids of chunks([...keywordIds])) {
    specs.push({
      route: 'about Canada keyword',
      params: { filter: `${date},keywords.id:${ids.join('|')}` },
    })
  }
  return specs
}

async function collectCandidates(client, specs) {
  const candidates = new Map()
  const metrics = new Map()

  for (const spec of specs) {
    const result = await client.forEachPage(
      '/works',
      { ...spec.params, select: WORK_SELECT },
      (rows) => {
        for (const work of rows) {
          const id = shortOpenAlexId(work?.id, 'W')
          if (id) candidates.set(id, work)
        }
      },
    )
    const prior = metrics.get(spec.route) ?? { pages: 0, rows: 0, queries: 0 }
    prior.pages += result.pages
    prior.rows += result.rows
    prior.queries += 1
    metrics.set(spec.route, prior)
  }

  for (const [route, routeMetrics] of metrics) {
    console.log(
      `${route}: ${routeMetrics.rows.toLocaleString('en-CA')} returned rows, ${routeMetrics.pages} pages, ${routeMetrics.queries} queries`,
    )
  }
  return {
    candidates,
    returnedRows: [...metrics.values()].reduce((sum, item) => sum + item.rows, 0),
  }
}

function constrainedDatabaseUrl(value) {
  const url = new URL(value)
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', '2')
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '30')
  }
  return url.toString()
}

function safeError(error) {
  let message = error instanceof Error ? error.message : String(error)
  for (const secret of [process.env.DATABASE_URL, process.env.OPENALEX_API_KEY]) {
    if (secret) message = message.replaceAll(secret, '[redacted]')
  }
  return message.slice(0, 4000)
}

export async function beginRun(prisma, window, routeVersion) {
  const staleBefore = new Date(Date.now() - 12 * 60 * 60 * 1000)
  await prisma.recentSyncRun.updateMany({
    where: { status: 'running', startedAt: { lt: staleBefore } },
    data: {
      status: 'interrupted',
      completedAt: new Date(),
      error: 'The process ended without recording completion.',
    },
  })

  try {
    return await prisma.recentSyncRun.create({
      data: {
        status: 'running',
        requestedDays: window.days,
        windowStart: new Date(`${window.start}T00:00:00.000Z`),
        windowEnd: new Date(`${window.end}T00:00:00.000Z`),
        routeVersion,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      console.log('A recent-work sync is already running; this invocation is done.')
      return null
    }
    throw error
  }
}

export async function successfulRunIsFresh(
  prisma,
  rawHours,
  window,
  routeVersion,
  now = new Date(),
) {
  if (rawHours === null) return false
  const hours = Number(rawHours)
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error('--if-stale-hours must be a non-negative number')
  }
  const last = await prisma.recentSyncRun.findFirst({
    where: {
      status: 'succeeded',
      requestedDays: window.days,
      windowStart: new Date(`${window.start}T00:00:00.000Z`),
      windowEnd: new Date(`${window.end}T00:00:00.000Z`),
      routeVersion,
    },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true },
  })
  return Boolean(
    last?.completedAt &&
      last.completedAt.getTime() >= now.getTime() - hours * 60 * 60 * 1000,
  )
}

export async function replaceWindow(
  prisma,
  run,
  window,
  works,
  apiRequests,
  returnedRows,
  candidateRows,
) {
  const start = new Date(`${window.start}T00:00:00.000Z`)
  const end = new Date(`${window.end}T00:00:00.000Z`)
  const now = new Date()
  const existingWindow = await prisma.recentWork.findMany({
    where: { publicationDate: { gte: start, lte: end } },
    select: { id: true, firstSeenAt: true },
  })
  const incomingIdChunks = chunks(
    works.map((work) => work.id),
    10_000,
  )
  const existingIncoming = []
  for (const ids of incomingIdChunks) {
    existingIncoming.push(
      ...(await prisma.recentWork.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstSeenAt: true },
      })),
    )
  }
  const firstSeen = new Map(
    [...existingWindow, ...existingIncoming].map((row) => [
      row.id,
      row.firstSeenAt,
    ]),
  )
  const data = works.map((work) => ({
    ...work,
    firstSeenAt: firstSeen.get(work.id) ?? now,
    lastSeenAt: now,
    syncedAt: now,
  }))

  await prisma.$transaction(
    async (transaction) => {
      await transaction.recentWork.deleteMany({
        where: { publicationDate: { gte: start, lte: end } },
      })
      for (const ids of incomingIdChunks) {
        await transaction.recentWork.deleteMany({ where: { id: { in: ids } } })
      }
      if (data.length > 0) await transaction.recentWork.createMany({ data })
      await transaction.recentSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'succeeded',
          completedAt: now,
          apiRequests,
          returnedRows,
          candidateRows,
          matchedRows: works.length,
          storedRows: data.length,
        },
      })
    },
    { maxWait: 10_000, timeout: 300_000 },
  )
}

async function main() {
  loadLocalEnv()
  const options = parseArgs(process.argv.slice(2))
  if (options.showHelp) {
    console.log(help())
    return
  }

  const days = parseRecentDays(
    options.days ?? process.env.METACAN_RECENT_DAYS ?? 15,
  )
  const window = recentDateWindow(days, parseToday(options.today))
  const config = routeConfig()
  const compiledLexicon = compileRouteLexicon(config)
  if (!options.dryRun && !process.env.OPENALEX_API_KEY) {
    throw new Error(
      'OPENALEX_API_KEY is required for a complete database-writing sync',
    )
  }
  const client = new OpenAlexClient({
    apiKey: process.env.OPENALEX_API_KEY,
    maxPagesPerQuery: integerEnvironment(
      'METACAN_OPENALEX_MAX_PAGES_PER_QUERY',
      2000,
      1,
    ),
    minimumIntervalMs: integerEnvironment(
      'METACAN_OPENALEX_INTERVAL_MS',
      125,
      0,
    ),
  })

  console.log(
    `MétaCan recent sync: publication dates ${window.start} through ${window.end}`,
  )
  if (!process.env.OPENALEX_API_KEY) {
    console.warn(
      'OPENALEX_API_KEY is not set. A complete dry run may exceed the anonymous daily allowance.',
    )
  }

  let prisma = null
  let run = null
  if (!options.dryRun) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
    prisma = new PrismaClient({
      datasourceUrl: constrainedDatabaseUrl(process.env.DATABASE_URL),
    })
    if (
      await successfulRunIsFresh(
        prisma,
        options.ifStaleHours,
        window,
        compiledLexicon.version,
      )
    ) {
      console.log('A recent successful run is still fresh; no API calls are needed.')
      await prisma.$disconnect()
      return
    }
    run = await beginRun(prisma, window, compiledLexicon.version)
    if (!run) {
      await prisma.$disconnect()
      return
    }
  }

  try {
    const canadianFunderIds = await collectEntityIds(client, 'funders', 'F')
    const canadianSourceIds = await collectEntityIds(client, 'sources', 'S')
    const keywordIds = await collectKeywordIds(client, compiledLexicon)
    const specs = workQuerySpecs(
      window,
      canadianFunderIds,
      canadianSourceIds,
      keywordIds,
      compiledLexicon,
    )
    const { candidates, returnedRows } = await collectCandidates(client, specs)
    const works = [...candidates.values()]
      .map((work) =>
        normaliseRecentWork(work, {
          window,
          canadianFunderIds,
          canadianSourceIds,
          compiledLexicon,
        }),
      )
      .filter(Boolean)
      .sort((left, right) => left.id.localeCompare(right.id))
    const summary = {
      window,
      route_version: compiledLexicon.version,
      api_requests: client.requestCount,
      returned_rows: returnedRows,
      unique_candidates: candidates.size,
      matched_works: works.length,
      dry_run: options.dryRun,
    }

    if (options.dryRun) {
      console.log(JSON.stringify(summary, null, 2))
      return
    }
    await replaceWindow(
      prisma,
      run,
      window,
      works,
      client.requestCount,
      returnedRows,
      candidates.size,
    )
    console.log(JSON.stringify(summary, null, 2))
  } catch (error) {
    if (prisma && run) {
      await prisma.recentSyncRun
        .update({
          where: { id: run.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            apiRequests: client.requestCount,
            error: safeError(error),
          },
        })
        .catch(() => undefined)
    }
    throw error
  } finally {
    if (prisma) await prisma.$disconnect()
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`recent sync failed: ${safeError(error)}`)
    process.exitCode = 1
  })
}

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  OpenAlexClient,
  booleanSearchChunks,
  compileRouteLexicon,
  matchesAnyLexiconTerm,
  matchesAboutCanada,
  normaliseRecentWork,
  openAlexUpdatedDate,
  parseRecentDays,
  recentDateWindow,
  reconstructAbstract,
  shortKeywordId,
} from '../lib/recent-openalex.mjs'
import {
  beginRun,
  replaceWindow,
  successfulRunIsFresh,
} from '../sync-recent-openalex.mjs'

const config = JSON.parse(
  readFileSync(
    new URL('../../src/data/recent-frame-routes.json', import.meta.url),
    'utf8',
  ),
)
const lexicon = compileRouteLexicon(config)

test('recent window accepts only 15 through 30 days', () => {
  assert.equal(parseRecentDays(15), 15)
  assert.equal(parseRecentDays('30'), 30)
  assert.throws(() => parseRecentDays(14), /15 through 30/)
  assert.throws(() => parseRecentDays(31), /15 through 30/)
  assert.throws(() => parseRecentDays(20.5), /integer/)
})

test('recent window contains the requested number of UTC dates', () => {
  assert.deepEqual(recentDateWindow(15, new Date('2026-07-15T23:30:00Z')), {
    start: '2026-07-01',
    end: '2026-07-15',
    days: 15,
  })
})

test('abstract reconstruction follows the inverted positions', () => {
  assert.equal(
    reconstructAbstract({ research: [1], Canadian: [0], frame: [2] }),
    'Canadian research frame',
  )
  assert.equal(reconstructAbstract(null), null)
})

test('about Canada matching preserves boundaries and the polysemy gate', () => {
  assert.equal(matchesAboutCanada({ title: 'A Toronto cohort' }, lexicon), true)
  assert.equal(
    matchesAboutCanada({ title: 'Deltamethrin exposure' }, lexicon),
    false,
  )
  assert.equal(matchesAboutCanada({ title: 'A river delta study' }, lexicon), false)
  assert.equal(
    matchesAboutCanada(
      {
        title: 'A Canadian survey',
        keywords: [{ display_name: 'Delta' }],
      },
      lexicon,
    ),
    true,
  )
})

test('current keyword slugs and display-name boundaries are preserved', () => {
  assert.equal(
    shortKeywordId('https://openalex.org/keywords/canada-basin'),
    'keywords/canada-basin',
  )
  assert.equal(matchesAnyLexiconTerm('Canada Basin', lexicon), true)
  assert.equal(matchesAnyLexiconTerm('Deltamethrin', lexicon), false)
})

function work(overrides = {}) {
  return {
    id: 'https://openalex.org/W12345',
    doi: 'https://doi.org/10.1000/example',
    title: 'Canadian research in 2026',
    publication_date: '2026-07-10',
    publication_year: 2026,
    language: 'en',
    type: 'article',
    cited_by_count: 3,
    is_retracted: false,
    abstract_inverted_index: { A: [0], study: [1] },
    authorships: [
      {
        countries: ['CA'],
        author: {
          id: 'https://openalex.org/A987',
          display_name: 'Ada Example',
          orcid: 'https://orcid.org/0000-0001-0000-0001',
        },
        institutions: [
          {
            id: 'https://openalex.org/I456',
            display_name: 'Example University',
            country_code: 'CA',
            ror: 'https://ror.org/012345678',
          },
        ],
      },
    ],
    funders: [
      {
        id: 'https://openalex.org/F111',
        display_name: 'Example Funder',
      },
    ],
    awards: [],
    primary_location: {
      source: {
        id: 'https://openalex.org/S222',
        display_name: 'Example Journal',
      },
    },
    primary_topic: {
      display_name: 'Research Evaluation',
      field: { display_name: 'Social Sciences' },
    },
    keywords: [{ display_name: 'Canada' }],
    ids: {
      pmid: 'https://pubmed.ncbi.nlm.nih.gov/12345678',
      pmcid: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/',
    },
    updated_date: '2026-07-12T05:31:56Z',
    ...overrides,
  }
}

test('work normalisation records routes, identifiers, authors, and affiliations', () => {
  const result = normaliseRecentWork(work(), {
    window: { start: '2026-07-01', end: '2026-07-15' },
    canadianFunderIds: new Set(['F111']),
    canadianSourceIds: new Set(['S222']),
    compiledLexicon: lexicon,
  })

  assert.ok(result)
  assert.equal(result.id, 'W12345')
  assert.equal(result.doi, '10.1000/example')
  assert.equal(result.routeCaAff, true)
  assert.equal(result.routeCaFund, true)
  assert.equal(result.routeCaVenue, true)
  assert.equal(result.routeAboutCa, true)
  assert.equal(result.pmid, '12345678')
  assert.equal(result.pmcid, 'PMC1234567')
  assert.deepEqual(result.caInstitutions, ['Example University'])
  assert.equal(result.authors[0].name, 'Ada Example')
  assert.equal(result.routeVersion, config.version)
  assert.equal(
    result.openalexUpdatedDate.toISOString(),
    '2026-07-12T00:00:00.000Z',
  )
})

test('OpenAlex update timestamps are stored as UTC dates', () => {
  assert.equal(
    openAlexUpdatedDate('2026-07-12T05:31:56Z').toISOString(),
    '2026-07-12T00:00:00.000Z',
  )
  assert.equal(openAlexUpdatedDate('not-a-date'), null)
})

test('fresh runs must match the requested window and route contract', async () => {
  let request = null
  const completedAt = new Date('2026-07-15T11:30:00Z')
  const prisma = {
    recentSyncRun: {
      findFirst: async (options) => {
        request = options
        return { completedAt }
      },
    },
  }
  const window = { start: '2026-07-01', end: '2026-07-15', days: 15 }
  assert.equal(
    await successfulRunIsFresh(
      prisma,
      1,
      window,
      'routes-v2',
      new Date('2026-07-15T12:00:00Z'),
    ),
    true,
  )
  assert.deepEqual(request.where, {
    status: 'succeeded',
    requestedDays: 15,
    windowStart: new Date('2026-07-01T00:00:00.000Z'),
    windowEnd: new Date('2026-07-15T00:00:00.000Z'),
    routeVersion: 'routes-v2',
  })
})

test('beginning a run interrupts stale work before recording its contract', async () => {
  let interrupted = null
  let created = null
  const prisma = {
    recentSyncRun: {
      updateMany: async (options) => {
        interrupted = options
      },
      create: async (options) => {
        created = options
        return { id: 12n, ...options.data }
      },
    },
  }
  const window = { start: '2026-07-01', end: '2026-07-15', days: 15 }

  const run = await beginRun(prisma, window, 'routes-v2')

  assert.equal(interrupted.where.status, 'running')
  assert.ok(interrupted.where.startedAt.lt instanceof Date)
  assert.equal(interrupted.data.status, 'interrupted')
  assert.equal(created.data.requestedDays, 15)
  assert.equal(
    created.data.windowStart.toISOString(),
    '2026-07-01T00:00:00.000Z',
  )
  assert.equal(created.data.windowEnd.toISOString(), '2026-07-15T00:00:00.000Z')
  assert.equal(created.data.routeVersion, 'routes-v2')
  assert.equal(run.id, 12n)
})

test('window replacement removes an older row whose date was corrected', async () => {
  const firstSeenAt = new Date('2026-06-01T00:00:00Z')
  const deleteCalls = []
  let inserted = null
  let completed = null
  const recentWork = {
    findMany: async ({ where }) =>
      where.id ? [{ id: 'W12345', firstSeenAt }] : [],
  }
  const transaction = {
    recentWork: {
      deleteMany: async (options) => deleteCalls.push(options),
      createMany: async ({ data }) => {
        inserted = data
      },
    },
    recentSyncRun: {
      update: async (options) => {
        completed = options
      },
    },
  }
  const prisma = {
    recentWork,
    $transaction: async (callback) => callback(transaction),
  }
  await replaceWindow(
    prisma,
    { id: 1n },
    { start: '2026-07-01', end: '2026-07-15', days: 15 },
    [{ id: 'W12345', publicationDate: new Date('2026-07-10T00:00:00Z') }],
    3,
    2,
    1,
  )
  assert.ok(
    deleteCalls.some((call) => call.where.id?.in?.includes('W12345')),
  )
  assert.equal(inserted[0].firstSeenAt, firstSeenAt)
  assert.equal(completed.data.status, 'succeeded')
})

test('window replacement never records success after an insertion failure', async () => {
  let completed = false
  const transaction = {
    recentWork: {
      deleteMany: async () => undefined,
      createMany: async () => {
        throw new Error('simulated insertion failure')
      },
    },
    recentSyncRun: {
      update: async () => {
        completed = true
      },
    },
  }
  const prisma = {
    recentWork: {
      findMany: async () => [],
    },
    $transaction: async (callback) => callback(transaction),
  }

  await assert.rejects(
    replaceWindow(
      prisma,
      { id: 1n },
      { start: '2026-07-01', end: '2026-07-15', days: 15 },
      [{ id: 'W12345', publicationDate: new Date('2026-07-10T00:00:00Z') }],
      3,
      2,
      1,
    ),
    /simulated insertion failure/,
  )
  assert.equal(completed, false)
})

test('work normalisation rejects dates outside the complete window', () => {
  assert.equal(
    normaliseRecentWork(work({ publication_date: '2026-06-30' }), {
      window: { start: '2026-07-01', end: '2026-07-15' },
      canadianFunderIds: new Set(['F111']),
      canadianSourceIds: new Set(['S222']),
      compiledLexicon: lexicon,
    }),
    null,
  )
})

test('boolean search chunks stay below the encoded URL budget', () => {
  const searches = booleanSearchChunks(lexicon.allTerms, 500)
  assert.ok(searches.length > 1)
  assert.ok(searches.every((search) => encodeURIComponent(search).length <= 500))

  const productionSearches = booleanSearchChunks(lexicon.allTerms)
  assert.ok(productionSearches.every((search) => search.length < 1500))
})

test('OpenAlex cursor paging follows the server cursor', async () => {
  const urls = []
  const client = new OpenAlexClient({
    apiKey: 'secret',
    minimumIntervalMs: 0,
    fetchImpl: async (url) => {
      urls.push(String(url))
      const cursor = new URL(url).searchParams.get('cursor')
      return Response.json({
        meta: { next_cursor: cursor === '*' ? 'next' : null },
        results: [{ id: cursor }],
      })
    },
  })
  const seen = []
  const metrics = await client.forEachPage('/works', {}, (rows) => {
    seen.push(...rows)
  })

  assert.equal(metrics.pages, 2)
  assert.equal(seen.length, 2)
  assert.equal(new URL(urls[0]).searchParams.get('api_key'), 'secret')
  assert.equal(new URL(urls[1]).searchParams.get('cursor'), 'next')
})

test('OpenAlex page safety limit fails before a partial result can be stored', async () => {
  const client = new OpenAlexClient({
    maxPagesPerQuery: 1,
    minimumIntervalMs: 0,
    fetchImpl: async () =>
      Response.json({ meta: { next_cursor: 'next' }, results: [{ id: 'W1' }] }),
  })
  await assert.rejects(
    client.forEachPage('/works', {}, () => undefined),
    /no partial result was stored/,
  )
})

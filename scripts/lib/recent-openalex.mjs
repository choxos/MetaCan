import { setTimeout as wait } from 'node:timers/promises'

export const OPENALEX_API_BASE = 'https://api.openalex.org'
export const DEFAULT_RECENT_DAYS = 30
export const MIN_RECENT_DAYS = 15
export const MAX_RECENT_DAYS = 30
export const OPENALEX_OR_LIMIT = 100

export function parseRecentDays(value = DEFAULT_RECENT_DAYS) {
  const days = Number(value)
  if (
    !Number.isInteger(days) ||
    days < MIN_RECENT_DAYS ||
    days > MAX_RECENT_DAYS
  ) {
    throw new Error(
      `days must be an integer from ${MIN_RECENT_DAYS} through ${MAX_RECENT_DAYS}`,
    )
  }
  return days
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export function recentDateWindow(days, now = new Date()) {
  const parsedDays = parseRecentDays(days)
  if (Number.isNaN(now.getTime())) throw new Error('now must be a valid date')

  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (parsedDays - 1))
  return { start: isoDate(start), end: isoDate(end), days: parsedDays }
}

export function chunks(values, size = OPENALEX_OR_LIMIT) {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('chunk size must be a positive integer')
  }
  const result = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

export function shortOpenAlexId(value, expectedPrefix) {
  if (typeof value !== 'string' || value.length === 0) return null
  const candidate = value.split('/').filter(Boolean).at(-1) ?? ''
  if (!new RegExp(`^${expectedPrefix}\\d+$`, 'i').test(candidate)) return null
  return candidate.toUpperCase()
}

export function shortKeywordId(value) {
  if (typeof value !== 'string' || !value) return null
  let path = value
  try {
    path = new URL(value).pathname
  } catch {
    path = value
  }
  const match = path.match(/(?:^|\/)keywords\/([a-z0-9][a-z0-9-]*)\/?$/i)
  return match?.[1] ? `keywords/${match[1].toLowerCase()}` : null
}

export function reconstructAbstract(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index)) return null
  const words = []
  for (const [word, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) continue
    for (const position of positions) {
      if (Number.isInteger(position) && position >= 0) words[position] = word
    }
  }
  const text = words.filter((word) => typeof word === 'string').join(' ').trim()
  return text || null
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compileTerms(terms) {
  return terms.map(
    (term) =>
      new RegExp(
        `(?:^|[^\\p{L}])(?:${escapeRegExp(term.normalize('NFC'))})(?=$|[^\\p{L}])`,
        'iu',
      ),
  )
}

export function compileRouteLexicon(config) {
  const tierA = compileTerms(config.tier_a)
  const tierB = compileTerms(config.tier_b)
  const tierC = compileTerms(config.tier_c)
  return {
    version: config.version,
    tierA,
    tierB,
    tierC,
    allExpressions: [...tierA, ...tierB, ...tierC],
    allTerms: [...config.tier_a, ...config.tier_b, ...config.tier_c],
  }
}

function anyFieldMatches(fields, expressions) {
  return fields.some((field) => {
    const text = String(field ?? '').normalize('NFC')
    return expressions.some((expression) => expression.test(text))
  })
}

function keywordNames(work) {
  if (!Array.isArray(work?.keywords)) return []
  return work.keywords
    .map((keyword) => keyword?.display_name)
    .filter((name) => typeof name === 'string' && name.length > 0)
}

export function matchesAboutCanada(work, compiledLexicon) {
  const fields = [
    work?.title,
    reconstructAbstract(work?.abstract_inverted_index),
    keywordNames(work).join(' '),
  ]
  const tierA = anyFieldMatches(fields, compiledLexicon.tierA)
  const tierB = anyFieldMatches(fields, compiledLexicon.tierB)
  const tierC = anyFieldMatches(fields, compiledLexicon.tierC) && tierA
  return tierA || tierB || tierC
}

export function matchesAnyLexiconTerm(text, compiledLexicon) {
  return anyFieldMatches([text], compiledLexicon.allExpressions)
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value))]
}

function externalId(value, prefix) {
  if (typeof value !== 'string') return null
  const match = value.match(new RegExp(`(${prefix}\\d+|\\d+)/?$`, 'i'))
  if (!match?.[1]) return null
  return prefix ? match[1].toUpperCase() : match[1]
}

function canadianAuthorships(work) {
  const authors = new Map()
  const institutionNames = []
  let hasCanadianAffiliation = false

  for (const authorship of Array.isArray(work?.authorships)
    ? work.authorships
    : []) {
    const institutions = (Array.isArray(authorship?.institutions)
      ? authorship.institutions
      : []
    ).filter(
      (institution) =>
        String(institution?.country_code ?? '').toUpperCase() === 'CA',
    )
    const countries = Array.isArray(authorship?.countries)
      ? authorship.countries.map((country) => String(country).toUpperCase())
      : []
    if (institutions.length === 0 && !countries.includes('CA')) continue
    hasCanadianAffiliation = true

    const authorId = shortOpenAlexId(authorship?.author?.id, 'A')
    const name =
      typeof authorship?.author?.display_name === 'string'
        ? authorship.author.display_name
        : null
    if (!authorId && !name) continue

    const affiliations = institutions
      .map((institution) => {
        const institutionId = shortOpenAlexId(institution?.id, 'I')
        const institutionName =
          typeof institution?.display_name === 'string'
            ? institution.display_name
            : null
        if (institutionName) institutionNames.push(institutionName)
        if (!institutionId && !institutionName) return null
        return {
          id: institutionId,
          name: institutionName,
          ror:
            typeof institution?.ror === 'string' ? institution.ror : null,
        }
      })
      .filter(Boolean)

    const key = authorId ?? name
    const prior = authors.get(key)
    const merged = prior
      ? uniqueAffiliations([...prior.institutions, ...affiliations])
      : uniqueAffiliations(affiliations)
    authors.set(key, {
      id: authorId,
      name,
      orcid:
        typeof authorship?.author?.orcid === 'string'
          ? authorship.author.orcid
          : null,
      institutions: merged,
    })
  }

  return {
    authors: [...authors.values()],
    institutionNames: uniqueStrings(institutionNames).sort((a, b) =>
      a.localeCompare(b),
    ),
    hasCanadianAffiliation,
  }
}

function uniqueAffiliations(affiliations) {
  const seen = new Map()
  for (const affiliation of affiliations) {
    if (!affiliation) continue
    const key = affiliation.id ?? affiliation.name
    if (key) seen.set(key, affiliation)
  }
  return [...seen.values()]
}

function stripDoi(value) {
  if (typeof value !== 'string' || !value) return null
  return value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
}

function validDateInWindow(value, start, end) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= start &&
    value <= end
  )
}

export function openAlexUpdatedDate(value) {
  if (typeof value !== 'string' || value.length === 0) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  )
}

export function normaliseRecentWork(work, context) {
  const id = shortOpenAlexId(work?.id, 'W')
  const title = typeof work?.title === 'string' ? work.title.trim() : ''
  const publicationDate = work?.publication_date
  if (
    !id ||
    !title ||
    !validDateInWindow(
      publicationDate,
      context.window.start,
      context.window.end,
    )
  ) {
    return null
  }

  const { authors, institutionNames, hasCanadianAffiliation } =
    canadianAuthorships(work)
  const routeCaAff = hasCanadianAffiliation

  const funderIds = uniqueStrings([
    ...(Array.isArray(work?.funders)
      ? work.funders.map((funder) => shortOpenAlexId(funder?.id, 'F'))
      : []),
    ...(Array.isArray(work?.awards)
      ? work.awards.map((award) => shortOpenAlexId(award?.funder_id, 'F'))
      : []),
  ])
  const routeCaFund = funderIds.some((funderId) =>
    context.canadianFunderIds.has(funderId),
  )

  const venueId = shortOpenAlexId(work?.primary_location?.source?.id, 'S')
  const routeCaVenue = venueId
    ? context.canadianSourceIds.has(venueId)
    : false
  const routeAboutCa = matchesAboutCanada(work, context.compiledLexicon)

  if (!routeCaAff && !routeCaFund && !routeCaVenue && !routeAboutCa) {
    return null
  }

  const abstract = reconstructAbstract(work?.abstract_inverted_index)
  const funderNames = uniqueStrings([
    ...(Array.isArray(work?.funders)
      ? work.funders.map((funder) => funder?.display_name)
      : []),
    ...(Array.isArray(work?.awards)
      ? work.awards.map((award) => award?.funder_display_name)
      : []),
  ]).sort((a, b) => a.localeCompare(b))

  return {
    id,
    doi: stripDoi(work?.doi),
    title,
    publicationDate: new Date(`${publicationDate}T00:00:00.000Z`),
    year:
      Number.isInteger(work?.publication_year) && work.publication_year >= 0
        ? work.publication_year
        : Number(publicationDate.slice(0, 4)),
    lang: typeof work?.language === 'string' ? work.language : null,
    type: typeof work?.type === 'string' ? work.type : null,
    venue:
      typeof work?.primary_location?.source?.display_name === 'string'
        ? work.primary_location.source.display_name
        : null,
    topic:
      typeof work?.primary_topic?.display_name === 'string'
        ? work.primary_topic.display_name
        : null,
    field:
      typeof work?.primary_topic?.field?.display_name === 'string'
        ? work.primary_topic.field.display_name
        : null,
    citedBy: Number.isInteger(work?.cited_by_count) ? work.cited_by_count : 0,
    isRetracted: work?.is_retracted === true,
    hasAbstract: abstract !== null,
    abstract,
    pmid: externalId(work?.ids?.pmid, ''),
    pmcid: externalId(work?.ids?.pmcid, 'PMC'),
    routeCaAff,
    routeCaFund,
    routeCaVenue,
    routeAboutCa,
    caInstitutions: institutionNames,
    funders: funderNames,
    keywords: keywordNames(work),
    authors,
    openalexUpdatedDate: openAlexUpdatedDate(work?.updated_date),
    routeVersion: context.compiledLexicon.version,
    sourceWindowStart: new Date(`${context.window.start}T00:00:00.000Z`),
    sourceWindowEnd: new Date(`${context.window.end}T00:00:00.000Z`),
  }
}

function quotedTerm(term) {
  return `"${term.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function booleanSearchChunks(terms, maxEncodedLength = 1800) {
  const groups = []
  let current = []

  for (const term of uniqueStrings(terms)) {
    const next = [...current, quotedTerm(term)]
    const query = `(${next.join(' OR ')})`
    if (current.length > 0 && encodeURIComponent(query).length > maxEncodedLength) {
      groups.push(`(${current.join(' OR ')})`)
      current = [quotedTerm(term)]
    } else {
      current = next
    }
  }
  if (current.length > 0) groups.push(`(${current.join(' OR ')})`)
  return groups
}

function safeUrl(url) {
  const copy = new URL(url)
  if (copy.searchParams.has('api_key')) copy.searchParams.set('api_key', '[redacted]')
  return copy.toString()
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response.headers.get('retry-after'))
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, 60_000)
  }
  return Math.min(750 * 2 ** attempt, 30_000)
}

function retryWouldCrossDailyReset(response) {
  const retryAfter = Number(response.headers.get('retry-after'))
  return response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 60
}

export class OpenAlexClient {
  constructor({
    apiKey,
    fetchImpl = fetch,
    maxPagesPerQuery = 2000,
    minimumIntervalMs = 125,
    maxRetries = 5,
  } = {}) {
    this.apiKey = apiKey || null
    this.fetchImpl = fetchImpl
    this.maxPagesPerQuery = maxPagesPerQuery
    this.minimumIntervalMs = minimumIntervalMs
    this.maxRetries = maxRetries
    this.lastRequestAt = 0
    this.requestCount = 0
  }

  async request(path, params) {
    const url = new URL(path, OPENALEX_API_BASE)
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
    if (this.apiKey) url.searchParams.set('api_key', this.apiKey)

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const elapsed = Date.now() - this.lastRequestAt
      if (elapsed < this.minimumIntervalMs) {
        await wait(this.minimumIntervalMs - elapsed)
      }
      this.lastRequestAt = Date.now()
      this.requestCount += 1

      let response
      try {
        response = await this.fetchImpl(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent':
              'MetaCan/1.0 (+https://metacan.xera.ac; mailto:ahmad.pub@gmail.com)',
          },
          signal: AbortSignal.timeout(60_000),
        })
      } catch (error) {
        if (attempt === this.maxRetries) throw error
        await wait(Math.min(750 * 2 ** attempt, 30_000))
        continue
      }

      if (response.ok) return response.json()
      if (
        attempt < this.maxRetries &&
        (response.status === 429 || response.status >= 500) &&
        !retryWouldCrossDailyReset(response)
      ) {
        await wait(retryDelay(response, attempt))
        continue
      }

      const body = (await response.text()).slice(0, 500)
      throw new Error(
        `OpenAlex returned HTTP ${response.status} for ${safeUrl(url)}: ${body}`,
      )
    }
    throw new Error('OpenAlex retry loop ended unexpectedly')
  }

  async forEachPage(path, params, visit) {
    let cursor = '*'
    let pages = 0
    let rows = 0

    while (cursor) {
      if (pages >= this.maxPagesPerQuery) {
        throw new Error(
          `OpenAlex page safety limit reached for ${path}; no partial result was stored`,
        )
      }
      const payload = await this.request(path, {
        ...params,
        per_page: 100,
        cursor,
      })
      const results = Array.isArray(payload?.results) ? payload.results : null
      if (!results) throw new Error(`OpenAlex returned an invalid list for ${path}`)
      pages += 1
      rows += results.length
      await visit(results)
      cursor = payload?.meta?.next_cursor || null
      if (results.length === 0) cursor = null
    }

    return { pages, rows }
  }
}

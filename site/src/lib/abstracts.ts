import { normaliseAbstractText } from "@/lib/structured-abstract";

export type AbstractSource = "pubmed" | "europe_pmc" | "openalex";

export interface CanadianInstitution {
  id: string;
  name: string;
  ror: string | null;
}

export interface CanadianAuthor {
  id: string;
  name: string;
  orcid: string | null;
  institutions: CanadianInstitution[];
}

export interface AbstractRecord {
  text: string | null;
  source: AbstractSource | null;
  pmid: string | null;
  pmcid: string | null;
  authors: CanadianAuthor[];
}

interface EuropePmcResult {
  abstractText?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
}

interface UpstreamRecord {
  abstract: string | null;
  pmid: string | null;
  pmcid: string | null;
  authors?: CanadianAuthor[];
}

interface OpenAlexAuthorship {
  author?: { id?: string; display_name?: string; orcid?: string };
  raw_author_name?: string;
  institutions?: Array<{
    id?: string;
    display_name?: string;
    country_code?: string;
    ror?: string;
  }>;
}

const ABSTRACT_CACHE_TTL_MS = 86_400_000;
const DEGRADED_CACHE_TTL_MS = 300_000;
const ABSTRACT_CACHE_MAX_ENTRIES = 1_000;
const REQUEST_TIMEOUT_MS = 8_000;
const abstractCache = new Map<
  string,
  { expiresAt: number; value: Promise<AbstractRecord | null> }
>();

function logAbstractFailure(source: AbstractSource | "pubmed_lookup", detail: string) {
  console.warn(`[abstract:${source}] ${detail}`);
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function normaliseDoi(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .toLocaleLowerCase();
}

function pmidFrom(value: string | undefined): string | null {
  const match = value?.match(/(\d+)\/?$/);
  return match?.[1] ?? null;
}

function pmcidFrom(value: string | undefined): string | null {
  const match = value?.match(/(PMC\d+)\/?$/i);
  return match?.[1]?.toLocaleUpperCase() ?? null;
}

function shortOpenAlexId(value: string): string {
  return value.replace(/^https:\/\/openalex\.org\//i, "");
}

function canadianAuthors(authorships: OpenAlexAuthorship[]): CanadianAuthor[] {
  const authors = new Map<string, CanadianAuthor>();
  for (const authorship of authorships) {
    const rawId = authorship.author?.id;
    const name =
      authorship.author?.display_name?.trim() ||
      authorship.raw_author_name?.trim();
    if (!rawId || !name) continue;
    const institutions = new Map<string, CanadianInstitution>();
    for (const institution of authorship.institutions ?? []) {
      if (
        institution.country_code !== "CA" ||
        !institution.id ||
        !institution.display_name
      ) {
        continue;
      }
      const id = shortOpenAlexId(institution.id);
      institutions.set(id, {
        id,
        name: institution.display_name,
        ror: institution.ror?.replace(/^https:\/\/ror\.org\//i, "") ?? null,
      });
    }
    if (institutions.size === 0) continue;
    const id = shortOpenAlexId(rawId);
    authors.set(id, {
      id,
      name,
      orcid:
        authorship.author?.orcid?.replace(/^https:\/\/orcid\.org\//i, "") ??
        null,
      institutions: Array.from(institutions.values()),
    });
  }
  return Array.from(authors.values());
}

async function cachedFetch(url: string): Promise<Response> {
  return fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function fetchEuropePmc(doi: string): Promise<UpstreamRecord | null> {
  try {
    const params = new URLSearchParams({
      query: `DOI:"${doi.replaceAll('"', "")}"`,
      format: "json",
      resultType: "core",
      pageSize: "1",
      email: "ahmad.pub@gmail.com",
    });
    const response = await cachedFetch(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`,
    );
    if (!response.ok) {
      logAbstractFailure("europe_pmc", `HTTP ${response.status}`);
      return null;
    }
    const payload = (await response.json()) as {
      resultList?: { result?: EuropePmcResult[] };
    };
    const result = payload.resultList?.result?.[0];
    if (!result?.doi || normaliseDoi(result.doi) !== doi) return null;
    const abstract = result.abstractText
      ? normaliseAbstractText(result.abstractText)
      : null;
    return {
      abstract: abstract || null,
      pmid: pmidFrom(result.pmid),
      pmcid: pmcidFrom(result.pmcid),
    };
  } catch (error) {
    logAbstractFailure("europe_pmc", errorName(error));
    return null;
  }
}

function xmlText(value: string): string {
  return normaliseAbstractText(value.replace(/<[^>]+>/g, " "));
}

export function abstractFromPubMedXml(xml: string): string | null {
  const abstract = xml.match(/<Abstract>([\s\S]*?)<\/Abstract>/i)?.[1];
  if (!abstract) return null;
  const parts: string[] = [];
  const pattern = /<AbstractText\b([^>]*)>([\s\S]*?)<\/AbstractText>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(abstract)) !== null) {
    const attributes = match[1] ?? "";
    const rawLabel =
      attributes.match(/\bLabel="([^"]*)"/i)?.[1] ??
      attributes.match(/\bNlmCategory="([^"]*)"/i)?.[1] ??
      null;
    const label =
      rawLabel && !/^(?:unassigned|unlabelled)$/i.test(rawLabel)
        ? rawLabel
        : null;
    const text = xmlText(match[2] ?? "");
    if (!text) continue;
    parts.push(label ? `${xmlText(label)}: ${text}` : text);
  }
  if (parts.length > 0) return parts.join("\n\n");
  const text = xmlText(abstract);
  return text || null;
}

async function fetchPubMedById(pmid: string): Promise<UpstreamRecord | null> {
  try {
    const params = new URLSearchParams({
      db: "pubmed",
      id: pmid,
      retmode: "xml",
      tool: "metacan",
      email: "ahmad.pub@gmail.com",
    });
    const response = await cachedFetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${params}`,
    );
    if (!response.ok) {
      logAbstractFailure("pubmed", `HTTP ${response.status}`);
      return null;
    }
    const xml = await response.text();
    return {
      abstract: abstractFromPubMedXml(xml),
      pmid:
        pmidFrom(xml.match(/<PMID\b[^>]*>(\d+)<\/PMID>/i)?.[1]) ?? pmid,
      pmcid: pmcidFrom(
        xml.match(
          /<ArticleId\b[^>]*\bIdType=["']pmc["'][^>]*>([^<]+)<\/ArticleId>/i,
        )?.[1],
      ),
    };
  } catch (error) {
    logAbstractFailure("pubmed", errorName(error));
    return null;
  }
}

async function findPubMedId(doi: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      db: "pubmed",
      term: `${doi}[doi]`,
      retmode: "json",
      retmax: "1",
      tool: "metacan",
      email: "ahmad.pub@gmail.com",
    });
    const response = await cachedFetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params}`,
    );
    if (!response.ok) {
      logAbstractFailure("pubmed_lookup", `HTTP ${response.status}`);
      return null;
    }
    const payload = (await response.json()) as {
      esearchresult?: { idlist?: string[] };
    };
    return pmidFrom(payload.esearchresult?.idlist?.[0]);
  } catch (error) {
    logAbstractFailure("pubmed_lookup", errorName(error));
    return null;
  }
}

async function fetchOpenAlex(id: string): Promise<UpstreamRecord | null> {
  try {
    const url = new URL(`https://api.openalex.org/works/${id}`);
    url.searchParams.set("mailto", "ahmad.pub@gmail.com");
    const apiKey = process.env.OPENALEX_API_KEY?.trim();
    if (apiKey) url.searchParams.set("api_key", apiKey);
    const response = await cachedFetch(url.toString());
    if (!response.ok) {
      if (response.status !== 404) {
        logAbstractFailure("openalex", `HTTP ${response.status}`);
      }
      return null;
    }
    const payload = (await response.json()) as {
      abstract_inverted_index?: Record<string, number[]>;
      ids?: { pmid?: string; pmcid?: string };
      authorships?: OpenAlexAuthorship[];
    };
    const words: string[] = [];
    for (const [token, positions] of Object.entries(
      payload.abstract_inverted_index ?? {},
    )) {
      for (const position of positions) words[position] = token;
    }
    const abstract = words.filter(Boolean).join(" ").trim();
    return {
      abstract: abstract || null,
      pmid: pmidFrom(payload.ids?.pmid),
      pmcid: pmcidFrom(payload.ids?.pmcid),
      authors: canadianAuthors(payload.authorships ?? []),
    };
  } catch (error) {
    logAbstractFailure("openalex", errorName(error));
    return null;
  }
}

async function fetchAbstractUncached(
  openAlexId: string,
  rawDoi: string | null,
): Promise<AbstractRecord | null> {
  const doi = rawDoi ? normaliseDoi(rawDoi) : null;
  const openAlexPromise = fetchOpenAlex(openAlexId);
  let europePmc: UpstreamRecord | null = null;
  let pubMed: UpstreamRecord | null = null;
  let triedPmid: string | null = null;

  if (doi) {
    europePmc = await fetchEuropePmc(doi);
    triedPmid = europePmc?.pmid ?? (await findPubMedId(doi));
    if (triedPmid) {
      pubMed = await fetchPubMedById(triedPmid);
      if (pubMed?.abstract) {
        const openAlex = await openAlexPromise;
        return {
          text: pubMed.abstract,
          source: "pubmed",
          pmid: pubMed.pmid,
          pmcid: pubMed.pmcid ?? europePmc?.pmcid ?? null,
          authors: openAlex?.authors ?? [],
        };
      }
    }
    if (europePmc?.abstract) {
      const openAlex = await openAlexPromise;
      return {
        text: europePmc.abstract,
        source: "europe_pmc",
        pmid: pubMed?.pmid ?? europePmc.pmid,
        pmcid: pubMed?.pmcid ?? europePmc.pmcid,
        authors: openAlex?.authors ?? [],
      };
    }
  }

  const openAlex = await openAlexPromise;
  if (openAlex?.pmid && openAlex.pmid !== triedPmid) {
    pubMed = await fetchPubMedById(openAlex.pmid);
    if (pubMed?.abstract) {
      return {
        text: pubMed.abstract,
        source: "pubmed",
        pmid: pubMed.pmid,
        pmcid: pubMed.pmcid ?? openAlex.pmcid,
        authors: openAlex.authors ?? [],
      };
    }
  }
  if (openAlex?.abstract) {
    return {
      text: openAlex.abstract,
      source: "openalex",
      pmid: pubMed?.pmid ?? europePmc?.pmid ?? openAlex.pmid,
      pmcid: pubMed?.pmcid ?? europePmc?.pmcid ?? openAlex.pmcid,
      authors: openAlex.authors ?? [],
    };
  }

  const pmid = pubMed?.pmid ?? europePmc?.pmid ?? openAlex?.pmid ?? null;
  const pmcid = pubMed?.pmcid ?? europePmc?.pmcid ?? openAlex?.pmcid ?? null;
  const authors = openAlex?.authors ?? [];
  return pmid || pmcid || authors.length > 0
    ? { text: null, source: null, pmid, pmcid, authors }
    : null;
}

export function fetchAbstract(
  openAlexId: string,
  rawDoi: string | null,
): Promise<AbstractRecord | null> {
  const doi = rawDoi ? normaliseDoi(rawDoi) : "";
  const cacheKey = `${shortOpenAlexId(openAlexId)}|${doi}`;
  const now = Date.now();
  const cached = abstractCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    abstractCache.delete(cacheKey);
    abstractCache.set(cacheKey, cached);
    return cached.value;
  }
  if (cached) abstractCache.delete(cacheKey);

  const value = fetchAbstractUncached(openAlexId, rawDoi);
  const entry = {
    expiresAt: now + DEGRADED_CACHE_TTL_MS,
    value,
  };
  abstractCache.set(cacheKey, entry);
  void value.then((record) => {
    if (abstractCache.get(cacheKey) !== entry) return;
    const completePreferredResolution =
      record?.source === "pubmed" || record?.source === "europe_pmc";
    entry.expiresAt =
      Date.now() +
      (completePreferredResolution
        ? ABSTRACT_CACHE_TTL_MS
        : DEGRADED_CACHE_TTL_MS);
  });
  while (abstractCache.size > ABSTRACT_CACHE_MAX_ENTRIES) {
    const oldest = abstractCache.keys().next().value;
    if (oldest === undefined) break;
    abstractCache.delete(oldest);
  }
  return value;
}

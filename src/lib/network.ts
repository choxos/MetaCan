import { prisma } from '@/lib/db'
import { authorLayerQuery } from '@/lib/query'

/**
 * The Canada-only collaboration network.
 *
 * Nodes are researchers with at least one Canadian-affiliated authorship on a
 * frame work; an edge exists only where BOTH authorships on the same work were
 * Canadian-affiliated. International coauthors are invisible HERE BY DESIGN:
 * this is the in-Canada network, and the exclusion is stated on the page
 * rather than discovered by a confused reader.
 *
 * Everything reads ca_edge, materialized at load time by
 * deploy/authors_network.sql, because the honest alternative (a live
 * self-join over 20M work_author rows) hands its worst case to whichever
 * visitor asks about a hyperprolific author first. The materialization
 * excludes works whose Canadian-affiliated author count exceeds a density
 * guard recorded in ca_edge_meta; the page reports that exclusion, with
 * numbers, every time.
 *
 * Edge weights: `shared_works` is the count of coauthored frame works;
 * `weight` is Newman's fractional sum (1/(n_authors - 1) per shared work,
 * n_authors = the work's TOTAL authorship count including undisambiguated
 * rows), so a pair whose only tie is a 500-author consortium paper does not
 * outrank a pair with three small-team papers.
 */

export interface NetNode {
  id: string
  name: string
  /** Frame works where this researcher's authorship was Canadian-affiliated. */
  caWorks: number
}

export interface NetEdge {
  a: string
  b: string
  sharedWorks: number
  weight: number
}

export interface NetworkGraph {
  nodes: NetNode[]
  edges: NetEdge[]
}

export interface EdgeMeta {
  maxCaAuthors: number
  worksExcluded: number
  worksIncluded: number
}

export interface NetworkStats {
  /** Researchers with >= 1 Canadian-affiliated authorship. */
  caAuthors: number
  /** Distinct CA-CA pairs in ca_edge. */
  caEdges: number
  meta: EdgeMeta | null
  /** False until the author layer and ca_edge are loaded. */
  available: boolean
}

const OVERVIEW_EDGES = 350

async function edgeMeta(): Promise<EdgeMeta | null> {
  const rows = await authorLayerQuery(
    () => prisma.$queryRaw<
      Array<{ max_ca_authors: number; works_excluded: bigint; works_included: bigint }>
    >`SELECT max_ca_authors, works_excluded, works_included FROM ca_edge_meta LIMIT 1`,
    [],
  )
  const r = rows[0]
  if (!r) return null
  return {
    maxCaAuthors: r.max_ca_authors,
    worksExcluded: Number(r.works_excluded),
    worksIncluded: Number(r.works_included),
  }
}

/**
 * Frame-wide network constants, cached per process like the other frame
 * constants (the tables only change on a deploy-time load).
 */
let statsPromise: Promise<NetworkStats> | null = null

export function getNetworkStats(): Promise<NetworkStats> {
  if (!statsPromise) {
    statsPromise = (async () => {
      const [authorRows, edgeRows, meta] = await Promise.all([
        authorLayerQuery(
          () => prisma.$queryRaw<Array<{ n: bigint }>>`
            SELECT COUNT(*)::bigint AS n FROM authors WHERE ca_works > 0`,
          [],
        ),
        authorLayerQuery(
          () => prisma.$queryRaw<Array<{ n: bigint }>>`
            SELECT COUNT(*)::bigint AS n FROM ca_edge`,
          [],
        ),
        edgeMeta(),
      ])
      const caAuthors = Number(authorRows[0]?.n ?? 0)
      const caEdges = Number(edgeRows[0]?.n ?? 0)
      return { caAuthors, caEdges, meta, available: caAuthors > 0 && caEdges > 0 }
    })().catch((e) => {
      statsPromise = null
      throw e
    })
  }
  return statsPromise
}

async function nodesFor(ids: string[]): Promise<Map<string, NetNode>> {
  if (!ids.length) return new Map()
  const rows = await authorLayerQuery(
    () => prisma.$queryRaw<Array<{ id: string; name: string; ca_works: number }>>`
      SELECT id, name, ca_works FROM authors WHERE id = ANY(${ids})`,
    [],
  )
  return new Map(rows.map((r) => [r.id, { id: r.id, name: r.name, caWorks: r.ca_works }]))
}

/**
 * The overview map: the strongest Canada-only collaborations in the frame.
 * Top edges BY WEIGHT, not top authors by output: a map seeded from the most
 * prolific authors shows stars with no ties; the strongest ties ARE the map.
 * Cached per process (first computation is a few index reads).
 */
let overviewPromise: Promise<NetworkGraph> | null = null

export function getNetworkOverview(): Promise<NetworkGraph> {
  if (!overviewPromise) {
    overviewPromise = (async () => {
      const edges = await authorLayerQuery(
        () => prisma.$queryRaw<
          Array<{ a: string; b: string; shared_works: number; weight: number }>
        >`SELECT a, b, shared_works, weight::float8 AS weight
          FROM ca_edge ORDER BY weight DESC, shared_works DESC LIMIT ${OVERVIEW_EDGES}`,
        [],
      )
      const ids = Array.from(new Set(edges.flatMap((e) => [e.a, e.b])))
      const byId = await nodesFor(ids)
      return {
        nodes: ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
        edges: edges.map((e) => ({
          a: e.a,
          b: e.b,
          sharedWorks: e.shared_works,
          weight: e.weight,
        })),
      }
    })().catch((e) => {
      overviewPromise = null
      throw e
    })
  }
  return overviewPromise
}

/**
 * One researcher's Canada-only neighborhood: their strongest CA-CA
 * collaborators, and the ties AMONG those collaborators so the view is a
 * graph rather than a star.
 */
export async function getEgoNetwork(authorId: string, limit = 30): Promise<NetworkGraph | null> {
  const centerRows = await authorLayerQuery(
    () => prisma.$queryRaw<Array<{ id: string; name: string; ca_works: number }>>`
      SELECT id, name, ca_works FROM authors WHERE id = ${authorId}`,
    [],
  )
  const center = centerRows[0]
  if (!center) return null

  const spokes = await authorLayerQuery(
    () => prisma.$queryRaw<
      Array<{ a: string; b: string; shared_works: number; weight: number }>
    >`SELECT a, b, shared_works, weight::float8 AS weight
      FROM ca_edge WHERE a = ${authorId} OR b = ${authorId}
      ORDER BY weight DESC, shared_works DESC LIMIT ${limit}`,
    [],
  )

  const neighborIds = spokes.map((e) => (e.a === authorId ? e.b : e.a))
  const among = neighborIds.length
    ? await authorLayerQuery(
        () => prisma.$queryRaw<
          Array<{ a: string; b: string; shared_works: number; weight: number }>
        >`SELECT a, b, shared_works, weight::float8 AS weight
          FROM ca_edge
          WHERE a = ANY(${neighborIds}) AND b = ANY(${neighborIds})`,
        [],
      )
    : []

  const byId = await nodesFor([authorId, ...neighborIds])
  const nodes = [authorId, ...neighborIds].flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
  const edges = [...spokes, ...among].map((e) => ({
    a: e.a,
    b: e.b,
    sharedWorks: e.shared_works,
    weight: e.weight,
  }))
  return { nodes, edges }
}

/** Name search over CA-affiliated researchers, for the network page's picker. */
export async function searchCaAuthors(q: string, limit = 12): Promise<NetNode[]> {
  const rows = await authorLayerQuery(
    () => prisma.$queryRaw<Array<{ id: string; name: string; ca_works: number }>>`
      SELECT id, name, ca_works FROM authors
      WHERE ca_works > 0
        AND to_tsvector('simple', name) @@ websearch_to_tsquery('simple', ${q})
      ORDER BY ca_works DESC, name ASC LIMIT ${limit}`,
    [],
  )
  return rows.map((r) => ({ id: r.id, name: r.name, caWorks: r.ca_works }))
}

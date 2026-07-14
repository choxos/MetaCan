import type { NextRequest } from 'next/server'
import { cohortCount, exportChunk, labelAgreement, EXPORT_CAP, type ExportRow } from '@/lib/query'
import { canonicalFilters, filtersToQuery, hashFilters, SNAPSHOT } from '@/lib/permalink'
import { CORS, filtersFromParams, OPTIONS } from '@/lib/api'

export const dynamic = 'force-dynamic'
export { OPTIONS }

/**
 * GET /api/v1/cohort/export?format=csv|json&<filters>
 *
 * The whole cohort, streamed straight from Postgres in keyset-paginated chunks
 * so a 100,000-row export never sits fully in memory. Capped at 100,000 rows:
 * past that, take the repository and rebuild the frame locally instead of
 * pulling four million rows through one small server. The truncation is never
 * silent; it is declared in the meta (JSON), the trailing comment line (CSV),
 * and the X-Export-Truncated response header (both).
 *
 * Every row carries every works column, the machine labels with their
 * agreement, the provisional scores, and the per-row validation_status
 * verbatim. The labels are frontier-LLM output, unvalidated; an empty labels
 * field means UNLABELLED, which is not a negative label.
 */

const CHUNK = 5_000

const CSV_COLUMNS = [
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
  'score_opus',
  'score_gpt',
  'score_spread',
  'validation_status',
  'label_models',
  'label_agreement',
  'label_categories_union',
  'labels_json',
] as const

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvRow(r: ExportRow): string {
  const labels = r.labels ?? []
  const agreement = labelAgreement(
    labels.map((l) => ({ categories: l.categories, studyDesign: l.study_design })),
  )
  const union = [...new Set(labels.flatMap((l) => l.categories))].sort()
  const cells: Record<(typeof CSV_COLUMNS)[number], unknown> = {
    ...r,
    label_models: labels.map((l) => l.model).join(';'),
    label_agreement: agreement ?? '',
    label_categories_union: union.join(';'),
    labels_json: labels.length ? JSON.stringify(labels) : '',
  }
  return CSV_COLUMNS.map((c) => csvCell(cells[c])).join(',') + '\n'
}

function jsonRow(r: ExportRow): string {
  const labels = r.labels ?? []
  return JSON.stringify({
    ...r,
    labels,
    label_agreement: labelAgreement(
      labels.map((l) => ({ categories: l.categories, studyDesign: l.study_design })),
    ),
  })
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const format = sp.get('format') === 'json' ? 'json' : 'csv'
  const f = filtersFromParams(sp)
  const hash = hashFilters(f)

  const { total, labeled } = await cohortCount(f)
  const truncated = total > EXPORT_CAP

  const meta = {
    query_hash: hash,
    filters: canonicalFilters(f),
    cohort_total: total,
    labels_cover: labeled,
    exported: Math.min(total, EXPORT_CAP),
    export_cap: EXPORT_CAP,
    truncated,
    label_status: 'machine label (frontier LLM, unvalidated)',
    score_status: 'score_only:v0-immature-baseline',
    snapshot: {
      source: 'OpenAlex, pinned release, all 482 partitions',
      release: SNAPSHOT.release,
      frame_built: SNAPSHOT.built,
    },
    permalink: `https://metacan.xera.ac/q/${hash}`,
    api: `https://metacan.xera.ac/api/v1/cohort?${filtersToQuery(canonicalFilters(f))}`,
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (s: string) => controller.enqueue(encoder.encode(s))
      try {
        if (format === 'json') {
          write(`{"meta":${JSON.stringify(meta)},"results":[`)
        } else {
          write(CSV_COLUMNS.join(',') + '\n')
        }

        let cursor = ''
        let sent = 0
        let first = true
        while (sent < EXPORT_CAP) {
          const limit = Math.min(CHUNK, EXPORT_CAP - sent)
          const rows = await exportChunk(f, cursor, limit)
          const last = rows[rows.length - 1]
          if (last === undefined) break
          for (const r of rows) {
            if (format === 'json') {
              write((first ? '' : ',') + jsonRow(r))
              first = false
            } else {
              write(csvRow(r))
            }
          }
          sent += rows.length
          cursor = last.id
          if (rows.length < limit) break
        }

        if (format === 'json') {
          write(']}')
        } else if (truncated) {
          // Declared in-band too: a file that silently stops at 100,000 rows
          // looks complete, and this one is not.
          write(`# TRUNCATED: cohort has ${total} works; export capped at ${EXPORT_CAP} rows (ordered by id). Page /api/v1/cohort, or rebuild the frame from the repository, for the rest.\n`)
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })

  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(stream, {
    headers: {
      ...CORS,
      'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="metacan-cohort-${hash}-${stamp}.${format}"`,
      'Cache-Control': 'no-store',
      'X-Cohort-Total': String(total),
      'X-Export-Truncated': truncated ? 'true' : 'false',
    },
  })
}

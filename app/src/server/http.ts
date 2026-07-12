import { NextRequest, NextResponse } from 'next/server'

/**
 * Prisma error codes that indicate the database is unreachable / timing out.
 * These map to HTTP 503 (transient) rather than 500 (bug), so clients and
 * load balancers can distinguish "DB down" from "broken handler".
 */
const CONNECTIVITY_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017'])

function isConnectivityError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code
  return typeof code === 'string' && CONNECTIVITY_CODES.has(code)
}

/**
 * Build the standard error response for a caught error: 503 when the database
 * is unreachable (transient), 500 otherwise. Never leaks internals.
 *
 * Use this in a route's existing catch block:
 *   } catch (error) { return dbErrorResponse(error) }
 * so an outage surfaces as a real non-2xx instead of a 200 with zeroed data.
 */
export function dbErrorResponse(error: unknown): NextResponse {
  const connectivity = isConnectivityError(error)
  return NextResponse.json(
    {
      error: connectivity
        ? 'Service temporarily unavailable'
        : 'Internal server error',
    },
    { status: connectivity ? 503 : 500 },
  )
}

/**
 * Wrap a route handler so any thrown error becomes a real non-2xx response
 * (503 for DB connectivity, 500 otherwise) instead of a 200 with a zeroed
 * payload. This is what lets the frontend distinguish an outage from genuine
 * empty data, fixing the "site silently shows zeros when the DB is down" bug.
 *
 * Genuine in-handler responses (e.g. a 404 for a missing record) are returned
 * untouched; only *thrown* errors are converted.
 */
export function withApiHandler<C = unknown>(
  handler: (request: NextRequest, context: C) => Promise<Response> | Response,
): (request: NextRequest, context: C) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      // Log the full error server-side; never leak internals to the client.
      console.error(
        `[api] ${request.method} ${request.nextUrl?.pathname ?? ''} failed:`,
        error,
      )
      return dbErrorResponse(error)
    }
  }
}

/** Parse an int query param, returning undefined for null/empty/NaN. */
export function toInt(v: string | null | undefined): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? undefined : n
}

/** Parse + clamp an int query param to [min, max], falling back when absent/NaN. */
export function clampInt(
  v: string | null | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = toInt(v)
  if (n === undefined) return fallback
  return Math.max(min, Math.min(max, n))
}

import { NextResponse } from 'next/server'
import { withApiHandler } from '@/server/http'
import { COMPUTED_AT, FINDINGS } from '@/data/findings'
import { appVersion } from '@/lib/site'

// The container healthcheck polls this, so it must never be prerendered into a
// static asset with a stale timestamp.
export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/health, served at /metacan/api/v1/health once basePath applies.
 *
 * Reports on the one dependency this app actually has: the committed pilot
 * output. If findings.json ever fails to load or arrives empty, the container is
 * unhealthy even though Next is happily serving pages, which is exactly the
 * "200 with zeroed data" failure that withApiHandler exists to prevent.
 */
export const GET = withApiHandler(async () => {
  const findings = FINDINGS.length

  if (findings === 0) {
    return NextResponse.json(
      { status: 'degraded', error: 'findings dataset is empty' },
      { status: 503 },
    )
  }

  return NextResponse.json({
    status: 'ok',
    version: appVersion,
    findings,
    dataComputedAt: COMPUTED_AT,
    timestamp: new Date().toISOString(),
  })
})

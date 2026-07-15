#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [state] = await prisma.$queryRaw`
    SELECT
      EXISTS (SELECT 1 FROM works LIMIT 1) AS "hasWorks",
      EXISTS (SELECT 1 FROM facet_venue LIMIT 1) AS "hasVenueFacets",
      EXISTS (SELECT 1 FROM facet_topic LIMIT 1) AS "hasTopicFacets"
  `

  if (!state.hasWorks) {
    console.log('facets: skipped because the frozen frame is empty')
    return
  }
  if (state.hasVenueFacets && state.hasTopicFacets) {
    console.log('facets: current tables are populated')
    return
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`TRUNCATE TABLE facet_venue, facet_topic`
      await tx.$executeRaw`
        INSERT INTO facet_venue (venue, works)
        SELECT venue, COUNT(*)::int
        FROM works
        WHERE venue IS NOT NULL AND venue <> ''
        GROUP BY venue
      `
      await tx.$executeRaw`
        INSERT INTO facet_topic (topic, works)
        SELECT topic, COUNT(*)::int
        FROM works
        WHERE topic IS NOT NULL AND topic <> ''
        GROUP BY topic
      `
      await tx.$executeRaw`ANALYZE facet_venue`
      await tx.$executeRaw`ANALYZE facet_topic`
    },
    { maxWait: 10_000, timeout: 600_000 },
  )
  console.log('facets: rebuilt venue and topic tables')
}

try {
  await main()
} catch (error) {
  console.error(
    `facet refresh: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}

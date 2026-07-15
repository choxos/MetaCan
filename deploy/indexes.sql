-- Indexes, created AFTER the bulk COPY (building them during a 4.3M-row load is
-- how a ten-minute import becomes an hour).

-- Full-text search over title. This is the site's main entry point, so it gets a
-- GIN index on a tsvector rather than a LIKE scan over four million rows.
ALTER TABLE works ADD COLUMN IF NOT EXISTS title_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, ''))) STORED;
CREATE INDEX idx_works_title_tsv ON works USING GIN (title_tsv);

-- Trigram index for substring / fuzzy venue and institution lookup.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_works_venue_trgm ON works USING GIN (venue gin_trgm_ops);

-- The filters the explorer actually offers.
CREATE INDEX idx_works_year        ON works (year);
CREATE INDEX idx_works_lang        ON works (lang);
CREATE INDEX idx_works_type        ON works (type);
CREATE INDEX idx_works_field       ON works (field);
CREATE INDEX idx_works_cited       ON works (cited_by DESC);
CREATE INDEX idx_works_retracted   ON works (is_retracted) WHERE is_retracted;
CREATE INDEX idx_works_no_abstract ON works (has_abstract) WHERE NOT has_abstract;

-- Route provenance: the columns that answer "why is this work in the frame?".
-- Partial indexes, because each route is a minority of the table and a partial
-- index on the TRUE rows is a fraction of the size of a full one.
CREATE INDEX idx_works_aff    ON works (id) WHERE route_ca_aff;
CREATE INDEX idx_works_fund   ON works (id) WHERE route_ca_fund;
CREATE INDEX idx_works_venue  ON works (id) WHERE route_ca_venue;
CREATE INDEX idx_works_about  ON works (id) WHERE route_about_ca;
-- The 1.57M works INVISIBLE to affiliation alone: the frame's whole argument.
CREATE INDEX idx_works_no_aff ON works (id) WHERE NOT route_ca_aff;

CREATE INDEX idx_screened_n_in    ON screened (n_in);
CREATE INDEX idx_screened_stratum ON screened (stratum);
CREATE INDEX idx_retr_nature      ON retractions (nature);

-- The cohort builder's venue and topic facets filter by exact value. Without
-- these, a topic filter is a 700 ms parallel seq scan over 4.3M rows (measured
-- with EXPLAIN ANALYZE); with them it is milliseconds. They are cheap on disk
-- (31 MB and 34 MB respectively) because btree deduplication collapses the
-- ~4,500 distinct topics and ~85,000 distinct venues.
CREATE INDEX idx_works_topic       ON works (topic);
CREATE INDEX idx_works_venue_btree ON works (venue);

-- Exact membership filters for the semicolon-delimited record facets. The three
-- source columns total 905 MB of text on the release frame. Array GIN indexes
-- keep each chip click exact while avoiding the measured 1.5 to 3.1 second
-- sequential scans over 4.3 million works.
CREATE INDEX idx_works_institution_members ON works USING GIN
  (string_to_array(ca_institutions, '; '));
CREATE INDEX idx_works_funder_members ON works USING GIN
  (string_to_array(funders, '; '));
CREATE INDEX idx_works_keyword_members ON works USING GIN
  (string_to_array(keywords, '; '));

-- Typeahead sources for the venue and topic facets: tiny derived tables
-- (85k and 4.5k rows) an ILIKE can scan in milliseconds, instead of hundreds
-- of MB of trigram indexes on a 99%-full disk. The frame is a pinned snapshot,
-- so these never go stale; rebuild them here, after any works reload.
DROP TABLE IF EXISTS facet_venue;
DROP TABLE IF EXISTS facet_topic;
CREATE TABLE facet_venue AS
  SELECT venue, COUNT(*)::int AS works FROM works
  WHERE venue IS NOT NULL AND venue <> '' GROUP BY venue;
CREATE TABLE facet_topic AS
  SELECT topic, COUNT(*)::int AS works FROM works
  WHERE topic IS NOT NULL AND topic <> '' GROUP BY topic;

ANALYZE works;
ANALYZE screened;
ANALYZE retractions;
ANALYZE facet_venue;
ANALYZE facet_topic;

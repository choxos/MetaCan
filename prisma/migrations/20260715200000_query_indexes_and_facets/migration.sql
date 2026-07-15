CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS title_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_works_title_tsv
  ON works USING GIN (title_tsv);
CREATE INDEX IF NOT EXISTS idx_works_venue_trgm
  ON works USING GIN (venue gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_works_year ON works (year);
CREATE INDEX IF NOT EXISTS idx_works_lang ON works (lang);
CREATE INDEX IF NOT EXISTS idx_works_type ON works (type);
CREATE INDEX IF NOT EXISTS idx_works_field ON works (field);
CREATE INDEX IF NOT EXISTS idx_works_cited ON works (cited_by DESC);
CREATE INDEX IF NOT EXISTS idx_works_retracted
  ON works (is_retracted) WHERE is_retracted;
CREATE INDEX IF NOT EXISTS idx_works_no_abstract
  ON works (has_abstract) WHERE NOT has_abstract;

CREATE INDEX IF NOT EXISTS idx_works_aff
  ON works (id) WHERE route_ca_aff;
CREATE INDEX IF NOT EXISTS idx_works_fund
  ON works (id) WHERE route_ca_fund;
CREATE INDEX IF NOT EXISTS idx_works_venue
  ON works (id) WHERE route_ca_venue;
CREATE INDEX IF NOT EXISTS idx_works_about
  ON works (id) WHERE route_about_ca;
CREATE INDEX IF NOT EXISTS idx_works_no_aff
  ON works (id) WHERE NOT route_ca_aff;

CREATE INDEX IF NOT EXISTS idx_screened_n_in ON screened (n_in);
CREATE INDEX IF NOT EXISTS idx_screened_stratum ON screened (stratum);
CREATE INDEX IF NOT EXISTS idx_retr_nature ON retractions (nature);
CREATE INDEX IF NOT EXISTS idx_works_topic ON works (topic);
CREATE INDEX IF NOT EXISTS idx_works_venue_btree ON works (venue);

CREATE INDEX IF NOT EXISTS idx_works_institution_members
  ON works USING GIN (string_to_array(ca_institutions, '; '));
CREATE INDEX IF NOT EXISTS idx_works_funder_members
  ON works USING GIN (string_to_array(funders, '; '));
CREATE INDEX IF NOT EXISTS idx_works_keyword_members
  ON works USING GIN (string_to_array(keywords, '; '));

CREATE TABLE IF NOT EXISTS facet_venue (
  venue TEXT,
  works INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS facet_topic (
  topic TEXT,
  works INTEGER NOT NULL DEFAULT 0
);

TRUNCATE TABLE facet_venue, facet_topic;
INSERT INTO facet_venue (venue, works)
SELECT venue, COUNT(*)::int
FROM works
WHERE venue IS NOT NULL AND venue <> ''
GROUP BY venue;
INSERT INTO facet_topic (topic, works)
SELECT topic, COUNT(*)::int
FROM works
WHERE topic IS NOT NULL AND topic <> ''
GROUP BY topic;

ANALYZE works;
ANALYZE screened;
ANALYZE retractions;
ANALYZE facet_venue;
ANALYZE facet_topic;

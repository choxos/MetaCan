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

ANALYZE works;
ANALYZE screened;
ANALYZE retractions;

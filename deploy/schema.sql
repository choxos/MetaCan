-- MetaCan: the Canadian research frame, its screening, and its provenance.
--
-- Every row here traces to data/frame/canadian_works.parquet, which is a
-- projection of a pinned OpenAlex snapshot (all 482 partitions). Nothing in this
-- database is inferred, and every work carries the ROUTES that admitted it, so a
-- reader can always ask "why is this here?" and get an answer.

DROP TABLE IF EXISTS query_permalink CASCADE;
DROP TABLE IF EXISTS work_label CASCADE;
DROP TABLE IF EXISTS work_score CASCADE;
DROP TABLE IF EXISTS screened CASCADE;
DROP TABLE IF EXISTS retractions CASCADE;
DROP TABLE IF EXISTS works CASCADE;

-- ---------------------------------------------------------------------------
-- works: the frame. All 4,299,418 of them.
--
-- No abstract column, and that is a measured decision rather than a shortcut:
-- the abstract inverted indexes are 8.6 GB of the frame's 9.3 GB of text, and the
-- host has 13 GB free. The detail page fetches an abstract live from OpenAlex.
-- `has_abstract` is stored, because WHETHER a work has one is itself a finding
-- (23.3% do not, and the screen finds half as much metaresearch there).
-- ---------------------------------------------------------------------------
CREATE TABLE works (
  id              VARCHAR(20) PRIMARY KEY,     -- OpenAlex W-id, prefix stripped
  -- TEXT, not VARCHAR(255). OpenAlex carries malformed DOIs: the longest in the
  -- frame is 294 characters, a PDF URL with query parameters glued onto a DOI
  -- prefix. Truncating it to fit would silently corrupt the record, and a project
  -- whose thesis is that the data must be recorded as it actually is does not get
  -- to quietly trim the inconvenient rows. Postgres TEXT costs nothing to widen.
  doi             TEXT,
  title           TEXT NOT NULL,
  year            SMALLINT,
  lang            VARCHAR(8),
  type            VARCHAR(32),
  venue           TEXT,
  topic           TEXT,
  field           TEXT,
  cited_by        INTEGER DEFAULT 0,
  is_retracted    BOOLEAN DEFAULT FALSE,
  has_abstract    BOOLEAN DEFAULT FALSE,
  -- PROVENANCE. Why is this work in the frame? A frame that forgets how it found
  -- something cannot be audited, and that is the whole thesis.
  route_ca_aff    BOOLEAN DEFAULT FALSE,
  route_ca_fund   BOOLEAN DEFAULT FALSE,
  route_ca_venue  BOOLEAN DEFAULT FALSE,
  route_about_ca  BOOLEAN DEFAULT FALSE,
  ca_institutions TEXT,
  funders         TEXT,
  keywords        TEXT
);

-- ---------------------------------------------------------------------------
-- retractions: Retraction Watch's post-publication state (finding 17).
--
-- Separate from works.is_retracted ON PURPOSE. OpenAlex's flag is a BOOLEAN over
-- a state space with at least four values, so it can express "retracted" and
-- silently reports expression-of-concern, correction and reinstatement as FALSE,
-- which reads as "fine". This table carries the state OpenAlex cannot.
-- ---------------------------------------------------------------------------
CREATE TABLE retractions (
  work_id          VARCHAR(20) PRIMARY KEY REFERENCES works(id) ON DELETE CASCADE,
  nature           VARCHAR(64),   -- Retraction | Expression of concern | Correction | Reinstatement
  reason           TEXT,
  retraction_date  VARCHAR(32),
  openalex_flagged BOOLEAN        -- FALSE here = OpenAlex missed it
);

-- ---------------------------------------------------------------------------
-- screened: the three-model screen over 1,000 works drawn from the real frame.
--
-- Three frontier models, one locked rubric, the rubric's FULL eight-field
-- payload. `n_in` is how many of the three called the work in scope, and it is
-- the most honest column in this database: of the works ANY model called
-- metaresearch, only 37% were called metaresearch by all three.
--
-- `weight` is the design weight (inverse selection probability). The sample is
-- stratified, so any rate computed from it must use the weight or it is wrong.
-- ---------------------------------------------------------------------------
CREATE TABLE screened (
  id              VARCHAR(20) PRIMARY KEY REFERENCES works(id) ON DELETE CASCADE,
  stratum         VARCHAR(32),
  stratum_n       INTEGER,
  weight          DOUBLE PRECISION,
  title           TEXT,
  abstract        TEXT,           -- stored HERE, where it is evidence
  year            SMALLINT,
  lang            VARCHAR(8),
  type            VARCHAR(32),
  venue           TEXT,
  topic           TEXT,
  field           TEXT,
  opus_tier       VARCHAR(8),  opus_genre VARCHAR(48),  opus_about_ca BOOLEAN,  opus_confidence VARCHAR(8),  opus_reason TEXT,
  gpt_tier        VARCHAR(8),  gpt_genre  VARCHAR(48),  gpt_about_ca  BOOLEAN,  gpt_confidence  VARCHAR(8),  gpt_reason  TEXT,
  grok_tier       VARCHAR(8),  grok_genre VARCHAR(48),  grok_about_ca BOOLEAN,  grok_confidence VARCHAR(8),  grok_reason TEXT,
  n_in            SMALLINT     -- 0..3: how many models called it in scope
);

-- ---------------------------------------------------------------------------
-- work_score: the PROVISIONAL baseline frame scores, one row per work.
--
-- These are the two teacher heads of the distilled student model (Opus and GPT;
-- Grok was retired from the panel at D36) read over the full frame. The model is
-- NOT mature: pilot/results/maturity.json says passed = false after 7 training
-- rounds, and every row's validation_status says score_only:v0-immature-baseline.
-- A score ORDERS works for review; it never asserts a category, and nothing that
-- reads this table may present it as a validated label.
--
-- Source: data/db/frame_scores.parquet (4,299,418 rows). Load, after works:
--
--   python: export the parquet to CSV, gzip it, then on the host
--   zcat work_score.csv.gz | psql "$DATABASE_URL" \
--     -c "\copy work_score FROM STDIN WITH (FORMAT csv, HEADER true)"
--   psql "$DATABASE_URL" -c "ANALYZE work_score;"
-- ---------------------------------------------------------------------------
CREATE TABLE work_score (
  id                VARCHAR(20) PRIMARY KEY REFERENCES works(id) ON DELETE CASCADE,
  score_opus        DOUBLE PRECISION,
  score_gpt         DOUBLE PRECISION,
  score_spread      DOUBLE PRECISION,  -- |score_opus - score_gpt|: the teachers' disagreement
  validation_status TEXT               -- verbatim from the scoring run; currently score_only:v0-immature-baseline
);

-- ---------------------------------------------------------------------------
-- work_label: per-model category and study-design labels, one row per
-- (work, model).
--
-- These are MACHINE LABELS from frontier LLMs, unvalidated. They come from the
-- labelling rounds under pilot/screening/loop/round_*/ and are loaded by
-- deploy/load_labels.py, which is idempotent and re-run as new rounds land.
-- The table is SPARSE ON PURPOSE: only a few hundred works carry labels today,
-- and nothing that reads it may treat an absent row as a negative label. Every
-- surface that filters on it must say how many works in the cohort carry
-- labels at all.
--
-- `categories` is a set, not a single value: a work can be metaresearch AND
-- open_science. `study_design` is single-valued per model. No study_design
-- here is MEDLINE-validated yet; when that validation lands it will be carried
-- explicitly, never assumed.
-- ---------------------------------------------------------------------------
CREATE TABLE work_label (
  id              VARCHAR(20) REFERENCES works(id) ON DELETE CASCADE,
  model           VARCHAR(16),   -- opus | gpt | grok
  categories      TEXT[],        -- metaresearch, metaepi_narrow, metaepi_broad, bibliometrics,
                                 -- sts, scholarly_communication, open_science, research_integrity
                                 -- (empty = the model put the work in no category;
                                 --  insufficient_payload = the model refused to judge)
  domain          VARCHAR(24),
  study_design    VARCHAR(32),   -- randomized_trial .. design_other, not_applicable
  genre           VARCHAR(16),
  about_ca_system BOOLEAN,
  about_ca_topic  BOOLEAN,
  confidence      VARCHAR(8),    -- high | medium | low
  PRIMARY KEY (id, model)
);

-- ---------------------------------------------------------------------------
-- query_permalink: citable cohort queries.
--
-- A cohort's filter state serializes canonically, hashes, and lands here, so
-- /q/<hash> can render the same query forever. The row stores the FILTERS, not
-- the results: the frame is a pinned snapshot, so re-running the query is the
-- honest way to reproduce the counts, and the page recomputes them live.
-- ---------------------------------------------------------------------------
CREATE TABLE query_permalink (
  hash       VARCHAR(16) PRIMARY KEY,   -- sha256 of the canonical filter string, truncated
  filters    JSONB NOT NULL,            -- the canonical WorkFilters object
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

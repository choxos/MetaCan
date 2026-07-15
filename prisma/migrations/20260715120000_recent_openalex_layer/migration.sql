CREATE TABLE recent_work (
  id                    VARCHAR(20) PRIMARY KEY,
  doi                   TEXT,
  title                 TEXT NOT NULL,
  publication_date      DATE NOT NULL,
  year                  SMALLINT,
  lang                  VARCHAR(8),
  type                  VARCHAR(32),
  venue                 TEXT,
  topic                 TEXT,
  field                 TEXT,
  cited_by              INTEGER NOT NULL DEFAULT 0,
  is_retracted          BOOLEAN NOT NULL DEFAULT FALSE,
  has_abstract          BOOLEAN NOT NULL DEFAULT FALSE,
  abstract              TEXT,
  pmid                  VARCHAR(32),
  pmcid                 VARCHAR(32),
  route_ca_aff          BOOLEAN NOT NULL DEFAULT FALSE,
  route_ca_fund         BOOLEAN NOT NULL DEFAULT FALSE,
  route_ca_venue        BOOLEAN NOT NULL DEFAULT FALSE,
  route_about_ca        BOOLEAN NOT NULL DEFAULT FALSE,
  ca_institutions       TEXT[] NOT NULL DEFAULT '{}',
  funders               TEXT[] NOT NULL DEFAULT '{}',
  keywords              TEXT[] NOT NULL DEFAULT '{}',
  authors               JSONB NOT NULL,
  openalex_updated_date DATE,
  route_version         VARCHAR(64) NOT NULL,
  source_window_start   DATE NOT NULL,
  source_window_end     DATE NOT NULL,
  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at          TIMESTAMPTZ NOT NULL,
  synced_at             TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_recent_work_publication
  ON recent_work (publication_date DESC, id);
CREATE INDEX idx_recent_work_institutions
  ON recent_work USING GIN (ca_institutions);
CREATE INDEX idx_recent_work_funders
  ON recent_work USING GIN (funders);
CREATE INDEX idx_recent_work_keywords
  ON recent_work USING GIN (keywords);

CREATE TABLE recent_sync_run (
  id             BIGSERIAL PRIMARY KEY,
  status         VARCHAR(16) NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ,
  requested_days INTEGER NOT NULL,
  window_start   DATE NOT NULL,
  window_end     DATE NOT NULL,
  route_version  VARCHAR(64) NOT NULL,
  api_requests   INTEGER NOT NULL DEFAULT 0,
  returned_rows  INTEGER NOT NULL DEFAULT 0,
  candidate_rows INTEGER NOT NULL DEFAULT 0,
  matched_rows   INTEGER NOT NULL DEFAULT 0,
  stored_rows    INTEGER NOT NULL DEFAULT 0,
  error          TEXT,
  CONSTRAINT recent_sync_run_status_check
    CHECK (status IN ('running', 'succeeded', 'failed', 'interrupted'))
);

CREATE INDEX idx_recent_sync_started
  ON recent_sync_run (started_at DESC);
CREATE UNIQUE INDEX idx_recent_sync_single_running
  ON recent_sync_run (status)
  WHERE status = 'running';

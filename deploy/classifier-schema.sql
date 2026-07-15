\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE IF NOT EXISTS classifier_model (
  version                 VARCHAR(64) PRIMARY KEY,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  active                  BOOLEAN NOT NULL DEFAULT FALSE,
  row_count               INTEGER NOT NULL CHECK (row_count > 0),
  output_hash             CHAR(64) NOT NULL,
  frame_hash              CHAR(64) NOT NULL,
  model_hash              CHAR(64) NOT NULL,
  feature_contract_hash   CHAR(64) NOT NULL,
  schema_hash             CHAR(64) NOT NULL,
  score_encoding          VARCHAR(32) NOT NULL DEFAULT 'uint16_le_65535',
  targets                 TEXT[] NOT NULL,
  codex_targets           TEXT[] NOT NULL,
  gemma_targets           TEXT[] NOT NULL,
  decision_targets        TEXT[] NOT NULL,
  interpretation          TEXT NOT NULL,
  metadata                JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS classifier_model_one_active
  ON classifier_model (active)
  WHERE active;

CREATE TABLE IF NOT EXISTS work_prediction (
  id                     VARCHAR(20) NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  classifier_version     VARCHAR(64) NOT NULL REFERENCES classifier_model(version) ON DELETE CASCADE,
  candidate_union        TEXT[] NOT NULL,
  consensus_intersection TEXT[] NOT NULL,
  codex_scores           BYTEA NOT NULL,
  gemma_scores           BYTEA NOT NULL,
  PRIMARY KEY (id, classifier_version)
);

ALTER TABLE classifier_model
  ADD COLUMN IF NOT EXISTS score_encoding VARCHAR(32) NOT NULL
  DEFAULT 'uint16_le_65535';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'work_prediction'
      AND column_name = 'codex_scores'
      AND data_type = 'ARRAY'
  ) THEN
    IF EXISTS (SELECT 1 FROM work_prediction) THEN
      RAISE EXCEPTION 'packed score migration requires an empty work_prediction table';
    END IF;
    ALTER TABLE work_prediction DROP COLUMN codex_scores;
    ALTER TABLE work_prediction DROP COLUMN gemma_scores;
    ALTER TABLE work_prediction ADD COLUMN codex_scores BYTEA NOT NULL;
    ALTER TABLE work_prediction ADD COLUMN gemma_scores BYTEA NOT NULL;
  END IF;
END $$;

COMMIT;

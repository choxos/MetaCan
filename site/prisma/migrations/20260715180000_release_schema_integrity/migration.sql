ALTER TABLE works
  ADD COLUMN IF NOT EXISTS title_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_works_title_tsv
  ON works USING GIN (title_tsv);

CREATE TABLE IF NOT EXISTS facet_venue (
  venue TEXT,
  works INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS facet_topic (
  topic TEXT,
  works INTEGER NOT NULL DEFAULT 0
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'classifier_model'::regclass
      AND conname IN (
        'classifier_model_row_count_check',
        'classifier_model_row_count_positive'
      )
  ) THEN
    ALTER TABLE classifier_model
      ADD CONSTRAINT classifier_model_row_count_positive
      CHECK (row_count > 0);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS classifier_model_one_active
  ON classifier_model (active)
  WHERE active;

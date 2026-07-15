CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "works" (
    "id" VARCHAR(20) NOT NULL,
    "doi" TEXT,
    "title" TEXT NOT NULL,
    "year" SMALLINT,
    "lang" VARCHAR(8),
    "type" VARCHAR(32),
    "venue" TEXT,
    "topic" TEXT,
    "field" TEXT,
    "cited_by" INTEGER NOT NULL DEFAULT 0,
    "is_retracted" BOOLEAN NOT NULL DEFAULT false,
    "has_abstract" BOOLEAN NOT NULL DEFAULT false,
    "route_ca_aff" BOOLEAN NOT NULL DEFAULT false,
    "route_ca_fund" BOOLEAN NOT NULL DEFAULT false,
    "route_ca_venue" BOOLEAN NOT NULL DEFAULT false,
    "route_about_ca" BOOLEAN NOT NULL DEFAULT false,
    "ca_institutions" TEXT,
    "funders" TEXT,
    "keywords" TEXT,
    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "retractions" (
    "work_id" VARCHAR(20) NOT NULL,
    "nature" VARCHAR(64),
    "reason" TEXT,
    "retraction_date" VARCHAR(32),
    "openalex_flagged" BOOLEAN NOT NULL,
    CONSTRAINT "retractions_pkey" PRIMARY KEY ("work_id")
);

CREATE TABLE "screened" (
    "id" VARCHAR(20) NOT NULL,
    "stratum" VARCHAR(32),
    "stratum_n" INTEGER,
    "weight" DOUBLE PRECISION,
    "title" TEXT,
    "abstract" TEXT,
    "year" SMALLINT,
    "lang" VARCHAR(8),
    "type" VARCHAR(32),
    "venue" TEXT,
    "topic" TEXT,
    "field" TEXT,
    "opus_tier" VARCHAR(8),
    "opus_genre" VARCHAR(48),
    "opus_about_ca" BOOLEAN,
    "opus_confidence" VARCHAR(8),
    "opus_reason" TEXT,
    "gpt_tier" VARCHAR(8),
    "gpt_genre" VARCHAR(48),
    "gpt_about_ca" BOOLEAN,
    "gpt_confidence" VARCHAR(8),
    "gpt_reason" TEXT,
    "grok_tier" VARCHAR(8),
    "grok_genre" VARCHAR(48),
    "grok_about_ca" BOOLEAN,
    "grok_confidence" VARCHAR(8),
    "grok_reason" TEXT,
    "n_in" SMALLINT,
    CONSTRAINT "screened_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_score" (
    "id" VARCHAR(20) NOT NULL,
    "score_opus" DOUBLE PRECISION,
    "score_gpt" DOUBLE PRECISION,
    "score_spread" DOUBLE PRECISION,
    "validation_status" TEXT,
    CONSTRAINT "work_score_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_label" (
    "id" VARCHAR(20) NOT NULL,
    "model" VARCHAR(16) NOT NULL,
    "categories" TEXT[] NOT NULL,
    "domain" VARCHAR(24),
    "study_design" VARCHAR(32),
    "genre" VARCHAR(16),
    "about_ca_system" BOOLEAN,
    "about_ca_topic" BOOLEAN,
    "confidence" VARCHAR(8),
    CONSTRAINT "work_label_pkey" PRIMARY KEY ("id", "model")
);

CREATE TABLE "classifier_model" (
    "version" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "row_count" INTEGER NOT NULL,
    "output_hash" CHAR(64) NOT NULL,
    "frame_hash" CHAR(64) NOT NULL,
    "model_hash" CHAR(64) NOT NULL,
    "feature_contract_hash" CHAR(64) NOT NULL,
    "schema_hash" CHAR(64) NOT NULL,
    "score_encoding" VARCHAR(32) NOT NULL DEFAULT 'uint16_le_65535',
    "targets" TEXT[] NOT NULL,
    "codex_targets" TEXT[] NOT NULL,
    "gemma_targets" TEXT[] NOT NULL,
    "decision_targets" TEXT[] NOT NULL,
    "interpretation" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    CONSTRAINT "classifier_model_pkey" PRIMARY KEY ("version")
);

CREATE TABLE "work_prediction" (
    "id" VARCHAR(20) NOT NULL,
    "classifier_version" VARCHAR(64) NOT NULL,
    "candidate_union" TEXT[] NOT NULL,
    "consensus_intersection" TEXT[] NOT NULL,
    "codex_scores" BYTEA NOT NULL,
    "gemma_scores" BYTEA NOT NULL,
    CONSTRAINT "work_prediction_pkey" PRIMARY KEY ("id", "classifier_version")
);

CREATE TABLE "query_permalink" (
    "hash" VARCHAR(16) NOT NULL,
    "filters" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "query_permalink_pkey" PRIMARY KEY ("hash")
);

CREATE INDEX "work_prediction_classifier_version_id_idx"
    ON "work_prediction"("classifier_version", "id");

ALTER TABLE "retractions"
    ADD CONSTRAINT "retractions_work_id_fkey"
    FOREIGN KEY ("work_id") REFERENCES "works"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "screened"
    ADD CONSTRAINT "screened_id_fkey"
    FOREIGN KEY ("id") REFERENCES "works"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_score"
    ADD CONSTRAINT "work_score_id_fkey"
    FOREIGN KEY ("id") REFERENCES "works"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_label"
    ADD CONSTRAINT "work_label_id_fkey"
    FOREIGN KEY ("id") REFERENCES "works"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_prediction"
    ADD CONSTRAINT "work_prediction_id_fkey"
    FOREIGN KEY ("id") REFERENCES "works"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_prediction"
    ADD CONSTRAINT "work_prediction_classifier_version_fkey"
    FOREIGN KEY ("classifier_version") REFERENCES "classifier_model"("version")
    ON DELETE CASCADE ON UPDATE CASCADE;

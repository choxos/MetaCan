-- Run AFTER the COPY, BEFORE indexes.sql.
--
-- Why this file exists.
--
-- R writes a missing logical as an empty field. Postgres CSV COPY reads an
-- unquoted empty field as NULL. So 397,370 of the 4,299,418 rows arrive with
-- route_ca_venue = NULL rather than FALSE. (The other five booleans are clean:
-- the scan found zero empties in is_retracted, has_abstract, route_ca_aff,
-- route_ca_fund and route_about_ca.)
--
-- That NULL is not merely cosmetic. prisma/schema.prisma declares every route as
-- a non-nullable `Boolean`, so a NULL in this column makes the Prisma client throw
-- on ANY read that touches the row -- which is to say, on the browse page. The bug
-- would not appear in a smoke test; it would appear on whichever page of results
-- first contained one of those 397,370 works.
--
-- Coalescing to FALSE is the correct reading, not a convenience. route_ca_venue is
-- NULL exactly when the work has no venue whose country could be resolved. The
-- question the column answers is "did the Canadian-venue route admit this work?",
-- and if the venue's country is unknown, that route did not admit it. FALSE.
--
-- The frame is unaffected: membership is the OR of the four routes, and a work
-- whose only claim was an unresolvable venue was never admitted by it in the first
-- place. This changes no count on the site; it stops a crash.

UPDATE works SET route_ca_venue = FALSE WHERE route_ca_venue IS NULL;

-- Make the schema tell the truth. The Prisma model promises these are never null;
-- until now only the CSV's good behaviour enforced that. Now the database does.
ALTER TABLE works
  ALTER COLUMN is_retracted   SET NOT NULL,
  ALTER COLUMN has_abstract   SET NOT NULL,
  ALTER COLUMN route_ca_aff   SET NOT NULL,
  ALTER COLUMN route_ca_fund  SET NOT NULL,
  ALTER COLUMN route_ca_venue SET NOT NULL,
  ALTER COLUMN route_about_ca SET NOT NULL,
  ALTER COLUMN cited_by       SET NOT NULL;

-- A work in the frame with no route is a contradiction: it could not have been
-- admitted. Assert it rather than trust it. If this ever fires, the frame is wrong
-- and the site must not be built on it.
DO $$
DECLARE orphans BIGINT;
BEGIN
  SELECT COUNT(*) INTO orphans FROM works
   WHERE NOT route_ca_aff AND NOT route_ca_fund AND NOT route_ca_venue AND NOT route_about_ca;
  IF orphans > 0 THEN
    RAISE EXCEPTION 'FRAME INVARIANT VIOLATED: % works are in the frame by no route at all', orphans;
  END IF;
END $$;

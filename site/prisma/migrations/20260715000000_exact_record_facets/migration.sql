CREATE INDEX IF NOT EXISTS idx_works_institution_members ON works USING GIN
  (string_to_array(ca_institutions, '; '));
CREATE INDEX IF NOT EXISTS idx_works_funder_members ON works USING GIN
  (string_to_array(funders, '; '));
CREATE INDEX IF NOT EXISTS idx_works_keyword_members ON works USING GIN
  (string_to_array(keywords, '; '));

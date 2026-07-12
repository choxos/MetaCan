# Prespecified definitions, shared by the pilot and the pipeline.
#
# Everything here is a decision. It lives in version-controlled code rather than
# in prose, so that moving the field boundary is a diff and not a rewrite.

# --- Route R1: candidate metaresearch topics ---------------------------------
# No OpenAlex topic names metaresearch: pilot/01_topics.R enumerates all 4,516
# and finds none. These are the topics that carry the field's content. They span
# seven OpenAlex fields, which is the point.
CANDIDATE_TOPICS <- c(
  "T10102",  # Scientometrics and bibliometrics research  (Decision Sciences)
  "T13607",  # Academic Publishing and Open Access         (Decision Sciences)
  "T13516",  # Publishing and Scholarly Communication      (Arts and Humanities)
  "T11937",  # Research Data Management Practices          (Computer Science)
  "T10206",  # Meta-analysis and systematic reviews        (Decision Sciences)
  "T10582",  # Ethics in Clinical Research                 (Medicine)
  "T10267",  # Higher Education Research Studies           (Social Sciences)
  "T10778",  # Philosophy and History of Science           (Arts and Humanities)
  "T13558",  # Philosophy, Science, and History            (Arts and Humanities)
  "T13284",  # Psychology Research and Bibliometrics       (Psychology)
  "T11875"   # Statistics Education and Methodologies      (Mathematics)
)
TOPIC_FILTER <- paste0("primary_topic.id:", paste(CANDIDATE_TOPICS, collapse = "|"))

# --- Route R2: bilingual lexicon ---------------------------------------------
# Specific enough to denote research-on-research. Deliberately EXCLUDES the
# promiscuous terms below, whose everyday senses swamp the metaresearch sense.
LEXICON_EN <- c(
  "metascience", "metaresearch", '"meta-research"', '"research on research"',
  "bibliometric", "scientometric",
  '"research integrity"', '"research waste"',
  '"questionable research practices"', '"reporting guideline"',
  '"scholarly communication"', '"research assessment"',
  '"publication bias"'
)

LEXICON_FR <- c(
  "métascience", "métarecherche", '"méta-recherche"',
  "bibliométrie", "bibliométrique",
  "scientométrie", "scientométrique",
  '"intégrité scientifique"', '"intégrité en recherche"',
  '"communication savante"', '"évaluation de la recherche"',
  '"libre accès"', '"science ouverte"',
  '"biais de publication"', '"révision par les pairs"'
)

# Terms whose metaresearch sense is drowned out by an everyday one. Kept as data
# because their failure is a finding, not an oversight: see pilot/05_polysemy.R.
POLYSEMOUS <- c('"peer review"', '"open access"', "reproducibility", '"open science"')

lexicon <- function(terms) paste(terms, collapse = " OR ")

# --- Canadian linkage ---------------------------------------------------------
CANADA_AFFILIATION <- "authorships.institutions.country_code:ca"

# Tri-agency plus CFI.
CANADIAN_FUNDERS <- c(
  F4320334506 = "Canadian Institutes of Health Research",
  F4320334593 = "Natural Sciences and Engineering Research Council of Canada",
  F4320334617 = "Social Sciences and Humanities Research Council of Canada",
  F4320319952 = "Canada Foundation for Innovation"
)
# NB: the `grants.funder` filter that older write-ups quote no longer exists;
# OpenAlex now exposes `funders.id` (any funder link) and `awards.funder_id` (a
# linked award record). We use the former, which is the more inclusive.
FUNDER_FILTER <- paste0("funders.id:", paste(names(CANADIAN_FUNDERS), collapse = "|"))

ABOUT_CANADA <- "Canada OR Canadian OR canadien OR canadienne"

# --- Window -------------------------------------------------------------------
FROM_YEAR <- 2000L
TO_YEAR   <- 2025L

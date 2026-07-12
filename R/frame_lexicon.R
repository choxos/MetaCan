# The Canadian place lexicon, tiered, and the reason it is tiered.
#
# ------------------------------------------------------------------------------
# THIS FILE IS FINDING 5 APPLIED TO THE FRAME
# ------------------------------------------------------------------------------
# Finding 5: `reproducibility` alone returns 43,392 Canadian works, 0.8% on-topic,
# because a word's everyday sense swamps its technical one. Finding 7: "University
# of London" appears INSIDE a Canada-filtered OpenAlex query.
#
# Canadian place names have exactly the same disease, and worse. London, Victoria,
# Regina, Windsor, Kingston, Hamilton, Cambridge, Waterloo, Richmond, Surrey and
# Cornwall are all Canadian cities AND something far more common somewhere else.
# `regina` is also a Latin word. `waterloo` is a battle. `victoria` is a state of
# Australia and a person's name. A flat place-name match would flood the frame.
#
# So the lexicon is TIERED:
#
#   TIER A  country and province/territory names. Match alone. Unambiguous.
#   TIER B  cities with no serious homograph. Match alone.
#   TIER C  POLYSEMOUS cities. Match ONLY in co-occurrence with a Tier A term.
#
# Tier C's rule is not a false-negative risk worth worrying about: a paper about
# London, Ontario that mentions neither Ontario nor Canada anywhere in its title or
# abstract is vanishingly rare, and if it is Canadian-authored the affiliation
# route catches it regardless. The union is what protects us; no single route has
# to be complete, and that is the whole point of recording provenance.
#
# The frame is deliberately OVER-BROAD. False positives in a frame are harmless:
# screening removes them. False NEGATIVES are fatal, because you cannot measure
# what the frame never showed you. That asymmetry is the entire design.

# --- Tier A: country, provinces, territories (EN + FR) -------------------------
CA_TIER_A <- c(
  "canada", "canadian", "canadien", "canadienne", "canadiens", "canadiennes",
  "ontario", "quebec", "québec", "quebecois", "québécois",
  "british columbia", "colombie-britannique",
  "alberta", "manitoba", "saskatchewan",
  "nova scotia", "nouvelle-écosse", "nouvelle-ecosse",
  "new brunswick", "nouveau-brunswick",
  "newfoundland", "labrador", "terre-neuve",
  "prince edward island", "île-du-prince-édouard", "ile-du-prince-edouard",
  "yukon", "nunavut",
  "northwest territories", "territoires du nord-ouest",
  # the two national research-system terms that are effectively place markers
  "first nations", "inuit", "métis", "metis"
)

# --- Tier B: cities with no serious homograph ---------------------------------
CA_TIER_B <- c(
  "toronto", "montreal", "montréal", "vancouver", "calgary", "edmonton",
  "ottawa", "winnipeg", "saskatoon", "halifax", "mississauga", "brampton",
  "laval", "gatineau", "longueuil", "sherbrooke",
  "trois-rivières", "trois-rivieres", "moncton", "fredericton",
  "charlottetown", "whitehorse", "yellowknife", "iqaluit",
  "sudbury", "thunder bay", "kelowna", "burnaby", "oshawa", "barrie",
  "guelph", "saguenay", "chicoutimi", "rimouski", "nanaimo",
  "lethbridge", "medicine hat", "grande prairie", "fort mcmurray",
  "prince george", "kamloops", "chilliwack", "moose jaw", "prince albert",
  "north bay", "timmins", "sault ste. marie", "sault ste marie",
  "st. john's", "st johns", "sept-îles", "sept-iles", "etobicoke",
  "mcgill", "dalhousie", "concordia university", "ryerson", "laurentian university"
)

# --- Tier C: POLYSEMOUS. Require a Tier A term in the same record. -------------
CA_TIER_C <- c(
  "london", "victoria", "regina", "windsor", "kingston", "hamilton",
  "cambridge", "waterloo", "richmond", "surrey", "delta", "aurora",
  "milton", "cornwall", "brandon", "vernon", "scarborough", "chatham",
  "newmarket", "vaughan", "markham", "oakville", "burlington",
  "peterborough", "st. catharines", "kitchener", "brantford", "niagara",
  "welland", "stratford", "woodstock", "orillia", "belleville"
)

# --- Canadian funders and venues: an EXTERNAL criterion, not my list -----------
#
# TWO BUGS LIVED HERE, AND THE SECOND WAS WORSE THAN THE FIRST.
#
# 1. I hardcoded six funder IDs from memory. THREE WERE WRONG (CIHR, SSHRC, CFI);
#    they pointed at other funders. CA-FUND then matched 12,844 works in a
#    partition where CA-AFF matched 6,202. A funder route outrunning the
#    affiliation route by 2x is a bug announcing itself.
#
# 2. Corrected, the list was still only FOUR funders. OpenAlex knows **2,182
#    Canadian funders**. Four misses Canada Research Chairs (42,824 works),
#    Government of Canada (24,131), the National Research Council (19,425),
#    Mitacs (16,874), Genome Canada, Brain Canada, every provincial agency, and
#    every university that funds its own researchers. The route was catching a
#    sliver and reporting it as the route.
#
# The fix is this project's own thesis applied again: REPLACE A CURATED LIST WITH
# AN EXTERNAL, CHECKABLE CRITERION. OpenAlex records `country_code` on funders and
# on sources. So "Canadian funder" means "a funder OpenAlex says is Canadian"
# (2,182 of them) and "Canadian venue" means "a source OpenAlex says is Canadian"
# (1,341). Not my judgement, not my memory, and auditable by anyone.
#
# R/pin_entities.R writes both lists. Run it before the harvest.
CA_FUNDERS_PARQUET <- "data/frame/canadian_funders.parquet"
CA_SOURCES_PARQUET <- "data/frame/canadian_sources.parquet"

stopifnot(
  "run R/pin_entities.R first: data/frame/canadian_funders.parquet is missing" =
    file.exists(CA_FUNDERS_PARQUET),
  "run R/pin_entities.R first: data/frame/canadian_sources.parquet is missing" =
    file.exists(CA_SOURCES_PARQUET)
)

#' Build the SQL predicate for the ABOUT-CA route.
#'
#' Searches the title and the abstract. The abstract in the snapshot is an
#' INVERTED INDEX stored as a JSON string whose KEYS are the tokens, so an ILIKE
#' against the raw string is a serviceable word search: the token "Canada" appears
#' in it as the substring `"Canada"`. Crude, and correct for a frame.
about_ca_sql <- function() {
  esc <- function(x) gsub("'", "''", x)

  # WORD-BOUNDARY MATCHING, not naive ILIKE '%delta%'.
  #
  # A substring match on `delta` hits "deltamethrin", "delta-9-THC" and every
  # river delta on earth. `london` hits "Londonderry". This is finding 5 all over
  # again, and a frame built on substring hits would be mostly noise even before
  # the polysemy gate.
  #
  # So match on a boundary: the term must be flanked by a non-letter (or a string
  # edge). regexp_matches with a case-insensitive flag does this cheaply, and it
  # works on `abstract_inverted_index` too, because that VARCHAR is JSON whose KEYS
  # are the tokens: the token "Canada" literally appears in it as `"Canada"`.
  bounded <- function(terms, col) {
    pat <- paste0("(^|[^[:alpha:]])(", paste(esc(terms), collapse = "|"), ")([^[:alpha:]]|$)")
    sprintf("regexp_matches(coalesce(%s, ''), '%s', 'i')", col, pat)
  }

  # keywords are STRUCT(id, display_name, score)[]; flatten the display names.
  KW <- "list_aggregate(list_transform(keywords, k -> k.display_name), 'string_agg', ' ')"

  hit <- function(terms) sprintf("(%s OR %s OR %s)",
    bounded(terms, "title"), bounded(terms, "abstract_inverted_index"), bounded(terms, KW))

  tier_a <- hit(CA_TIER_A)
  tier_b <- hit(CA_TIER_B)
  # THE POLYSEMY GATE: a Tier C name only counts alongside a Tier A term.
  tier_c <- sprintf("(%s AND %s)", hit(CA_TIER_C), tier_a)

  sprintf("(%s OR %s OR %s)", tier_a, tier_b, tier_c)
}

# --- CA-AFF -------------------------------------------------------------------
# TWO fields carry authorship country and they are NOT the same thing:
#
#   authorships[].institutions[].country_code  -- country of a RESOLVED institution
#   authorships[].countries                    -- OpenAlex's country list, which is
#                                                 also populated when it can read a
#                                                 country off the raw affiliation
#                                                 string WITHOUT resolving it to an
#                                                 institution.
#
# The second is strictly more inclusive, and the difference is not academic: pilot
# finding 2 showed 64% of works in the metaresearch topic space carry NO raw
# affiliation string at all, and the ones that do are often unresolvable. A frame
# that requires a RESOLVED Canadian institution silently drops every Canadian work
# whose affiliation OpenAlex could not match to a ROR.
#
# A frame must not do that. Take the union: either signal admits.
CA_AFF_SQL <- "(
     len(list_filter(
       flatten(list_transform(authorships, a -> a.institutions)),
       i -> i.country_code = 'CA')) > 0
  OR len(list_filter(
       flatten(list_transform(authorships, a -> a.countries)),
       c -> c = 'CA')) > 0
)"

# DuckDB REFUSES a subquery inside a lambda ("subqueries in lambda expressions are
# not supported"), so `x -> x IN (SELECT ...)` will not compile. Read the ids once
# and test with list_has_any against a list literal, which needs no lambda at all.
#
# Both `funders` (any funder link) and `awards` (a linked award record) carry the
# funder id, and they are NOT the same set, so test both.
.ca_funder_ids <- local({
  con <- DBI::dbConnect(duckdb::duckdb())
  on.exit(DBI::dbDisconnect(con, shutdown = TRUE))
  DBI::dbGetQuery(con, sprintf("SELECT id FROM read_parquet('%s')", CA_FUNDERS_PARQUET))$id
})
.ca_funder_literal <- paste0("[", paste0("'", .ca_funder_ids, "'", collapse = ","), "]")

CA_FUND_SQL <- sprintf("(
     list_has_any(list_transform(funders, f -> f.id),      %s)
  OR list_has_any(list_transform(awards,  a -> a.funder_id), %s)
)", .ca_funder_literal, .ca_funder_literal)

# CA-VENUE: `works` carries no venue country (primary_location.source has no
# country_code -- that is a binder error waiting to happen, and it was). The
# country lives on the SOURCES entity, so test the venue id against the pinned
# 1,341-source list.
CA_VENUE_SQL <- sprintf(
  "primary_location.source.id IN (SELECT id FROM read_parquet('%s'))",
  CA_SOURCES_PARQUET)

# --- CA-VENUE: NOT testable inside the works snapshot --------------------------
# `primary_location.source` has NO country_code. Its fields are id, display_name,
# issn_l, issn, is_oa, is_in_doaj, is_core, host_organization,
# host_organization_name, host_organization_lineage(_names), type. Writing
# `primary_location.source.country_code = 'CA'` throws a binder error, which is how
# this was caught.
#


# The stratification, in ONE place, defined so that it PARTITIONS the sampling frame.
#
# ==============================================================================
# WHY THIS FILE EXISTS
# ==============================================================================
# The five original strata did not cover the frame. They left 549,370 works, 12.9%
# of the sampling frame, with an inclusion probability of exactly ZERO. A design
# weight cannot rescue a work that the design cannot draw: it is not underweighted,
# it is unreachable, and no estimator is defined over it.
#
# It happened twice over, for two different reasons, and neither raised an error.
#
# ------------------------------------------------------------------------------
# DEFECT 1: THE STRATA DID NOT MEET IN THE MIDDLE (366,856 works)
# ------------------------------------------------------------------------------
#     aff_core   = route_ca_aff   AND language='en' AND NOT route_about_ca
#     about_only = route_about_ca AND NOT route_ca_aff AND ...
#
# Read them together. `aff_core` throws away everything about Canada. `about_only`
# throws away everything affiliated with Canada. So a work that is BOTH Canadian-
# affiliated AND about Canada is claimed by NEITHER, and 321,419 works sat in that
# gap.
#
# That is not a random 8% of the frame. It is precisely where the SECONDARY
# ESTIMAND lives: "metaresearch about the Canadian research system". The design had
# a zero probability of ever sampling the population its own secondary estimand is
# defined over, and it would have reported a number for it anyway.
#
# ------------------------------------------------------------------------------
# DEFECT 2: SQL THREE-VALUED LOGIC ATE 182,514 MORE (silently)
# ------------------------------------------------------------------------------
# 388,446 works carry a NULL `route_ca_venue`; 54,161 a NULL `language`. In SQL,
# NOT(NULL) is NULL, not TRUE. So for those rows the stratum predicate evaluates to
# NULL, and a NULL predicate is selected by
#
#     WHERE (covered)          -- no
#     WHERE NOT (covered)      -- ALSO no
#
# The row is in no stratum and is not even an orphan. It is INVISIBLE. It never
# appeared in a count, never failed a check, and never threw. `count(*)` on the
# strata and `count(*)` on the complement both quietly omitted it, which is why the
# two did not add up to the frame and why nobody noticed that they did not add up.
#
# ==============================================================================
# THE FIX, AND WHY IT IS SHAPED THIS WAY
# ==============================================================================
# The five original predicates are kept BYTE-FOR-BYTE. That is deliberate. 5,000
# works were already drawn from them by hash order, and a hash-order draw is only a
# probability sample of the set it was drawn from: widen a stratum's definition and
# "the first n by hash order" becomes a DIFFERENT n works, so the labels already in
# hand would no longer correspond to the design that produced them.
#
# So the hole is closed from the outside instead. The residual strata are defined as
# the exact complement, using `IS NOT TRUE`, which is the NULL-safe negation:
#
#     (predicate) IS NOT TRUE   <=>   the predicate is FALSE *or* NULL
#
# By construction, {predicate TRUE} and {predicate IS NOT TRUE} partition the
# sampling frame with no gap and no overlap, whatever the data does. The partition
# is now a property of the DEFINITION, not a property of the data that happened to
# be there when someone last looked.
#
# The residual is split in two, because it is not homogeneous and one half of it is
# the substantively important one:
#
#   aff_about : Canadian-affiliated AND about Canada. The cell defect 1 deleted, and
#               the home of the secondary estimand. It gets its own stratum and a
#               real sample.
#   residual  : everything else the five predicates could not see, including every
#               work whose stratum membership was NULL.
#
# check_strata_partition.R asserts the partition on every build. See DEVIATIONS.md
# D22 and finding 26.

# The five original predicates. DO NOT EDIT THESE. Editing one silently re-draws the
# hash-order sample it already produced, and the labels on disk stop matching the
# design that selected them. A new stratum is additive; an edited stratum is a new
# study wearing the old one's data.
STRATA_V1 <- list(
  aff_core   = list(n = 400L, sql = "route_ca_aff AND language = 'en' AND NOT route_about_ca"),
  about_only = list(n = 200L, sql = "route_about_ca AND NOT route_ca_aff AND NOT route_ca_fund AND NOT route_ca_venue"),
  venue_new  = list(n = 150L, sql = "route_ca_venue AND NOT route_ca_aff"),
  fund_new   = list(n = 100L, sql = "route_ca_fund AND NOT route_ca_aff"),
  french     = list(n = 150L, sql = "language = 'fr'")
)
PRECEDENCE_V1 <- c("french", "about_only", "venue_new", "fund_new", "aff_core")

# The mutually exclusive form of the five, by precedence: exactly what was drawn.
strata_v1_exclusive <- function() {
  out <- list(); excl <- character(0)
  for (s in PRECEDENCE_V1) {
    p <- STRATA_V1[[s]]$sql
    out[[s]] <- if (length(excl))
      sprintf("(%s) AND NOT (%s)", p, paste(excl, collapse = ") AND NOT (")) else sprintf("(%s)", p)
    excl <- c(excl, p)
  }
  out
}

# Anything the five predicates do not evaluate to TRUE. `IS NOT TRUE` is the whole
# point: it catches FALSE *and* NULL, so nothing can fall between the two branches
# the way 182,514 works did.
uncovered_sql <- function() {
  sprintf("((%s) IS NOT TRUE)", paste(unlist(strata_v1_exclusive()), collapse = " OR "))
}

# COALESCE is not decoration. Without it, `route_ca_aff AND route_about_ca` is NULL
# for a NULL route flag, and the row would fall out of BOTH residual strata and
# straight back into the hole this file exists to close.
STRATA_V2_RESIDUAL <- list(
  aff_about = list(
    n = 400L,
    sql = sprintf("%s AND COALESCE(route_ca_aff, FALSE) AND COALESCE(route_about_ca, FALSE)", uncovered_sql())
  ),
  residual = list(
    n = 200L,
    sql = sprintf("%s AND NOT (COALESCE(route_ca_aff, FALSE) AND COALESCE(route_about_ca, FALSE))", uncovered_sql())
  )
)

# Every stratum, exclusive, in draw order. This is the design.
all_strata_sql <- function() {
  c(strata_v1_exclusive(),
    lapply(STRATA_V2_RESIDUAL, \(x) x$sql))
}

# The per-stratum sample sizes at the BASE design (n = 1,000 across the five v1
# strata). MULT scales the v1 strata; the residual strata are drawn once, at the
# size stated here, because they are a repair rather than part of the 1,000-work
# base design and scaling them by MULT would imply they had always been there.
STRATA_ALL_N <- c(
  vapply(STRATA_V1[PRECEDENCE_V1], \(x) x$n, integer(1)) * 5L,   # the 5,000-work sample as drawn
  vapply(STRATA_V2_RESIDUAL,       \(x) x$n, integer(1))         # the repair
)

# The one line every script that touches the frame must agree on.
SAMPLING_FRAME_WHERE <- "NOT is_paratext AND length(title) > 10"

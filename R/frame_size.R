# The frame's size, from the frame.
#
# ------------------------------------------------------------------------------
# WHY THIS FILE EXISTS
# ------------------------------------------------------------------------------
# Six scripts hardcoded `FRAME <- 3507205L`. That number was never a count. It was
# an EXTRAPOLATION from a single OpenAlex partition, made before the frame
# existed, and every cost, every audit-power calculation and every implied field
# size in this project was computed against it.
#
# The frame now exists. It holds 4,299,418 works, enumerated from all 482
# partitions, each work appearing exactly once. The estimate was 18% low.
#
# A project whose central complaint is that people quote numbers their code does
# not produce does not get to keep an extrapolation in a constant. So: one
# function, reading one artifact, which the harvest writes. If the frame is
# rebuilt, every downstream number moves with it, and none of them can be quietly
# left behind.
#
# `data/frame/frame_summary.json` is small and COMMITTED on purpose: it is what
# lets `make pilot-offline` reproduce every figure without the 3.25 GB parquet.

FRAME_SUMMARY <- "data/frame/frame_summary.json"

#' Total works in the built frame.
frame_size <- function() {
  if (!file.exists(FRAME_SUMMARY)) {
    stop("data/frame/frame_summary.json is missing. Run R/harvest_frame.R to build the frame, ",
         "or restore the committed summary. This project does not fall back to an estimate: ",
         "the last time it did, a single-partition extrapolation (3,507,205) sat in six scripts ",
         "and was 18% below the truth.", call. = FALSE)
  }
  as.integer(jsonlite::fromJSON(FRAME_SUMMARY)$works)
}

#' Any field of the frame summary (route counts, French, abstracts, ...).
frame_stat <- function(key) {
  x <- jsonlite::fromJSON(FRAME_SUMMARY)
  if (is.null(x[[key]])) stop("no such frame stat: ", key, call. = FALSE)
  x[[key]]
}

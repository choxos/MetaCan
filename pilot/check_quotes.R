#!/usr/bin/env Rscript
# Build guard: every quotation the rubric marks as verbatim MUST be a substring
# of the source PDF it is cited from. Nothing else counts as verbatim.
#
# Exists because of D29: rubric v3.0 quoted Murad 2017 as "the observed
# treatment effect" where the paper says "the observed effect". One inserted
# word, inside a document whose whole point is that definitions must come from
# the source and not from memory, and it survived a LOCK. The reviewer that
# found it was a model told to attack the proposal; nothing in the build was
# looking. A citation is code. It gets a test.
#
# Method: extract every quoted span from blockquote lines in the newest rubric,
# attribute each to a source PDF by the citation name nearest to it, normalize
# both sides to a bare [a-z0-9] stream (dashes, whitespace, curly quotes,
# ligatures and line-break hyphenation all die), and require containment.
# Spans joined by an ellipsis are checked segment by segment, in order.

suppressPackageStartupMessages({ library(cli) })

RUBRIC <- Filter(file.exists, c("docs/protocol/rubric-v3.md",
                                "docs/protocol/rubric-v2.md",
                                "docs/protocol/rubric.md"))[1]
if (is.na(RUBRIC)) cli_abort("no rubric found in docs/protocol/")

DEFS <- "docs/reference/definitions"

# Citation keyword -> source PDF. The keyword is matched against the lines
# around each quote; the FIRST match within the window attributes the quote.
SOURCES <- list(
  Ioannidis = file.path(DEFS, "metares_ioannidis_2015.pdf"),
  Murad     = file.path(DEFS, "metaepi_murad.pdf"),
  Kataoka   = file.path(DEFS, "metaepi_kataoka.pdf"),
  Puljak    = file.path(DEFS, "metaepi_puljak.pdf"),
  Stevens   = file.path(DEFS, "metares_stevens.pdf"),
  Mingers   = file.path(DEFS, "bibliometrics/j.ejor.2015.04.002.pdf"),
  Price     = file.path(DEFS, "bibliometrics/science.149.3683.510.pdf"),
  Jasanoff  = file.path(DEFS, "sts/[International Library of Sociology] Sheila Jasanoff (editor) - States of Knowledge_ The Co-Production of Science and the Social Order (2004, Routledge) - libgen.li.pdf"),
  Latour    = file.path(DEFS, "sts/Bruno Latour - Science in Action_ How to Follow Scientists and Engineers through Society (1988, Harvard University Press) - libgen.li.pdf"),
  Borgman   = file.path(DEFS, "scholarlycomm/Christine L. Borgman - Scholarship in the Digital Age_ Information, Infrastructure, and the Internet (2007, The MIT Press) - libgen.li.pdf"),
  UNESCO    = file.path(DEFS, "openscience/383771eng.pdf"),
  Fanelli   = file.path(DEFS, "integrity/Feneli integrity.pdf")
)

missing_pdf <- Filter(\(p) !file.exists(p), SOURCES)
if (length(missing_pdf))
  cli_abort(c("source PDFs named by this guard do not exist:",
              setNames(unlist(missing_pdf), rep("x", length(missing_pdf)))))

if (Sys.which("pdftotext") == "")
  cli_abort("pdftotext not on PATH; the quote guard cannot run")

# Reduce text to a bare alphanumeric stream so that no artifact of PDF
# extraction (hyphenation, ligatures, curly quotes, line breaks) can make a
# faithful quote look unfaithful, and no such artifact can hide an edit either.
squash <- function(x) {
  x <- tolower(x)
  x <- gsub("ﬁ", "fi", x, fixed = TRUE)   # fi ligature
  x <- gsub("ﬂ", "fl", x, fixed = TRUE)   # fl ligature
  x <- gsub("[^a-z0-9]+", "", x)
  x
}

# Two streams per PDF. Author-manuscript PDFs interleave their vertical
# "ACCEPTED MANUSCRIPT" watermark into the extracted text ("communication AN US
# system"), which failed a faithful quote on this guard's third run. The second
# stream drops short ALL-CAPS tokens before squashing, so a watermark cannot
# fail a faithful quote; a quote passes on EITHER stream, and a corrupted quote
# (a word inserted or changed) still fails both.
pdf_streams <- local({
  cache <- new.env()
  function(path) {
    key <- path
    if (!exists(key, envir = cache)) {
      txt <- suppressWarnings(system2("pdftotext", c(shQuote(path), "-"),
                                      stdout = TRUE, stderr = FALSE))
      raw <- paste(txt, collapse = " ")
      nocaps <- gsub("(^| )[A-Z]{1,4}( |$)", " ", raw)
      nocaps <- gsub("(^| )[A-Z]{1,4}( |$)", " ", nocaps)  # twice: adjacent tokens share a space
      assign(key, c(squash(raw), squash(nocaps)), envir = cache)
    }
    get(key, envir = cache)
  }
})

lines <- readLines(RUBRIC, warn = FALSE)

# A checkable quote is a "..."-delimited span on a blockquote line. Straight
# and curly double quotes both count. Markdown emphasis is stripped first.
extract_spans <- function(line) {
  line <- gsub("\\*", "", line)
  m <- gregexpr('["“]([^"“”]+)["”]', line, perl = TRUE)
  spans <- regmatches(line, m)[[1]]
  gsub('^["“]|["”]$', "", spans)
}

problems <- character()
n_checked <- 0L
n_skipped <- 0L

for (i in seq_along(lines)) {
  if (!grepl("^\\s*>", lines[i])) next
  spans <- extract_spans(lines[i])
  if (!length(spans)) next

  # Attribute: every source cited within the window is a candidate, nearest
  # first. The quote passes if it is verbatim in ANY of them; prose that
  # mentions another author on a neighboring line must not fail a faithful
  # quote (that mis-attributed five quotes on this guard's first two runs).
  lo <- max(1, i - 6); hi <- min(length(lines), i + 6)
  cand <- list()
  for (nm in names(SOURCES)) {
    hits <- lo:hi
    hits <- hits[grepl(nm, lines[hits], fixed = TRUE)]
    if (length(hits)) cand[[nm]] <- min(abs(hits - i))
  }
  if (!length(cand)) { n_skipped <- n_skipped + 1L; next }
  cand <- names(sort(unlist(cand)))

  in_stream <- function(span, stream) {
    # An ellipsis inside a quote is an elision; each segment must appear, in order.
    segs <- strsplit(span, "\\.\\.\\.|…")[[1]]
    segs <- Filter(\(s) nchar(squash(s)) >= 12, segs)
    if (!length(segs)) return(NA)   # nothing long enough to check
    pos <- 0L
    for (seg in segs) {
      hit <- regexpr(squash(seg), substr(stream, pos + 1L, nchar(stream)), fixed = TRUE)
      if (hit == -1L) return(FALSE)
      pos <- pos + hit + nchar(squash(seg)) - 1L
    }
    TRUE
  }
  in_source <- function(span, src) {
    v <- vapply(pdf_streams(SOURCES[[src]]), \(st) in_stream(span, st), NA)
    if (all(is.na(v))) NA else any(v, na.rm = TRUE)
  }

  for (span in spans) {
    verdicts <- vapply(cand, \(s) in_source(span, s), NA)
    if (all(is.na(verdicts))) { n_skipped <- n_skipped + 1L; next }
    n_checked <- n_checked + 1L
    if (!any(verdicts, na.rm = TRUE)) {
      problems <- c(problems, sprintf(
        "%s:%d: quote is in NONE of the sources cited nearby (%s): \"%s\"",
        RUBRIC, i, paste(cand, collapse = ", "), substr(span, 1, 90)))
    }
  }
}

cli_h1("quote-vs-source guard")
cli_li("rubric        : {RUBRIC}")
cli_li("quotes checked: {n_checked}")
cli_li("spans skipped : {n_skipped} (no attributable source, or fragment under 12 characters)")

if (length(problems)) {
  cli_alert_danger("{length(problems)} quote{?s} marked verbatim {?is/are} not in {?its/their} source:")
  for (p in problems) cli_li(p)
  quit(status = 1L)
}
cli_alert_success("every attributable quotation is a verbatim substring of its cited source")

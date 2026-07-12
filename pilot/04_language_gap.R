#!/usr/bin/env Rscript
# Finding 4: francophone Canadian metaresearch is nearly invisible.
#
# Quebec produces a large share of Canadian scholarship, and roughly a fifth of
# the country works primarily in French. If a retrieval design returns a French
# share in the low single digits, the honest conclusion is not "there is little
# French metaresearch"; it is "this pipeline cannot see it".
#
# We measure the share two ways: by OpenAlex's own language field, and by running
# a dedicated French lexicon. Both agree, which is the problem.

suppressPackageStartupMessages({ library(cli); library(glue); library(dplyr) })
source("R/openalex.R"); source("R/frame.R"); source("R/findings.R")

offline  <- "--offline" %in% commandArgs(TRUE)
topic_ca <- glue("{TOPIC_FILTER},{CANADA_AFFILIATION}")

total <- oa_count(topic_ca, offline = offline)
langs <- oa_group_by(topic_ca, "language", offline = offline) |>
  mutate(code = sub(".*/", "", key))

n_en <- langs |> filter(code == "en") |> pull(n) |> sum()
n_fr <- langs |> filter(code == "fr") |> pull(n) |> sum()
pct_fr <- 100 * n_fr / total

cli_h1("Language composition of Canadian metaresearch in OpenAlex")
cli_li("Canadian works in topic space : {format(total, big.mark = ',')}")
cli_li("   English : {format(n_en, big.mark = ',')}")
cli_li("   French  : {format(n_fr, big.mark = ',')} ({round(pct_fr, 1)}%)")

# Cross-check with a dedicated lexicon in each language.
en_hits  <- oa_count(glue("title_and_abstract.search:{lexicon(LEXICON_EN)},{CANADA_AFFILIATION}"), offline = offline)
fr_hits  <- oa_count(glue("title_and_abstract.search:{lexicon(LEXICON_FR)},{CANADA_AFFILIATION}"), offline = offline)
fr_world <- oa_count(glue("title_and_abstract.search:{lexicon(LEXICON_FR)}"), offline = offline)

cli_h2("Dedicated lexicons")
cli_li("English lexicon, Canadian affiliation : {format(en_hits, big.mark = ',')}")
cli_li("French  lexicon, Canadian affiliation : {format(fr_hits, big.mark = ',')}")
cli_li("French  lexicon, worldwide            : {format(fr_world, big.mark = ',')} \\
        (Canada = {round(100 * fr_hits / fr_world, 1)}% of world French metaresearch)")

record_finding(
  "language_gap",
  list(
    canadian_topic_works        = total,
    n_english                   = n_en,
    n_french                    = n_fr,
    pct_french                  = round(pct_fr, 1),
    en_lexicon_canadian_hits    = en_hits,
    fr_lexicon_canadian_hits    = fr_hits,
    fr_lexicon_world_hits       = fr_world,
    canada_share_of_world_french = round(100 * fr_hits / fr_world, 1)
  ),
  headline = glue(
    "French is {round(pct_fr, 1)}% ({format(n_fr, big.mark = ',')}/{format(total, big.mark = ',')}) ",
    "of Canadian metaresearch in OpenAlex. A dedicated French lexicon finds ",
    "{format(fr_hits, big.mark = ',')} Canadian works, against {format(en_hits, big.mark = ',')} in English."
  )
)

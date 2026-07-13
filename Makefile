.PHONY: pilot pilot-offline findings proposal protocol deps clean help harvest-status lint

# Every numbered finding, 01 through 13. The old glob was `pilot/0*.R`, which
# silently stopped at 09: findings 10-13 (agreement, the abstract bias, the topic
# route's recall, the cost model) were in the repo but never ran in `make pilot`.
# A pipeline that quietly skips a third of its own results is not a pipeline.
#
# 09_screening.R is excluded on purpose: it is the screening DRIVER (it fans out
# agents to label 6,202 works), not a derivation. It is not re-run to reproduce a
# number; its output is committed and the findings read it.
PILOTS := $(filter-out pilot/09_screening.R, $(sort $(wildcard pilot/[0-9][0-9]_*.R)))

help:
	@echo "make deps           install R dependencies"
	@echo "make pilot          run every pilot script against the live OpenAlex API"
	@echo "make pilot-offline  re-derive every number from the archived responses, no network"
	@echo "make findings       render pilot/results/FINDINGS.md"
	@echo "make proposal       render the 2-page PDF (FAILS if it spills to 3 pages)"
	@echo "make protocol       render the preregistration PDF (protocol + both rubrics, one file)"
	@echo "make harvest-status progress of the OpenAlex frame harvest, in bytes (partitions lie)"

deps:
	@Rscript -e 'pkgs <- c("httr2","jsonlite","xml2","dplyr","purrr","tibble","glue","cli","openssl"); \
	             new <- pkgs[!vapply(pkgs, requireNamespace, logical(1), quietly = TRUE)]; \
	             if (length(new)) install.packages(new, repos = "https://cloud.r-project.org")'

# findings.json IS REBUILT FROM EMPTY, EVERY TIME. This is not a tidiness habit.
#
# `record_finding()` is an accumulator: it loads the JSON, sets one key, writes it
# back. So the store only ever GROWS. When a script is rewritten under a new key
# (or deleted outright because its result was retracted), THE OLD FINDING STAYS IN
# THE JSON FOREVER, with nothing left in the repo that produces it.
#
# That is not hypothetical. `16_agent_variance.R` replaced an earlier script whose
# `haiku_and_payload` finding was WITHDRAWN: it reported a payload effect measured
# on an arm where an agent fabricated six label files. The script was gone. The
# number was still in findings.json, still being served, still true-looking.
#
# An artifact that cannot un-say something is an artifact that will eventually
# publish something it has already retracted. So: delete, then rebuild. A finding
# exists if and only if a script in this repo computes it. See DEVIATIONS.md D11.
pilot: lint
	@rm -f pilot/results/findings.json
	@for s in $(PILOTS); do echo "── $$s"; Rscript $$s || exit 1; echo; done
	@$(MAKE) --no-print-directory findings

# The reviewer's entry point: no network, no key, same numbers.
pilot-offline: lint
	@rm -f pilot/results/findings.json
	@for s in $(PILOTS); do echo "── $$s"; Rscript $$s --offline || exit 1; echo; done
	@$(MAKE) --no-print-directory findings

# The dplyr self-masking bug (DEVIATIONS.md D4, D19) published "3100%" as a base
# rate, and I have now written it THREE times, twice in scripts that carry a
# comment swearing never to write it again. It does not stick as a habit. It
# sticks as a rule that RUNS, so it runs before every pilot.
#
# check_instrument.R is the second rule, and it exists because the rubric and the
# output schema named TWO DIFFERENT controlled vocabularies for `genre`, and 6,000
# labels went through three models without a single error being raised. The
# validator checked `tier` and had never been asked to look at `genre`. Nothing
# crashed; the field simply meant a different thing in each arm, and the variance
# would have been read as model disagreement, which is the quantity this project
# exists to measure. A CODEBOOK IS CODE. IT GETS A TEST. See DEVIATIONS.md D20.
#
# check_strata_partition.R is the third rule, and it is the one that should have
# existed first. The five original strata left 549,370 works (12.9% of the sampling
# frame) with an inclusion probability of EXACTLY ZERO: 366,856 that no predicate
# claimed, because aff_core excluded everything about Canada while about_only
# excluded everything affiliated with Canada, so a work that was both fell between
# them; plus 182,514 whose predicate evaluated to SQL NULL, which `WHERE p` and
# `WHERE NOT p` BOTH decline to select.
#
# Nothing failed. Every stratum returned exactly the n it asked for. The design drew
# a clean probability sample of 87% of the frame while every number computed from it
# said "the frame". The check that catches it is sum(N_h) == N: one line of
# arithmetic nobody ran, including me. It was found by an adversarial model adding up
# five weights in a summary table I had handed it. It runs on every build now.
# See DEVIATIONS.md D22 and finding 26.
lint:
	@Rscript pilot/check_self_masking.R
	@Rscript pilot/check_instrument.R
	@Rscript pilot/check_strata_partition.R

# The site renders its own COPY of findings.json (app/src/data/). Copying it here,
# in the same target that renders FINDINGS.md, is what keeps the two from
# diverging: they diverged once, and the stale copy kept serving a finding the
# pilot had already retracted (DEVIATIONS.md D11). The app's build guard then
# fails loudly on any finding that lacks a card, which is the second half of the
# same defense.
findings:
	@Rscript pilot/render_findings.R
	@for d in app/src/data site/src/data; do \
		if [ -d "$$d" ]; then cp pilot/results/findings.json "$$d/findings.json"; echo "synced $$d/findings.json"; fi; \
	done

harvest-status:
	@Rscript R/harvest_progress.R

# A proposal that needs a third page is not a proposal that respects the brief.
proposal: docs/proposal/metacan-proposal.pdf

docs/proposal/metacan-proposal.pdf: docs/proposal/metacan-proposal.md docs/proposal/tighten.tex pilot/results/findings.json
	@Rscript pilot/check_proposal_numbers.R
	@pandoc $< -o $@ \
		--pdf-engine=xelatex \
		-V geometry:margin=1.0cm \
		-V fontsize=10pt \
		-V mainfont="Helvetica Neue" \
		-V colorlinks=true -V linkcolor=black -V urlcolor=black \
		-H docs/proposal/tighten.tex
	@pages=$$(pdfinfo $@ | awk '/^Pages:/ {print $$2}'); \
	words=$$(wc -w < $<); \
	if [ "$$pages" -gt 2 ]; then \
		echo "FAIL: proposal is $$pages pages ($$words words); the call allows 2. Cut."; \
		exit 1; \
	else \
		echo "OK: proposal is $$pages page(s), $$words words."; \
	fi

# The preregistration is the OPPOSITE document from the 2-pager: no page limit, and
# one job, which is to be registered BEFORE the data are seen.
#
# It ships as ONE self-contained PDF, and the reason is the whole point of the
# appendix structure. A protocol that says "coded against docs/protocol/rubric.md" and
# links out to it is a protocol whose coding manual can be edited afterwards with
# nothing in the registered artifact to contradict it. So the rubric the pilot
# actually ran under (v1, LOCKED) travels inside the PDF as Appendix A, and the
# revision the screeners' disagreement argues for (v2, PROPOSED, NOT APPLIED)
# travels as Appendix B, clearly marked as not yet in force. After registration,
# "which rubric was this screened under" is answerable from the PDF alone.
#
# Headings are not demoted; each appendix keeps its own H1, retitled in place, so
# the section numbering inside the rubric survives the bundle intact.
PROTOCOL_PARTS := docs/protocol/PROTOCOL.md docs/protocol/rubric.md docs/protocol/rubric-v2-proposal.md

protocol: docs/protocol/PROTOCOL.pdf

docs/protocol/PROTOCOL.pdf: $(PROTOCOL_PARTS) docs/protocol/protocol.tex
	@mkdir -p build
	@cp docs/protocol/PROTOCOL.md build/protocol_bundle.md
	@printf '\n\\newpage\n\n' >> build/protocol_bundle.md
	@sed '1s|^# .*|# Appendix A. Screening rubric v1.0: LOCKED, and the instrument the pilot ran under|' \
		docs/protocol/rubric.md >> build/protocol_bundle.md
	@printf '\n\\newpage\n\n' >> build/protocol_bundle.md
	@sed '1s|^# .*|# Appendix B. Rubric v2: PROPOSED, NOT APPLIED, and not in force for any number in this document|' \
		docs/protocol/rubric-v2-proposal.md >> build/protocol_bundle.md
	@pandoc build/protocol_bundle.md -o $@ \
		--pdf-engine=xelatex \
		--toc --toc-depth=2 \
		-V geometry:margin=2.2cm \
		-V fontsize=11pt \
		-V mainfont="Helvetica Neue" \
		-V monofont="Menlo" \
		-V colorlinks=true -V linkcolor=black -V urlcolor=black \
		-H docs/protocol/protocol.tex 2> build/protocol.log; \
	pandoc_status=$$?; cat build/protocol.log; test $$pandoc_status -eq 0
# A DROPPED GLYPH IS A CHANGED RULE, SO IT FAILS THE BUILD.
#
# xelatex WARNS on a character the font cannot set and then renders the page
# without it. The first build of this document did exactly that: Helvetica Neue has
# no U+2192, and every rubric rule written as "X -> OUT" came out as "X  OUT". The
# appendix whose one job is to say what maps to what was quietly printing rules with
# the mapping deleted, and the build said OK.
#
# protocol.tex now maps the arrows. But the next unmapped glyph someone types into
# the rubric would fail the same way, silently, and the PDF is the artifact that gets
# REGISTERED. So the warning is promoted to an error: if xelatex could not set a
# character, there is no PDF worth registering.
	@if grep -q "Missing character" build/protocol.log; then \
		echo ""; \
		echo "FAIL: xelatex could not set these characters, and dropped them from the PDF:"; \
		grep -o "There is no .\+ (U+[0-9A-F]*)" build/protocol.log | sort -u | sed 's/^/  /'; \
		echo ""; \
		echo "A dropped glyph in a coding manual is a changed instruction. Map it in docs/protocol/protocol.tex."; \
		rm -f $@; exit 1; \
	fi
	@echo "OK: protocol is $$(pdfinfo $@ | awk '/^Pages:/ {print $$2}') pages, $$(wc -w < build/protocol_bundle.md) words, no dropped glyphs."

clean:
	rm -f docs/proposal/metacan-proposal.pdf docs/protocol/PROTOCOL.pdf
	rm -rf build

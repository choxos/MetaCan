.PHONY: pilot pilot-offline findings proposal deps clean help harvest-status

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
lint:
	@Rscript pilot/check_self_masking.R

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
proposal: proposal/metacan-proposal.pdf

proposal/metacan-proposal.pdf: proposal/metacan-proposal.md proposal/tighten.tex pilot/results/findings.json
	@Rscript pilot/check_proposal_numbers.R
	@pandoc $< -o $@ \
		--pdf-engine=xelatex \
		-V geometry:margin=1.0cm \
		-V fontsize=10pt \
		-V mainfont="Helvetica Neue" \
		-V colorlinks=true -V linkcolor=black -V urlcolor=black \
		-H proposal/tighten.tex
	@pages=$$(pdfinfo $@ | awk '/^Pages:/ {print $$2}'); \
	words=$$(wc -w < $<); \
	if [ "$$pages" -gt 2 ]; then \
		echo "FAIL: proposal is $$pages pages ($$words words); the call allows 2. Cut."; \
		exit 1; \
	else \
		echo "OK: proposal is $$pages page(s), $$words words."; \
	fi

clean:
	rm -f proposal/metacan-proposal.pdf

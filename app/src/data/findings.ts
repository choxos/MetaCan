import rawFindings from './findings.json'

/**
 * Typed view over pilot/results/findings.json.
 *
 * findings.json is a build artefact of the pilot: `make pilot` regenerates it
 * from live OpenAlex responses, `make pilot-offline` re-derives it from the raw
 * responses archived under pilot/raw/. It is the single source of every number
 * this site displays.
 *
 * Nothing in the UI may hard-code a figure. If a number is on screen, it was
 * read from here, which is what stops the prose drifting from the code that
 * produced it. The annotation `const raw: FindingsFile = rawFindings` is the
 * enforcement: re-run the pilot with a changed schema and the build fails
 * rather than the page quietly rendering `undefined`.
 */

/** The four polysemous terms the pilot probed. Keys are verbatim OpenAlex queries. */
export interface PolysemyMap {
  reproducibility: number
  '"peer review"': number
  '"open access"': number
  '"open science"': number
}

export type PolysemyTerm = keyof PolysemyMap

export const POLYSEMY_TERMS: readonly PolysemyTerm[] = [
  'reproducibility',
  '"peer review"',
  '"open access"',
  '"open science"',
] as const

interface FindingsFile {
  topics: {
    headline: string
    values: {
      n_topics_in_taxonomy: number
      n_topics_naming_field: number
      topics_naming_field: string[]
      n_candidate_topics: number
      n_fields_spanned: number
      fields_spanned: string[]
      candidate_topic_ids: string[]
    }
    computed_at_utc: string
  }
  affiliation_gap: {
    headline: string
    values: {
      topic_space_total: number
      with_raw_affiliation: number
      without_raw_affiliation: number
      pct_without: number
    }
    computed_at_utc: string
  }
  erudit: {
    headline: string
    values: {
      openalex_sources_matching_erudit: number
      oai_endpoint: string
      oai_repository_name: string
      oai_earliest_datestamp: string
      oai_harvestable_sets: number
    }
    computed_at_utc: string
  }
  language_gap: {
    headline: string
    values: {
      canadian_topic_works: number
      n_english: number
      n_french: number
      pct_french: number
      en_lexicon_canadian_hits: number
      fr_lexicon_canadian_hits: number
      fr_lexicon_world_hits: number
      canada_share_of_world_french: number
    }
    computed_at_utc: string
  }
  polysemy: {
    headline: string
    values: {
      hits_alone: PolysemyMap
      hits_alone_and_on_topic: PolysemyMap
      topic_space_precision_pct: PolysemyMap
      disciplined_lexicon_hits: number
      worst_term: string
    }
    computed_at_utc: string
  }
  canadian_linkage: {
    headline: string
    values: {
      by_affiliation: number
      by_funder: number
      about_canada: number
      about_canada_no_affiliation: number
      funder_works: Record<string, number>
      sshrc_works: number
      nserc_works: number
      nserc_to_sshrc_ratio: number
      affiliation_noise: Record<string, number>
    }
    computed_at_utc: string
  }
  capture_recapture_fails: {
    headline: string
    values: {
      route1_topic: number
      route2_naive_lexical: number
      overlap: number
      observed_union: number
      lincoln_petersen_estimate: number
      entire_topic_space_all_countries: number
      canada_observed_share_pct: number
      canada_implied_share_pct: number
      estimator_void: boolean
    }
    computed_at_utc: string
  }
  openalex_is_metered: {
    headline: string
    values: {
      observed_retry_after_s: number
      observed_ratelimit_limit: number
      observed_free_tier_usd: number
      observed_cost_per_call_usd: number
      frame_size_works: number
      per_page_max: number
      calls_for_one_pass: number
      days_on_free_tier_per_pass: number
      prepaid_cost_per_pass_usd: number
    }
    computed_at_utc: string
  }
  base_rate: {
    headline: string
    values: {
      n_screened: number
      screener: string
      sampling_frame: string
      tier_counts: Record<string, number>
      n_in_scope_t1_t2: number
      base_rate_pct: number
      base_rate_ci_lo_pct: number
      base_rate_ci_hi_pct: number
      canadian_frame_size: number
      estimated_field_size: number
      estimated_field_lo: number
      estimated_field_hi: number
      /**
       * The topic route's yield. Note what is NOT here any more:
       * `topic_route_coverage_pct`, which divided this figure by
       * `estimated_field_size` and called the quotient coverage. A retrieved set
       * and a true field size are not commensurable, so the ratio had no
       * estimand behind it. The pilot withdrew it; `topic_route_recall` measures
       * the same intent directly, against the rubric. The site's correction
       * notice is the only thing still allowed to name the old figure, and it
       * derives it (see SUPERSEDED_COVERAGE_PCT) rather than quoting it.
       */
      topic_route_retrieved: number
      /**
       * True, and the reason nothing on this site renders the interval above as
       * "the" uncertainty on the base rate. It is sampling error on ONE
       * screener's labels. Swap the screener and the estimate lands outside it
       * (finding 10), so the honest range is the screener-swap range, not this.
       * The card shows the point estimate and lets the finding's own caveat name
       * the real uncertainty; the binomial bounds stay in the values table,
       * where a raw quantity is allowed to be raw.
       */
      binomial_ci_is_not_the_uncertainty: boolean
      caveat: string
    }
    computed_at_utc: string
  }
  base_rate_robustness: {
    headline: string
    values: {
      partition: string
      /**
       * The harness lost records, and it lost them non-randomly on the ONE
       * covariate this finding turns on (DEVIATIONS.md D2). 6,202 records went to
       * the screener; 5,737 labels came back. The 465 that vanished are richer in
       * abstract-less works (40.2%) than the ones that did not (31.5%), and the
       * difference is not chance. So the abstract effect below is measured on a
       * sample from which abstract-less records were selectively removed. This is
       * a limitation OF the finding, it is surfaced on the finding's own card, and
       * the direction of the bias it induces is not assumed here.
       */
      records_sent_to_screener: number
      records_silently_lost: number
      records_lost_pct: number
      pct_no_abstract_among_lost: number
      pct_no_abstract_among_labelled: number
      chisq_p_loss_bias: number
      losses_are_biased: boolean
      /** The superseded check. Era was the wrong covariate; abstract recovery is the right one. */
      works_2000_09: number
      works_2020_25: number
      old_to_new_ratio: number
      partition_skews_old: boolean
      base_rate_by_era_pct: Record<string, number>
      chisq_p_era: number
      era_events: number
      era_check_is_underpowered: boolean
      /**
       * The main effect, and now the whole of this finding.
       *
       * 31.5% of the partition carries no abstract, and the screen finds 0.78%
       * metaresearch there against 1.55% where one exists (p = 0.023), which
       * survives adjustment for publication year and language. A third of the
       * frame is screened on its title alone and the screen finds half as much
       * there. That is a real coverage problem, and it is the reason the audit is
       * stratified on abstract availability.
       */
      no_abstract_share_pct: number
      base_rate_no_abstract_pct: number
      base_rate_has_abstract_pct: number
      chisq_p_abstract: number
      abstract_effect_x: number
      /**
       * WITHDRAWN, and kept in the artefact only so the retraction can name it.
       *
       * The pilot once claimed the blindness was DIFFERENTIAL by tradition: that
       * T2 (STS, LIS, the adjacent traditions this challenge exists to include)
       * lost 3.6x against T1's 1.4x. That was the proposal's entire answer to the
       * inclusiveness judging criterion, and it is gone. The T2 no-abstract cell
       * holds FOUR works, and the interaction test, which asks the only question
       * that matters here (does T2's penalty actually differ from T1's?), gives
       * p = 0.141. There is no evidence it does.
       *
       * These two keys are listed in WITHDRAWN below, so the provenance table
       * strikes them through and labels them rather than printing them as if they
       * were still claims. They may not appear on a card face, and they do not.
       */
      t1_penalty_x: number
      t2_penalty_x: number
      t2_no_abstract_cell_count: number
      interaction_p: number
      differential_is_supported: boolean
      differential_claim_withdrawn: boolean
      /**
       * WITHDRAWN: "missing abstracts track older, non-English records: Érudit's
       * exact profile." It is backwards on both counts, and these five fields are
       * how it was caught. The no-abstract works are NEWER (2013.7 against 2010.3),
       * the stratum is 99% ENGLISH, and English works are about 2.5 times likelier
       * to lack an abstract than non-English ones (32.0% against 12.7%). The claim
       * inferred a francophone platform's profile from an almost entirely
       * anglophone stratum. The sentence is deleted rather than softened.
       */
      no_abstract_mean_year: number
      has_abstract_mean_year: number
      no_abstract_stratum_pct_english: number
      p_no_abstract_given_english_pct: number
      p_no_abstract_given_non_english_pct: number
      erudit_profile_claim_holds: boolean
      /**
       * Live, and not to be confused with the withdrawn claims above: it names the
       * direction of the MAIN effect (the partition over-represents abstract-less
       * works, where the screen finds less, so the headline base rate likely
       * under-states the frame's). The pilot computes it rather than asserting it.
       */
      residual_bias_direction: string
      supersedes: string
      caveat: string
    }
    computed_at_utc: string
  }
  topic_route_recall: {
    headline: string
    values: {
      n_screened: number
      n_metaresearch: number
      n_retrieved_by_route: number
      true_positives: number
      false_positives: number
      false_negatives: number
      recall_pct: number
      recall_ci_lo_pct: number
      recall_ci_hi_pct: number
      precision_pct: number
      precision_ci_lo_pct: number
      precision_ci_hi_pct: number
      /**
       * The OpenAlex field each missed work was filed under instead. The pilot
       * takes the top six, so these count 51 of the 66 misses, not all of them;
       * anything rendering this must say "most often", never "all".
       */
      missed_works_by_field: Record<string, number>
      scored_by: string
      route_size_implied_by_sample: number
      route_size_from_api: number
      reconciliation_gap_x: number
      supersedes: string
      caveat: string
    }
    computed_at_utc: string
  }
  /**
   * Finding 13: the cost model, and the design it wrongly talked me into.
   *
   * The pilot once modelled the screen as one full rubric per WORK. But the rubric
   * is a system prompt: it is sent once per CALL, and the pilot's own chunk files
   * batch a median of 155 works per call, so it amortises 155-fold. The bill was
   * overstated 5.1x, and the error was not cosmetic. It is what made me put a cheap
   * TRIAGE in front of the screen, which is a retrieval step, in a project whose
   * central finding (12) is that retrieval is precisely what destroys these maps.
   *
   * With the arithmetic right the triage saves $110 and costs the thesis, so it is
   * deleted, and the full rubric now runs over every work in the frame.
   */
  screening_cost: {
    headline: string
    values: {
      measured_from: string
      chars_per_token_assumed: number
      tokens_per_work: number
      tokens_rubric: number
      tokens_per_label: number
      /** The number the old model missed. The rubric is amortised over this many works. */
      batch_works_per_call: number
      frame_size: number
      grant_usd_approx: number
      /**
       * WITHDRAWN, and kept only so the retraction can name it: $24,379, the figure
       * this site once led with and called "8.4x the grant". It charged the rubric
       * once per work. It is listed in WITHDRAWN below and struck through in the
       * provenance table.
       */
      naive_cost_charging_rubric_per_work_usd: number
      /** The honest figure, and what the card leads with. */
      corrected_cost_two_screeners_usd: number
      cost_overstatement_x: number
      /** The design that replaces the prefilter: full rubric, every work, no triage. */
      cost_full_rubric_whole_frame_cheap_usd: number
      cost_full_rubric_whole_frame_sonnet_usd: number
      cost_second_screener_on_sample_usd: number
      second_screener_n: number
      total_no_prefilter_usd: number
      left_for_human_coder_usd: number
      /**
       * False, and this is the headline. The triage saves $110 (prefilter_saving_usd
       * is NEGATIVE, so it does not even save that) and buys a retrieval step in a
       * project that exists to show retrieval cannot be trusted. Deleted.
       */
      prefilter_needed: boolean
      prefilter_design_total_usd: number
      prefilter_saving_usd: number
      prefilter_deleted_because: string
      pilot_works_screened: number
      frame_to_pilot_ratio: number
      method_that_scales: string
      supersedes: string
      caveat: string
    }
    computed_at_utc: string
  }
  /**
   * Finding 14: the audit turning its instruments on itself.
   *
   * The design's own validation step could not measure the thing it exists to
   * measure. A simple random sample of a 3.2M-record rejected mass expects 0.43
   * hits from the 600 records budgeted, and seeing 20 would take 1,873 coder-hours
   * against 65 planned. Score-stratified oversampling only half-rescues it,
   * because it finds the works the screen ALMOST caught and stays blind to the
   * ones it rejected confidently, which finding 11 says are precisely the T2 and
   * no-abstract works this challenge exists to include.
   */
  audit_power: {
    headline: string
    values: {
      problem: string
      /**
       * Bigger than it was, and finding 13 is why: deleting the prefilter means the
       * full rubric now rejects the whole frame rather than a triaged remnant, so
       * the screened-out mass grows and the naive audit gets WORSE. A correction
       * that made one number look better made this one look worse, which is what
       * an honest correction does.
       */
      screened_out_pool: number
      screened_out_is_the_screens_rejects: boolean
      audit_screened_out_budgeted: number
      expected_hits_at_95_recall: number
      codings_needed_for_20_hits_at_95_recall: number
      coder_hours_needed: number
      coder_hours_budgeted: number
      naive_audit_is_powered: boolean
      disputed_in_boundary: number
      disputed_in_settled_rejects: number
      misses_concentrate_near_threshold: boolean
      /**
       * Rewritten upstream, and the rewrite matters: this string used to cite
       * finding 11's 3.6x differential as if it were measured. It now argues the
       * blind spot as a MECHANISM read off the rubric's own text (judge on the
       * title alone when the abstract is missing; T2 work may use none of the
       * field's vocabulary; a work with neither is rejected confidently), and it
       * names the withdrawn figure as withdrawn. The site's prose says the same.
       */
      blind_spot: string
      blind_spot_is_a_mechanism_not_a_measurement: boolean
      instrument_1: string
      instrument_2: string
      reference_venues: string[]
      n_labelled_works: number
      n_in_scope: number
      caveat: string
    }
    computed_at_utc: string
  }
  /**
   * Finding 15: the finding that attacks the fixes, and wins twice.
   *
   * (A) Finding 14 promotes "score any filter against the 5,737 rubric labels" to a
   * general instrument. But those labels are a MACHINE's, so the instrument measures
   * agreement with a machine, not accuracy, and finding 10 already proved that
   * quantity swings by a factor of two when the machine changes. It swings here: the
   * topic route recalls 12% against screener A and 7% against screener B. The
   * CONCLUSION strengthens (the second screener thinks the route is worse), but the
   * NUMBER is not a measurement against truth, and this site leads with that number.
   * So it is caveated where it leads, not only where it is explained.
   *
   * (B) The pilot holds exactly ONE French in-scope work. Estimating a French
   * sensitivity would need ~1,620 coded French records against an audit budget of
   * 1,000, so the French stratum is not underpowered, it is unpowered, and no
   * feasible n fixes it inside an OpenAlex-only frame. That is NOT a fact about
   * Canadian scholarship. Érudit matches zero OpenAlex sources (finding 3), so the
   * francophone literature is not thin in this frame, it is largely ABSENT from it.
   * French power therefore rests on the Érudit harvest, which the pilot verified
   * (379 live sets) and did not run, and the proposal states it as a CONDITION
   * rather than a promise: if the harvest does not deliver, the French claim is
   * withdrawn rather than fudged.
   *
   * This is the honest state of the inclusiveness criterion, and it is the second
   * time this project's answer to that criterion has had to be rewritten downward.
   */
  label_limits: {
    headline: string
    values: {
      route_recall_vs_screener_a_pct: number
      route_recall_vs_screener_b_pct: number
      /** Two-element 95% intervals. Validated at module load by `interval()`. */
      route_recall_a_ci: number[]
      route_recall_b_ci: number[]
      positives_screener_a: number
      positives_screener_b: number
      instrument_ii_is_model_dependent: boolean
      instrument_ii_caveat: string
      french_records_in_pilot: number
      /** One. The whole pilot holds one French in-scope work. */
      french_in_scope_in_pilot: number
      french_records_needed_for_20_positives: number
      audit_budget_records: number
      french_stratum_is_powered: boolean
      french_power_depends_on: string
      caveat: string
    }
    computed_at_utc: string
  }
  agreement: {
    headline: string
    values: {
      n_double_screened: number
      /**
       * The finding's real payload, and the reason the card quotes it beside the
       * agreement figure. Swap which model is called "the screener" and the base
       * rate moves 1.06% to 2.37%: a 2.24x spread, 37,032 to 83,022 works. The
       * artefact is explicit that quoting the agreement without this would be
       * "presenting the reassuring statistic", so the site does not.
       */
      base_rate_screener_a_pct: number
      base_rate_screener_b_pct: number
      swap_ratio_x: number
      field_size_screener_a: number
      field_size_screener_b: number
      published_binomial_ci_contains_b: boolean
      screener_a: string
      screener_b: string
      sampling: string
      raw_agreement_inout_pct: number
      weighted_agreement_pct: number
      cohens_kappa_inout: number
      n_disagree_inout: number
      gpt_in_claude_out: number
      claude_in_gpt_out: number
      agreement_by_stratum: {
        stratum: string[]
        n: number[]
        sel_prob: number[]
        agree_pct: number[]
        a_says_in: number[]
        b_says_in: number[]
      }
      caveat: string
    }
    computed_at_utc: string
  }
}

// Structural check against the committed artefact. A schema change breaks the
// build here, deliberately.
const raw: FindingsFile = rawFindings

export const findingsRaw = raw

/**
 * Every finding in the artefact, and nothing else.
 *
 * Derived from the file's own shape rather than hand-listed, so a finding cannot
 * exist in findings.json and be quietly absent from this union. Adding a
 * thirteenth finding upstream now forces three compile errors, by design: no
 * card in CARDS, no copy in the dictionary, no entry here. Silent drift between
 * the code and the write-up is the bug this whole project is about; the type
 * system is where we refuse to allow it.
 */
export type FindingId = keyof FindingsFile

/**
 * The headline figure of a finding, kept as data rather than a formatted string
 * so it can be rendered in either language (1 234 vs 1,234; 64,1 % vs 64.1%;
 * US$4,767 vs 4 767 $ US).
 *
 * `pct` is a percentage the pilot STATES, and it keeps the digits the pilot
 * stated it with. `pctDerived` is a percentage this site COMPUTES, and it is
 * rounded to one decimal, because a quotient of two integers is a float with
 * fifteen digits and printing them would be inventing precision. The distinction
 * matters most on the one figure this project had to retract: the superseded
 * 32.4% is derived here, on purpose, from the two quantities it wrongly divided.
 *
 * `num` is a bare quantity with no unit, which on this site means a p-value.
 * `year` is a mean publication year: a number that must NOT be group-separated,
 * because "2,013.7" is not a year.
 */
export type Hero =
  | { kind: 'int'; value: number }
  | { kind: 'ratio'; num: number; den: number }
  | { kind: 'pct'; value: number }
  | { kind: 'pctDerived'; value: number }
  | { kind: 'times'; value: number }
  | { kind: 'usd'; value: number }
  | { kind: 'num'; value: number }
  | { kind: 'year'; value: number }

/** A 95% interval on a figure, when the pilot computed one. */
export interface Interval {
  lo: Hero
  hi: Hero
}

/**
 * A second figure, shown beside the hero. The label is looked up in the
 * dictionary under `findings.stat[key]`, so the key is deliberately narrow.
 */
/**
 * Note what is NOT here any more: `t1Penalty` and `t2Penalty`.
 *
 * Finding 11's card used to carry them as its two secondary figures, on the
 * ground that "the instrument is worst on the people you most want to count" does
 * not belong in a footnote. It still would not, if it were true. It is withdrawn
 * (four works, interaction p = 0.141), so the keys that rendered it are deleted
 * rather than left lying around for something to reach for. The card now carries
 * the effect that survives: the base rate with an abstract, and without one.
 *
 * `stagedTotal` is gone for the same reason: there is no staged design any more,
 * because the prefilter that made it staged has been deleted.
 */
export type StatKey =
  | 'precision'
  | 'swap'
  | 'agreement'
  | 'noAbstractRate'
  | 'hasAbstractRate'
  | 'grantMultiple'
  | 'designTotal'
  // Finding 15. The same route, scored against two machines' labels, and the two
  // answers are not the same answer. Shown side by side on purpose: the point is
  // not either number, it is the distance between them.
  | 'recallScreenerA'
  | 'recallScreenerB'

export interface Stat {
  key: StatKey
  hero: Hero
  ci?: Interval
}

/**
 * One finding undercutting another, said on the card of the finding being undercut.
 *
 * Distinct from `caveat`, which is the artefact's own sentence quoted verbatim.
 * This is the SITE noticing that finding 15 limits finding 12's headline, and
 * saying so on FINDING 12's card, not only on finding 15's.
 *
 * The distinction is the whole reason this exists. A reader who opens /findings,
 * reads the 12% that this project leads with, and leaves, must not leave believing
 * 12% is a measurement against truth. It is recall against ONE machine's labels,
 * and the other machine says 7%. Putting that only on finding 15 would be filing
 * the correction where the people who need it will not go, which is a more genteel
 * version of not making it.
 *
 * Keyed like Stat, so the copy is looked up in `findings.limit[key]` and a new
 * limit cannot be added without a compile error until its copy exists.
 */
export type LimitKey = 'recallIsModelDependent'

export interface Limit {
  key: LimitKey
  /** The finding that establishes the limit. Its number is shown on the tag. */
  by: FindingId
  /** Figures substituted into the dictionary's template. */
  vars: Record<string, Hero>
}

/**
 * The found/missed split, as a proportion of one denominator.
 *
 * Teal is what the pipeline accounts for; amber is what it does not. "Does not"
 * is the pipeline's error, and it takes several forms: material it fails to
 * retrieve (findings 1, 2, 3, 6, 11), material it wrongly sweeps in or invents
 * (findings 5, 7), work it cannot afford to do (finding 8), and the boundary it
 * cannot settle (finding 10). All of them are the pipeline being wrong, and all
 * of them are amber.
 *
 * Two findings split a quantity rather than an error, and their labels say so:
 * finding 4, the francophone sliver against the rest, and finding 9, the field's
 * base rate against everything else Canada published. Finding 9 used to be an
 * error bar (retrieved works over an estimated field size), and that bar was the
 * discredited division; the error it was reaching for is now finding 12, where
 * the amber is the 66 metaresearch works the topic route did not retrieve.
 */
export interface Bar {
  found: number
  missed: number
  total: number
  foundPct: number
  missedPct: number
  /**
   * What the two segments are counted in.
   *
   * Most bars count works. Finding 11 is a share the pilot states only as a
   * percentage (31.5% of the partition carries no abstract) and never as a number
   * of works: deriving the works from the share would put a figure on screen that
   * the artefact does not contain, invented to one decimal place of rounding, on a
   * site whose whole argument is that a number must come from the thing that
   * computed it. Finding 13 is money. So the bar carries its unit and the legend
   * prints accordingly.
   */
  unit: BarUnit
}

export type BarUnit = 'count' | 'pct' | 'usd'

function bar(found: number, total: number, unit: BarUnit = 'count'): Bar {
  const missed = total - found
  return {
    found,
    missed,
    total,
    foundPct: total > 0 ? (found / total) * 100 : 0,
    missedPct: total > 0 ? (missed / total) * 100 : 0,
    unit,
  }
}

export interface Finding {
  id: FindingId
  /** Display order. 1–7 match pilot/results/FINDINGS.md; 8–11 continue the arc. */
  n: number
  /** The script that produced it. Note 6 and 7 are numbered the other way round on disk. */
  script: string
  /** Verbatim English headline from findings.json, for the tooltip / title attr. */
  headline: string
  computedAt: string
  hero: Hero
  /** The interval on the hero, where the hero is an estimate rather than a count. */
  heroCi?: Interval
  /** Secondary figures, shown beside the hero. */
  stats?: readonly Stat[]
  /** Another finding that limits this one. See Limit. */
  limit?: Limit
  bar: Bar
  /** Every key/value under `values`, flattened. Rendered as a provenance table. */
  values: FlatValue[]
  /**
   * The finding's own caveat, verbatim from findings.json.
   *
   * Rendered as an English quotation in both languages, and labelled as a quote.
   * Translating it in the app would let the translation drift from the artefact,
   * and a project whose entire thesis is "prose must not drift from the code"
   * does not get to make an exception for its own inconvenient sentences. The
   * two findings that carry one (the machine-screening base rate and the
   * inter-screener agreement) are precisely the two a reader is most likely to
   * over-read, so the caveat travels with the number.
   */
  caveat?: string
}

export interface FlatValue {
  key: string
  value: number | string | boolean
  /**
   * The artefact still carries this figure, and it is no longer a claim.
   *
   * The provenance table is a dump of the raw JSON, and deleting a row from it to
   * tidy away an embarrassment would be exactly the silent revision this project
   * exists to object to. So the row stays, struck through and labelled. The
   * retracted number remains auditable; it stops being assertable.
   */
  withdrawn?: boolean
}

/**
 * Flatten a finding's `values` object into an ordered key/value list, so each
 * card can show the raw JSON it was built from. Nested objects are dotted
 * (`funder_works.NSERC…`); arrays are summarised by length, since the card has
 * no room for eleven topic IDs and the repository has them anyway.
 */
function flatten(
  values: Record<string, unknown>,
  withdrawn: ReadonlySet<string> = new Set(),
  prefix = '',
): FlatValue[] {
  const out: FlatValue[] = []
  for (const [k, v] of Object.entries(values)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v === null || v === undefined) continue
    if (Array.isArray(v)) {
      out.push({ key: `${key}[]`, value: v.length })
    } else if (typeof v === 'object') {
      out.push(...flatten(v as Record<string, unknown>, withdrawn, key))
    } else if (
      typeof v === 'number' ||
      typeof v === 'string' ||
      typeof v === 'boolean'
    ) {
      out.push(withdrawn.has(key) ? { key, value: v, withdrawn: true } : { key, value: v })
    }
  }
  return out
}

const t = raw.topics.values
const a = raw.affiliation_gap.values
const e = raw.erudit.values
const l = raw.language_gap.values
const p = raw.polysemy.values
const c = raw.canadian_linkage.values
const cr = raw.capture_recapture_fails.values
const m = raw.openalex_is_metered.values
const br = raw.base_rate.values
const ag = raw.agreement.values
const brr = raw.base_rate_robustness.values
const rc = raw.topic_route_recall.values
const sc = raw.screening_cost.values
const ap = raw.audit_power.values
const ll = raw.label_limits.values

/**
 * A 95% interval the pilot states as a two-element array.
 *
 * JSON gives us `number[]`, which says nothing about length, and
 * `noUncheckedIndexedAccess` correctly makes `pair[0]` possibly undefined. Rather
 * than assert past that with a `!`, this throws at module load, which under
 * `next build` is static generation, which means the build stops. An interval that
 * silently renders "undefined% to undefined%" on the card that carries this
 * project's most important caveat is not a thing to find out about in production.
 */
function interval(pair: number[], key: string): Interval {
  const [lo, hi] = pair
  if (pair.length !== 2 || typeof lo !== 'number' || typeof hi !== 'number') {
    throw new Error(
      `findings.ts: ${key} must be a two-number interval, got ${JSON.stringify(
        pair,
      )}.`,
    )
  }
  return { lo: { kind: 'pct', value: lo }, hi: { kind: 'pct', value: hi } }
}

/**
 * Figures the artefact still carries that the site may not present as claims.
 *
 * The pilot does not delete a retracted number; it keeps it and records that it
 * is retracted, which is the only way a reader can check the retraction. The site
 * inherits that duty, so these keys survive in the provenance table, struck
 * through and labelled, and are barred from every card face.
 *
 * Being data rather than a convention, this is enforceable, and it is enforced
 * twice: the guard below fails the build if a key named here is not in the
 * artefact (a rename upstream would otherwise silently un-retract a number), and
 * the CARDS below carry none of them as a hero or a stat.
 */
const WITHDRAWN: Partial<Record<FindingId, readonly string[]>> = {
  // "T2 loses 3.6x against T1's 1.4x." Four works, interaction p = 0.141.
  // DEVIATIONS.md D6.
  base_rate_robustness: ['t1_penalty_x', 't2_penalty_x'],
  // "$24,379, eight times the grant." The rubric was charged once per work.
  // DEVIATIONS.md D7.
  screening_cost: ['naive_cost_charging_rubric_per_work_usd'],
}

function withdrawnKeys(id: FindingId): ReadonlySet<string> {
  return new Set(WITHDRAWN[id] ?? [])
}

/**
 * What the full-frame two-screener design costs, as a multiple of the grant.
 *
 * Derived, and rounded to one decimal, because it is a quantity this site
 * computes rather than one the pilot states. Unlike the ratio this project had to
 * retract, it is a ratio of two commensurable things: US dollars over US dollars,
 * a cost against a budget. Both come from findings.json.
 *
 * It reads 1.6x. It used to read 8.4x, off the cost that charged the rubric once
 * per work, and "eight times this grant" is the sentence that talked this project
 * into a prefilter it did not need. The numerator is now the corrected cost, so
 * the multiple corrects itself.
 */
const GRANT_MULTIPLE: number =
  Math.round(
    (sc.corrected_cost_two_screeners_usd / sc.grant_usd_approx) * 10,
  ) / 10

/**
 * One card per finding, keyed by id.
 *
 * A Record over FindingId, not an array, and that is the whole point: FindingId
 * is `keyof FindingsFile`, so TypeScript will not compile this object until every
 * finding in the artefact has a card. The count on the page is then
 * `FINDINGS.length`, derived from here, and there is no hand-maintained number
 * anywhere that can quietly disagree with the data.
 *
 * The array below is ordered from this by `n`, so display order stays editable
 * without ever being able to drop a finding on the floor.
 */
const CARDS: Record<FindingId, Finding> = {
  topics: {
    id: 'topics',
    n: 1,
    script: 'pilot/01_topics.R',
    headline: raw.topics.headline,
    computedAt: raw.topics.computed_at_utc,
    hero: { kind: 'ratio', num: t.n_topics_naming_field, den: t.n_topics_in_taxonomy },
    // Teal: topics that name the field. There are none. The bar is the point.
    bar: bar(t.n_topics_naming_field, t.n_topics_in_taxonomy),
    values: flatten(t),
  },
  affiliation_gap: {
    id: 'affiliation_gap',
    n: 2,
    script: 'pilot/02_affiliation_gap.R',
    headline: raw.affiliation_gap.headline,
    computedAt: raw.affiliation_gap.computed_at_utc,
    hero: { kind: 'pct', value: a.pct_without },
    bar: bar(a.with_raw_affiliation, a.topic_space_total),
    values: flatten(a),
  },
  erudit: {
    id: 'erudit',
    n: 3,
    script: 'pilot/03_erudit.R',
    headline: raw.erudit.headline,
    computedAt: raw.erudit.computed_at_utc,
    hero: {
      kind: 'ratio',
      num: e.openalex_sources_matching_erudit,
      den: e.oai_harvestable_sets,
    },
    // Of the sets Erudit exposes for harvesting, OpenAlex matches none.
    bar: bar(e.openalex_sources_matching_erudit, e.oai_harvestable_sets),
    values: flatten(e),
  },
  language_gap: {
    id: 'language_gap',
    n: 4,
    script: 'pilot/04_language_gap.R',
    headline: raw.language_gap.headline,
    computedAt: raw.language_gap.computed_at_utc,
    hero: { kind: 'pct', value: l.pct_french },
    bar: bar(l.n_french, l.canadian_topic_works),
    values: flatten(l),
  },
  polysemy: {
    id: 'polysemy',
    n: 5,
    script: 'pilot/05_polysemy.R',
    headline: raw.polysemy.headline,
    computedAt: raw.polysemy.computed_at_utc,
    hero: { kind: 'pct', value: p.topic_space_precision_pct.reproducibility },
    // The worst term: of everything `reproducibility` returns, this much is
    // actually on topic. The amber is noise no query can filter out.
    bar: bar(p.hits_alone_and_on_topic.reproducibility, p.hits_alone.reproducibility),
    values: flatten(p),
  },
  canadian_linkage: {
    id: 'canadian_linkage',
    n: 6,
    script: 'pilot/07_canadian_linkage.R',
    headline: raw.canadian_linkage.headline,
    computedAt: raw.canadian_linkage.computed_at_utc,
    hero: { kind: 'times', value: c.nserc_to_sshrc_ratio },
    bar: bar(
      c.by_affiliation,
      c.by_affiliation + c.about_canada_no_affiliation,
    ),
    values: flatten(c),
  },
  capture_recapture_fails: {
    id: 'capture_recapture_fails',
    n: 7,
    script: 'pilot/06_capture_recapture_fails.R',
    headline: raw.capture_recapture_fails.headline,
    computedAt: raw.capture_recapture_fails.computed_at_utc,
    hero: { kind: 'pct', value: cr.canada_implied_share_pct },
    // Everything above the observed union is a work the estimator invented.
    bar: bar(cr.observed_union, cr.lincoln_petersen_estimate),
    values: flatten(cr),
  },
  openalex_is_metered: {
    id: 'openalex_is_metered',
    n: 8,
    script: 'pilot/08_openalex_is_metered.R',
    headline: raw.openalex_is_metered.headline,
    computedAt: raw.openalex_is_metered.computed_at_utc,
    hero: { kind: 'int', value: m.calls_for_one_pass },
    // One free rate-limit window buys 1,000 of the 17,537 calls a single pass
    // needs. The amber is the rest of the pass you cannot make.
    bar: bar(m.observed_ratelimit_limit, m.calls_for_one_pass),
    values: flatten(m),
  },
  base_rate: {
    id: 'base_rate',
    n: 9,
    script: 'pilot/09_screening.R',
    headline: raw.base_rate.headline,
    computedAt: raw.base_rate.computed_at_utc,
    // What this finding is, and all it is: the prevalence of metaresearch in an
    // unfiltered Canadian sample, and therefore a denominator for the field.
    //
    // It is NOT a coverage figure. This card used to lead with the topic route's
    // yield divided by the field size implied here, and that division was wrong:
    // it put a retrieved set over a true field size. The bar showed the same bad
    // quotient. Both are gone. The hero is now the base rate itself, and the bar
    // is the base rate drawn: 75 works in scope out of 5,737 screened. What
    // retrieval actually missed is finding 12, which measures it against the
    // rubric instead of inferring it from a ratio.
    //
    // No interval is shown, deliberately. The pilot computes a binomial CI of
    // 1.03% to 1.64% and then, in the same breath, says it is not the
    // uncertainty: it is sampling error on ONE screener's labels, and swapping
    // the screener lands the estimate outside it (finding 10). Printing it beside
    // the hero would be the site asserting a precision the artefact disowns,
    // which is the same failure as the ratio this page retracts, one decimal
    // point quieter. The caveat below the card names the honest range instead.
    hero: { kind: 'pct', value: br.base_rate_pct },
    bar: bar(br.n_in_scope_t1_t2, br.n_screened),
    values: flatten(br),
    caveat: br.caveat,
  },
  agreement: {
    // Swap the screener and the field doubles.
    //
    // This card used to lead with 96.6% agreement, which sounds like reassurance
    // and is the wrong number to lead with. The artefact says so itself, in
    // capitals: the screener-swap range, not the binomial CI on either model
    // alone, is the honest uncertainty on the field's size. Call Claude the
    // screener and the base rate is 1.06%, or 37,032 works; call GPT the screener
    // and it is 2.37%, or 83,022. The published binomial CI does not contain the
    // other model's estimate, which is the whole point: the uncertainty that
    // matters is not sampling error, it is which instrument you picked.
    //
    // So the swap is the hero and agreement is the secondary figure. Quoting the
    // agreement alone, the artefact says, "would be presenting the reassuring
    // statistic". The two now travel together, in that order.
    id: 'agreement',
    n: 10,
    script: 'pilot/10_agreement.R',
    headline: raw.agreement.headline,
    computedAt: raw.agreement.computed_at_utc,
    hero: { kind: 'times', value: ag.swap_ratio_x },
    stats: [
      { key: 'agreement', hero: { kind: 'pct', value: ag.raw_agreement_inout_pct } },
    ],
    // The amber is small, and it is the interesting part: the works the two
    // screeners could not settle are where the field's boundary actually sits,
    // and they are the set the human audit oversamples. It is also, per the
    // caveat, exactly where two models sharing training data are most likely to
    // be wrong together.
    bar: bar(
      ag.n_double_screened - ag.n_disagree_inout,
      ag.n_double_screened,
    ),
    values: flatten(ag),
    caveat: ag.caveat,
  },
  base_rate_robustness: {
    // The finding that went looking for one bias, found a worse one, and then
    // over-read it. Two of its three claims are withdrawn; this card is what is
    // left, and what is left is enough.
    //
    // The obvious objection to the base rate is that its partition is a pile of
    // freshly ingested works, so the rate is really the rate of RECENT research.
    // That objection fails: the partition skews old, and the rate is flat across
    // eras. But era was the wrong covariate. What the partition actually selects
    // on is abstract recovery, and there the screen is not flat at all: 31.5% of
    // the frame carries no abstract, and in that third the screen finds 0.78%
    // metaresearch against 1.55% where an abstract exists. It survives adjustment
    // for year and language. A third of the frame is judged on its title alone,
    // and the screen finds half as much there.
    //
    // WHAT THIS CARD NO LONGER SAYS, and said until the review caught it:
    //
    //   1. That the blindness is DIFFERENTIAL by tradition, T2 losing 3.6x against
    //      T1's 1.4x. That claim was this proposal's entire answer to the
    //      inclusiveness criterion, which is precisely why it needed checking and
    //      precisely why it was not. The T2 no-abstract cell holds FOUR works, and
    //      the interaction is not significant (p = 0.141). Two penalties computed
    //      separately and eyeballed side by side are not a test of whether they
    //      differ. WITHDRAWN.
    //
    //   2. That missing abstracts track "older, non-English records: Erudit's
    //      exact profile". Backwards, both halves. The no-abstract works are NEWER
    //      (2013.7 against 2010.3) and the stratum is 99% ENGLISH; English works
    //      are 2.5x likelier to lack an abstract than non-English ones. The
    //      sentence inferred a francophone platform's signature from an almost
    //      entirely anglophone stratum, and it was hard-coded prose in a script
    //      that boasted, three lines above, of computing its conclusions rather
    //      than asserting them. WITHDRAWN.
    //
    // So the hero is the share of the frame with no abstract, the stats are the
    // main effect (the base rate with an abstract, and without), and the two
    // penalty keys are in WITHDRAWN, struck through in the provenance table. A
    // real coverage problem is not evidence of a differential one, and this card
    // is now careful about the difference.
    //
    // The bar is a share stated in percent, because the pilot never states it in
    // works; see Bar.unit. The caveat, quoted verbatim as always, carries the
    // other limitation: the harness silently dropped 465 records, non-randomly,
    // on this very covariate (DEVIATIONS.md D2).
    id: 'base_rate_robustness',
    n: 11,
    script: 'pilot/11_base_rate_robustness.R',
    headline: raw.base_rate_robustness.headline,
    computedAt: raw.base_rate_robustness.computed_at_utc,
    hero: { kind: 'pct', value: brr.no_abstract_share_pct },
    stats: [
      {
        key: 'noAbstractRate',
        hero: { kind: 'pct', value: brr.base_rate_no_abstract_pct },
      },
      {
        key: 'hasAbstractRate',
        hero: { kind: 'pct', value: brr.base_rate_has_abstract_pct },
      },
    ],
    bar: bar(100 - brr.no_abstract_share_pct, 100, 'pct'),
    values: flatten(brr, withdrawnKeys('base_rate_robustness')),
    caveat: brr.caveat,
  },
  topic_route_recall: {
    // The number this whole project turns on, and the one it got wrong once.
    //
    // Recall against the rubric: of the metaresearch works in the screened
    // sample, the fraction the topic route actually retrieved. No extrapolation,
    // no ratio of unlike things; just a 2x2 against the labels. The bar is the
    // argument: 9 found, 66 missed. Precision rides along as a secondary figure,
    // because a route that finds one work in eight, and is wrong about two in
    // five of those, is not a route you can build a field map on.
    id: 'topic_route_recall',
    n: 12,
    script: 'pilot/12_topic_route_recall.R',
    headline: raw.topic_route_recall.headline,
    computedAt: raw.topic_route_recall.computed_at_utc,
    hero: { kind: 'pct', value: rc.recall_pct },
    heroCi: {
      lo: { kind: 'pct', value: rc.recall_ci_lo_pct },
      hi: { kind: 'pct', value: rc.recall_ci_hi_pct },
    },
    stats: [
      {
        key: 'precision',
        hero: { kind: 'pct', value: rc.precision_pct },
        ci: {
          lo: { kind: 'pct', value: rc.precision_ci_lo_pct },
          hi: { kind: 'pct', value: rc.precision_ci_hi_pct },
        },
      },
    ],
    // The hero stays 12%. It is still the number this project leads with, and it
    // is still the right one: both screeners agree the topic route finds a small
    // fraction of the field, and the second one thinks it is WORSE. What changes
    // is what 12% is allowed to mean. It is recall against ONE machine's labels,
    // so it measures agreement with a machine and not accuracy, and finding 10
    // already showed that quantity moves by a factor of two when the machine
    // changes. It moves here: 7% against the other screener.
    //
    // So the limit is stated HERE, on the card that carries the number, and not
    // only on finding 15 where it was discovered. Only the human-coded probability
    // sample reaches truth, and until it runs, this figure is an opinion with a
    // confidence interval.
    limit: {
      key: 'recallIsModelDependent',
      by: 'label_limits',
      vars: {
        a: { kind: 'pct', value: ll.route_recall_vs_screener_a_pct },
        b: { kind: 'pct', value: ll.route_recall_vs_screener_b_pct },
      },
    },
    bar: bar(rc.true_positives, rc.n_metaresearch),
    values: flatten(rc),
    caveat: rc.caveat,
  },
  screening_cost: {
    // The finding whose own error changed the design, and then had to change it
    // back.
    //
    // This card used to lead with US$24,379 to screen the frame twice against the
    // full rubric, call it "eight times the grant", and conclude that the obvious
    // design was not merely strained but unfundable. It then proposed a cheap
    // TRIAGE in front of the screen to rescue it.
    //
    // The $24,379 was wrong. The script measured the per-work payload from the
    // pilot's real chunk files and then charged one full rubric PER WORK, while
    // those same chunk files batch a median of 155 works per call. The rubric is a
    // system prompt: it is sent once per CALL, so it amortises 155-fold. The bill
    // was overstated 5.1x. The honest figure is US$4,767, and that is now the
    // hero.
    //
    // THE PREFILTER IS DELETED, and that is the finding. It was never a neutral
    // engineering convenience: a triage is a RETRIEVAL STEP, and finding 12 is the
    // proof that retrieval is exactly what destroys these maps (the topic route
    // finds 12% of the field). The earlier version of this card knew that and
    // argued the prefilter was admissible anyway, because its recall would be
    // MEASURED rather than hoped for. That argument was sound and it is now moot,
    // because with the arithmetic right the triage saves $110 (prefilter_saving_usd
    // is negative) and buys a retrieval step this project has no business wanting.
    // A design element that survives only on a technicality, and exists only
    // because of my own miscalculation, does not survive.
    //
    // So the design is: the full rubric on EVERY work in the frame ($795), plus a
    // second screener on a 20,000-record stratified sample ($14). Total $808, and
    // ~$2,092 left for the human coder, who is the study. The second screener sits
    // on a sample rather than the frame because finding 10 says its output is a
    // process metric: locating the boundary and producing the screener-swap range
    // are both sample quantities, and buying precision on a number that is not the
    // estimand is not thrift.
    id: 'screening_cost',
    n: 13,
    script: 'pilot/13_screening_cost.R',
    headline: raw.screening_cost.headline,
    computedAt: raw.screening_cost.computed_at_utc,
    hero: { kind: 'usd', value: sc.corrected_cost_two_screeners_usd },
    stats: [
      { key: 'grantMultiple', hero: { kind: 'times', value: GRANT_MULTIPLE } },
      { key: 'designTotal', hero: { kind: 'usd', value: sc.total_no_prefilter_usd } },
    ],
    // Teal is what the grant can pay for; amber is the rest of the honest bill for
    // screening the frame twice. Same shape as finding 8, where the teal is the
    // calls one free rate-limit window buys and the amber is the pass you cannot
    // afford to finish. The denominator is the CORRECTED cost, so the amber shrank
    // by a factor of five when the arithmetic was fixed. That is the point: the
    // gap is real, and it was never as wide as I said.
    bar: bar(sc.grant_usd_approx, sc.corrected_cost_two_screeners_usd, 'usd'),
    values: flatten(sc, withdrawnKeys('screening_cost')),
    caveat: sc.caveat,
  },
  audit_power: {
    // The audit audits itself, and fails.
    //
    // Every other finding here turns the instruments on the pipeline. This one
    // turns them on the validation step, which is the part of the design that was
    // supposed to be beyond reproach, and it does not survive either.
    //
    // The screened-out stratum was to be sampled at random to measure what the
    // screen wrongly rejected. But the works it wrongly rejects are a vanishing
    // fraction of a 3.46M-record rejected mass: 600 records buys an expected 0.4
    // of them, and seeing twenty would take 2,009 coder-hours against the 65 the
    // grant pays for. Score-stratified oversampling helps and does not save it,
    // because it finds the works the screen ALMOST caught, and stays blind to the
    // ones it rejected confidently.
    //
    // The blind spot is argued as a MECHANISM, not asserted as a measurement, and
    // the artefact now says so itself (blind_spot_is_a_mechanism_not_a_measurement).
    // It is read straight off the rubric's own text: the rubric says judge on the
    // title alone when the abstract is missing, and the rubric says T2 work may use
    // none of the field's vocabulary, so a work with neither is rejected
    // confidently and sits deep in the settled rejects rather than near the
    // threshold. An earlier version of this finding cited finding 11's 3.6x
    // differential as though that had been measured. It had not, it is withdrawn
    // (DEVIATIONS.md D6), and the artefact was corrected upstream to stop leaning
    // on it. A prediction from the instrument's own instructions is a legitimate
    // thing to build an instrument to test. A withdrawn statistic is not.
    //
    // So recall gets measured two other ways, and the second is the interesting
    // one: known-item recall against a VENUE reference set. A Canadian-authored
    // paper in Social Studies of Science is T2 by where it was published, whatever
    // its abstract appears to be about. Venue is an external criterion, immune to
    // the aboutness that defeats topic retrieval (finding 12) and title-only
    // screening (finding 11), which makes it the only instrument that can see into
    // the blind spot at all. It is also, per DEVIATIONS.md D1, one of the five
    // fields the locked rubric mandated and the pilot harness silently withheld.
    //
    // And the FIRST instrument, scoring filters against the 5,737 rubric labels, is
    // itself limited: those labels are a machine's, so it measures agreement with a
    // machine rather than accuracy. That is finding 15, and it is why this card is
    // not the last one on the page.
    id: 'audit_power',
    n: 14,
    script: 'pilot/14_audit_power.R',
    headline: raw.audit_power.headline,
    computedAt: raw.audit_power.computed_at_utc,
    hero: { kind: 'int', value: ap.coder_hours_needed },
    // Teal is the coder time the grant actually buys; amber is the rest of the
    // bill the naive audit would run up looking for needles. Same shape as
    // findings 8 and 13: what you have, against what the obvious design needs.
    //
    // The amber grew when finding 13 was corrected. Deleting the prefilter means
    // the full rubric now rejects the whole frame instead of a triaged remnant, so
    // the screened-out mass is larger and the naive audit is further out of reach
    // than before. A correction that made one number look better made this one look
    // worse. That is what an honest correction does, and neither number is nudged
    // to keep the story tidy.
    bar: bar(ap.coder_hours_budgeted, ap.coder_hours_needed),
    values: flatten(ap),
    caveat: ap.caveat,
  },
  label_limits: {
    // The finding that attacks the fixes, and wins twice. It is the most
    // uncomfortable card on this site, and it is placed last so that it is the one
    // a reader leaves with.
    //
    // (A) THE HEADLINE IS ONE MODEL'S OPINION. Finding 14 promoted "score any
    // filter against the 5,737 rubric labels" to a general instrument, and it is a
    // good instrument: free, and it needs no needle-hunting in the discarded mass.
    // But those labels are a MACHINE's. Scoring against them measures agreement
    // with a machine, not accuracy, and finding 10 already proved that quantity
    // swings by a factor of two when you swap the machine. It swings here: the
    // topic route recalls 12% against screener A and 7% against screener B.
    //
    // The conclusion STRENGTHENS. Both screeners say the topic route finds a small
    // fraction of the field, and the second one says it is worse. But 12% is the
    // number this whole project leads with, on the homepage, and it is not a
    // measurement against truth. So finding 12's card carries the limit too (see
    // its `limit`), because a caveat filed only where it was discovered is a
    // caveat filed where the people who need it will not go.
    //
    // (B) THE FRENCH STRATUM IS NOT POWERED, AND NO FEASIBLE n FIXES IT. The pilot
    // holds exactly ONE French in-scope work. Seeing twenty French positives would
    // need ~1,620 coded French records against an audit budget of 1,000. So French
    // sensitivity cannot be estimated in an OpenAlex-only frame at any n this grant
    // can buy.
    //
    // That is NOT a fact about Canadian scholarship, and the card is required to
    // say so. Erudit matches ZERO OpenAlex sources (finding 3), so the francophone
    // literature is not THIN in this frame; it is largely ABSENT from it. French
    // power therefore rests entirely on the Erudit harvest, which the pilot
    // verified (379 live sets) and did NOT run. The proposal states French
    // sensitivity as a CONDITION rather than a promise: if the harvest does not
    // deliver enough French metaresearch to estimate it, the French claim is
    // withdrawn rather than fudged.
    //
    // This is the honest state of the inclusiveness criterion. It is the second
    // time this project's answer to that criterion has had to be revised downward
    // (the first was finding 11's withdrawn differential), and pretending otherwise
    // on a site about measuring what you missed would be self-refuting.
    //
    // The hero is the ONE. A single French in-scope work, rendered at 48px, is the
    // most eloquent thing in the artefact, and no sentence improves on it. The bar
    // is the power gap: what the audit can afford to code against what estimating a
    // French sensitivity would actually need. Same shape as findings 8, 13 and 14.
    id: 'label_limits',
    n: 15,
    script: 'pilot/15_what_the_labels_cannot_tell_us.R',
    headline: raw.label_limits.headline,
    computedAt: raw.label_limits.computed_at_utc,
    hero: { kind: 'int', value: ll.french_in_scope_in_pilot },
    stats: [
      {
        key: 'recallScreenerA',
        hero: { kind: 'pct', value: ll.route_recall_vs_screener_a_pct },
        ci: interval(ll.route_recall_a_ci, 'label_limits.route_recall_a_ci'),
      },
      {
        key: 'recallScreenerB',
        hero: { kind: 'pct', value: ll.route_recall_vs_screener_b_pct },
        ci: interval(ll.route_recall_b_ci, 'label_limits.route_recall_b_ci'),
      },
    ],
    bar: bar(ll.audit_budget_records, ll.french_records_needed_for_20_positives),
    values: flatten(ll),
    caveat: ll.caveat,
  },
}

/**
 * The findings, in display order, derived from CARDS.
 *
 * `FINDINGS.length` is what the page counts with, so the count on screen is the
 * number of findings that exist, not a number someone remembered to update. The
 * eyebrow said "12 analyses" for exactly as long as it took the pilot to produce
 * a thirteenth.
 */
export const FINDINGS: readonly Finding[] = Object.values(CARDS).sort(
  (x, y) => x.n - y.n,
)

/**
 * The assertion the coordinator asked for, and the one the type system cannot
 * make on its own.
 *
 * `Record<FindingId, Finding>` already guarantees that every finding DECLARED in
 * FindingsFile has a card. What it cannot see is a finding that exists in
 * findings.json and was never declared: TypeScript permits extra properties on an
 * imported JSON object, so a fourteenth finding would land in the artefact,
 * typecheck cleanly, and simply never appear on the site. That is the silent
 * drift this project exists to complain about, so it is a hard failure instead.
 *
 * It runs at module load, which under `next build` means static generation, which
 * means the build stops. Loudly, with the offending key named.
 */
const CARDED = new Set(Object.keys(CARDS))
const UNCARDED = Object.keys(rawFindings).filter((k) => !CARDED.has(k))

if (UNCARDED.length > 0) {
  throw new Error(
    `findings.json has ${UNCARDED.length} finding(s) with no card: ${UNCARDED.join(
      ', ',
    )}. Add them to FindingsFile, to CARDS, and to findings.items in src/lib/i18n.ts. ` +
      'A finding that exists in the artefact and not on the site is exactly the ' +
      'drift this project is about.',
  )
}

/** Display order must be a permutation of 1..N. A duplicate `n` silently hides a card. */
const ORDER = FINDINGS.map((f) => f.n)
const EXPECTED = FINDINGS.map((_, i) => i + 1)

if (ORDER.join(',') !== EXPECTED.join(',')) {
  throw new Error(
    `findings.ts: card order must be 1..${FINDINGS.length}, got ${ORDER.join(', ')}.`,
  )
}

/**
 * Every key named in WITHDRAWN must actually exist in the artefact.
 *
 * Without this, renaming `t2_penalty_x` upstream would not break anything: the
 * key would simply stop matching, the strike-through would silently vanish, and a
 * retracted number would quietly become a live-looking row in the provenance
 * table again. A retraction that can rot is not a retraction. So it fails the
 * build instead, with the key named.
 */
for (const [id, keys] of Object.entries(WITHDRAWN)) {
  const present = new Set(
    (CARDS[id as FindingId]?.values ?? []).map((v) => v.key),
  )
  const missing = (keys ?? []).filter((k) => !present.has(k))
  if (missing.length > 0) {
    throw new Error(
      `findings.ts: WITHDRAWN names ${missing.length} key(s) that are not in ` +
        `findings.json under "${id}": ${missing.join(', ')}. A withdrawn figure ` +
        'that no longer matches the artefact stops being struck through and ' +
        'starts reading as a live claim again. Fix the key, do not delete the ' +
        'retraction.',
    )
  }
}

/**
 * The four figures on the home KPI strip.
 *
 * Labels and note templates come from the dictionary; the figures come from
 * here and are substituted into {a} / {b}. The template carries the word order,
 * which differs between the two languages, so neither language ends up with an
 * English sentence wearing French words.
 */
/** Narrower than FindingId: only these four have a KPI label in the dictionary. */
export type KpiId =
  | 'topic_route_recall'
  | 'affiliation_gap'
  | 'language_gap'
  | 'erudit'

export interface Kpi {
  id: KpiId
  hero: Hero
  /** Figures substituted into the dictionary's `note` template. */
  vars: Record<string, Hero>
  /** Render the headline figure in the amber gap colour rather than ink. */
  tone?: 'gap'
}

export const KPIS: readonly Kpi[] = [
  {
    // The headline, and an indictment rather than an achievement. Of the 75
    // metaresearch works in the screened sample, the topic route retrieved 9. It
    // missed 66, and it missed them because OpenAlex files a work by what it is
    // about, so metaresearch about cardiology is filed as cardiology. The field
    // is invisible to topic retrieval precisely because it is about other fields.
    // That is the whole project in one figure, so it leads, and it is amber.
    //
    // It replaces the figure that used to lead here, which was the retrieved set
    // over the estimated field size, and which was wrong. See the correction
    // notice on /findings, and SUPERSEDED_COVERAGE_PCT below.
    //
    // It stays the headline, and finding 15 does not dislodge it: both screeners
    // agree the topic route finds a small fraction of the field, and the second one
    // says it is worse. But 12% is recall against ONE machine's labels, and the
    // other machine says 7%, so the note carries that. A number this project puts
    // at 48px on its front page does not get to be the one number whose caveat is
    // two clicks away.
    id: 'topic_route_recall',
    hero: { kind: 'pct', value: rc.recall_pct },
    vars: {
      a: { kind: 'int', value: rc.false_negatives },
      b: { kind: 'int', value: rc.n_metaresearch },
      c: { kind: 'pct', value: ll.route_recall_vs_screener_b_pct },
    },
    tone: 'gap',
  },
  {
    id: 'affiliation_gap',
    hero: { kind: 'pct', value: a.pct_without },
    vars: {
      a: { kind: 'int', value: a.without_raw_affiliation },
      b: { kind: 'int', value: a.topic_space_total },
    },
  },
  {
    id: 'language_gap',
    hero: { kind: 'pct', value: l.pct_french },
    vars: {
      a: { kind: 'int', value: l.n_french },
      b: { kind: 'int', value: l.canadian_topic_works },
    },
  },
  {
    id: 'erudit',
    hero: {
      kind: 'ratio',
      num: e.openalex_sources_matching_erudit,
      den: e.oai_harvestable_sets,
    },
    vars: {
      a: { kind: 'int', value: e.oai_harvestable_sets },
    },
  },
] as const

/** Finding 5, drawn out: one row per polysemous term, for the Recharts panel. */
export interface PolysemyRow {
  term: PolysemyTerm
  hits: number
  onTopic: number
  precision: number
}

export const POLYSEMY_ROWS: readonly PolysemyRow[] = POLYSEMY_TERMS.map((term) => ({
  term,
  hits: p.hits_alone[term],
  onTopic: p.hits_alone_and_on_topic[term],
  precision: p.topic_space_precision_pct[term],
}))

/**
 * Finding 11, drawn out: the OpenAlex field each missed work was filed under
 * instead of a metaresearch topic.
 *
 * This is the most eloquent thing in the artefact. A metaresearch paper about
 * reporting quality in cardiology trials is, on the page, mostly about
 * cardiology, so OpenAlex files it under cardiology. The field is invisible to
 * topic-based retrieval precisely because it is about other fields, and the more
 * seriously a study engages the domain it examines, the more surely it
 * disappears into it. Hence: Social Sciences, Medicine, Health Professions,
 * Business, Economics, Computer Science.
 *
 * The pilot takes the top six fields, so these rows account for 51 of the 66
 * misses, not all of them. Whatever renders this must say so.
 */
export interface MissedFieldRow {
  field: string
  missed: number
}

export const MISSED_BY_FIELD: readonly MissedFieldRow[] = Object.entries(
  rc.missed_works_by_field,
)
  .map(([field, missed]) => ({ field, missed }))
  .sort((x, y) => y.missed - x.missed)

/** Of the 66 misses, the number these six fields account for. */
export const MISSED_SHOWN: number = MISSED_BY_FIELD.reduce(
  (sum, r) => sum + r.missed,
  0,
)

/**
 * The figure this site got wrong, reproduced here so that the correction can
 * name it.
 *
 * This is the discredited division, performed on purpose and in exactly one
 * place: works the topic route retrieved (14,873) over the field size the base
 * rate implies (45,850). It is not a coverage estimate. It puts a retrieved set,
 * which is mostly not metaresearch and is not a random draw from the field, over
 * a true field size; a ratio of two incommensurable quantities has no estimand
 * behind it. It flattered the design, which is how it survived as long as it did.
 *
 * It is derived rather than hard-coded because the dictionary may not contain
 * numbers and a page may not assert one: even the figure we are retracting has
 * to come from findings.json. The recall interval, 5.6% to 21.6%, excludes it
 * entirely.
 */
export const SUPERSEDED_COVERAGE_PCT: number =
  (br.topic_route_retrieved / br.estimated_field_size) * 100

/**
 * The corrections, as data.
 *
 * `protocol/PROTOCOL.md` §9: "Any departure from this protocol will be recorded in
 * DEVIATIONS.md, with a reason and a date. Silent revision is itself a
 * research-integrity failure, and this is a metaresearch project." DEVIATIONS.md
 * is that file. This is the site honouring the same clause: a project whose thesis
 * is MEASURE WHAT YOU MISSED does not get to hide what it got wrong.
 *
 * Every figure here is read from findings.json, including the figures being
 * retracted. That is deliberate and it is the hard part: it would be far easier to
 * type "3.6x" into the dictionary as a dead string, and it would also mean the
 * site was asserting a number no longer under the artefact's control. A retraction
 * has to be as auditable as the claim it retracts, so the withdrawn figures are
 * pulled from the same JSON as the live ones and rendered by the same formatter.
 *
 * The dictionary holds the sentences and no numbers, as everywhere else on this
 * site; `vars` are substituted into the templates at render.
 */
export type CorrectionId =
  | 'coverage'
  | 'differential'
  | 'erudit_profile'
  | 'cost'
  | 'audit'
  | 'rubric'

export interface Correction {
  id: CorrectionId
  /** Where it is recorded: a DEVIATIONS.md entry, or the finding that caught it. */
  ref: string
  /** The card this correction bears on, so the entry can link to it. */
  finding?: FindingId
  /** Figures substituted into the dictionary's `{a}`, `{b}`, … templates. */
  vars: Record<string, Hero>
}

export const CORRECTIONS: readonly Correction[] = [
  {
    // D3. The figure this site led with. A retrieved set over a true field size:
    // two quantities that are not commensurable, so the ratio had no estimand
    // behind it. Recall, measured against the rubric, is 12%, and its interval
    // excludes the old figure entirely.
    id: 'coverage',
    ref: 'D3',
    finding: 'topic_route_recall',
    vars: {
      a: { kind: 'pctDerived', value: SUPERSEDED_COVERAGE_PCT },
      b: { kind: 'pct', value: rc.recall_pct },
    },
  },
  {
    // D6. The proposal's entire answer to the inclusiveness criterion, resting on
    // a cell of four works and an interaction that is not significant.
    id: 'differential',
    ref: 'D6',
    finding: 'base_rate_robustness',
    vars: {
      a: { kind: 'times', value: brr.t2_penalty_x },
      b: { kind: 'times', value: brr.t1_penalty_x },
      c: { kind: 'int', value: brr.t2_no_abstract_cell_count },
      d: { kind: 'num', value: brr.interaction_p },
    },
  },
  {
    // D5. Backwards on both counts, and hard-coded as prose three lines below a
    // comment boasting that the direction was computed rather than asserted.
    id: 'erudit_profile',
    ref: 'D5',
    finding: 'base_rate_robustness',
    vars: {
      a: { kind: 'pct', value: brr.no_abstract_stratum_pct_english },
      b: { kind: 'year', value: brr.no_abstract_mean_year },
      c: { kind: 'year', value: brr.has_abstract_mean_year },
      d: { kind: 'pct', value: brr.p_no_abstract_given_english_pct },
      e: { kind: 'pct', value: brr.p_no_abstract_given_non_english_pct },
    },
  },
  {
    // D7. The rubric is a system prompt, sent once per call, and the pilot's own
    // chunks batch 155 works per call. The bill was overstated fivefold, and the
    // overstatement is what bought the prefilter.
    id: 'cost',
    ref: 'D7',
    finding: 'screening_cost',
    vars: {
      a: { kind: 'usd', value: sc.naive_cost_charging_rubric_per_work_usd },
      b: { kind: 'usd', value: sc.corrected_cost_two_screeners_usd },
      c: { kind: 'times', value: sc.cost_overstatement_x },
      d: { kind: 'usd', value: sc.total_no_prefilter_usd },
    },
  },
  {
    // Finding 14, not a DEVIATIONS entry: the audit design was caught by this
    // project's own instruments rather than by a reviewer, which is the only item
    // on this list that can be said of.
    id: 'audit',
    ref: '14',
    finding: 'audit_power',
    vars: {
      a: { kind: 'int', value: ap.audit_screened_out_budgeted },
      b: { kind: 'num', value: ap.expected_hits_at_95_recall },
      c: { kind: 'int', value: ap.coder_hours_needed },
      d: { kind: 'int', value: ap.coder_hours_budgeted },
    },
  },
  {
    // D1, and the worst of them. The locked rubric names eight fields the screener
    // sees; the harness sent six. Venue, OpenAlex topic and field, Canadian
    // affiliations and funders were all withheld, so every headline number in the
    // pilot came from a screen that did not follow its own instrument. It is not
    // repaired by re-labelling the rubric to match the harness: that would be
    // fitting the instrument to the data after seeing the data.
    //
    // No vars. The count (six of eight) lives in DEVIATIONS.md and not in
    // findings.json, and this site does not assert a number the pilot did not
    // compute, not even about itself. The withheld fields are named instead, which
    // is more specific than the count anyway.
    id: 'rubric',
    ref: 'D1',
    vars: {},
  },
] as const

/** The lexicon comparison behind finding 4, used on the "what we cannot see" panel. */
export const LEXICON = {
  en: l.en_lexicon_canadian_hits,
  fr: l.fr_lexicon_canadian_hits,
  frWorld: l.fr_lexicon_world_hits,
  canadaShareOfWorldFrench: l.canada_share_of_world_french,
} as const

/** Érudit's OAI-PMH endpoint, so the site can link to the thing it is talking about. */
export const ERUDIT = {
  endpoint: e.oai_endpoint,
  repository: e.oai_repository_name,
  earliest: e.oai_earliest_datestamp,
  sets: e.oai_harvestable_sets,
} as const

/** The pilot's own timestamp, taken from the earliest finding. */
export const COMPUTED_AT: string = raw.topics.computed_at_utc

export function findingById(id: FindingId): Finding | undefined {
  return FINDINGS.find((f) => f.id === id)
}

/**
 * The findings the site points at by name, resolved once at module load.
 *
 * A missing id throws here, during the build, rather than rendering an
 * "undefined" into a heading. The two panels that draw a finding out into a
 * chart carry its number in their eyebrow, and that number is read from the
 * finding rather than typed into the dictionary, so re-ordering the pilot cannot
 * leave the page captioned with the wrong one.
 */
function requireFinding(id: FindingId): Finding {
  const f = findingById(id)
  if (!f) throw new Error(`findings.ts: no finding with id "${id}"`)
  return f
}

export const POLYSEMY_FINDING: Finding = requireFinding('polysemy')
export const RECALL_FINDING: Finding = requireFinding('topic_route_recall')

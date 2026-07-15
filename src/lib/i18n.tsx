import type { ReactNode } from "react";
import Link from "next/link";
import { type Lang } from "@/lib/lang";

/**
 * The bilingual dictionary (EN / FR) for the MétaCan site.
 *
 * This is not decoration. The project's inclusiveness thesis is bilingual
 * source coverage with separately reported French and English performance, and
 * one of its headline findings is that francophone scholarship is nearly
 * invisible to the infrastructure it maps (Érudit matches zero OpenAlex
 * sources; French is a few percent of the frame). An English-only site would
 * refute its own thesis.
 *
 * Conventions, inherited from the prototype catalogue in app/src/lib/i18n.ts:
 *   - The French is written, not machine-translated, in Canadian francophone
 *     scholarly vocabulary: métarecherche, base de sondage (the frame), tri
 *     (screening), trieur (screener), repérage (retrieval), voie (route),
 *     notice (record), grille verrouillée (locked rubric), instantané épinglé
 *     (pinned snapshot), constats (findings), science ouverte, libre accès.
 *   - NO NUMBERS LIVE HERE unless they are quoted verbatim in the English
 *     copy being mirrored. Figures come from the database or findings.json
 *     and are interpolated through the function-valued entries.
 *   - Entries that carry inline links are functions taking the locale path
 *     helper `p`, so a French paragraph links to the French page.
 *
 * `Dictionary = typeof en` and `fr: Dictionary`, so a key missing from either
 * language is a TYPE ERROR at build time, not a blank string in production.
 */

type P = (path: string) => string;

const en = {
  meta: {
    titleDefault: "MétaCan: the Canadian research frame",
    titleTemplate: "%s · MétaCan",
    description:
      "4,299,418 Canadian works from a pinned OpenAlex snapshot. Every record shows why it was found and why it counts as Canadian.",
    works: "Works",
    workNotFound: "Work not found",
    recent: "Recent Canadian works",
    recentNotFound: "Recent work not found",
    screen: "The three-model screen",
    analytics: "Analytics",
    landscape: "Landscape",
    findings: "Findings",
    api: "API",
    about: "About",
    qTitle: (hash: string) => `Cohort ${hash}`,
    qNotFound: "Cohort not found",
  },

  nav: {
    works: "Works",
    recent: "Recent",
    screen: "The screen",
    analytics: "Analytics",
    landscape: "Landscape",
    findings: "Findings",
    api: "API",
    about: "About",
    cohort: "Cohort builder",
    howBuilt: "How this was built:",
    menu: "Menu",
    close: "Close",
    navigation: "Main navigation",
  },

  common: {
    previous: "← previous",
    next: "next →",
    pageOf: (page: string, pages: string) => `page ${page} of ${pages}`,
    page: (page: string) => `page ${page}`,
    noTitle: "[no title]",
    notAvailable: "Not available",
    citations: "citations",
    yes: "yes",
    no: "no",
    toggleTheme: "Toggle theme",
  },

  footer: {
    line1: (
      <>
        Every number on this site is produced by a script in{" "}
        <a
          className="link"
          href="https://github.com/choxos/CaRN-data-challenge"
        >
          the repository
        </a>
        , and the errors are recorded in{" "}
        <a
          className="link"
          href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md"
        >
          DEVIATIONS.md
        </a>
        , written before submission.
      </>
    ),
    line2:
      "Data: OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT · Data CC-BY-4.0 · Ahmad Sofi-Mahmudi",
  },

  home: {
    eyebrow: "A pinned OpenAlex snapshot · all 482 partitions · 2000 to 2025",
    h1: "Don’t search for metaresearch. Search for Canada, then screen.",
    lead: (
      <>
        The usual design retrieves what <em>looks</em> like metaresearch, then
        asks whether it is Canadian. That makes the field boundary a property of
        your keyword list, and it is why such maps cannot be audited: you cannot
        measure what a lexicon never showed you. This frame is inverted. It is{" "}
        <strong style={{ color: "var(--ink)" }}>all Canadian research</strong>:
        an external, checkable criterion. Field membership therefore becomes a
        classification over an enumerable universe, not a retrieval over the
        literature.
      </>
    ),
    statFrameLabel: "Works in the frame",
    statFrameNote: "every Canadian work in the snapshot, each exactly once",
    statNoAffLabel: "Invisible to affiliation alone",
    statNoAffNote: (pct: string) =>
      `${pct}: an affiliation-only frame silently loses these`,
    statNoAbsLabel: "Carry no abstract",
    statNoAbsNote: (pct: string) =>
      `${pct}: a historical model assigned positive labels at roughly half the rate here`,
    statScreenedLabel: "Historical three-model pilot",
    statScreenedNote: "unvalidated machine labels from Opus 4.8 · GPT-5.6 · Grok 4.5",
    card1Title: "The historical pilot models disagreed.",
    card1P1: (
      <>
        In a historical unvalidated pilot, three frontier models screened the same 1,000 works against the same
        locked rubric, on the full eight-field payload the rubric always
        specified. Of the works <em>any</em> model called metaresearch, only{" "}
        <strong style={{ color: "var(--ink)" }}>
          37% were called metaresearch by all three
        </strong>
        , and 47% rest on a single model&apos;s opinion. Two screeners can agree
        on a <em>rate</em> while finding almost entirely different{" "}
        <em>works</em>. At a low model-positive rate, negative agreement can
        dominate the overall percentage.
      </>
    ),
    card1P2: (p: P) => (
      <>
        So the deliverable is not a base rate. It is the{" "}
        <Link href={p("/screen")} className="link">
          disagreement dossier
        </Link>
        : the works where these machine labels vary, which can inform rubric
        development but cannot replace human validation.
      </>
    ),
    card2Title: "A boolean over a four-state space",
    card2Body: (retr: string, eoc: string) => (
      <>
        OpenAlex records retraction as{" "}
        <code className="font-mono text-xs">is_retracted</code>, a boolean. The
        post-publication record has at least four states. Joined to Retraction
        Watch, this frame carries{" "}
        <strong style={{ color: "var(--ink)" }}>{retr}</strong> works with a
        recorded notice, of which{" "}
        <strong style={{ color: "var(--concern)" }}>{eoc}</strong> are{" "}
        <em>expressions of concern</em>; this is a state OpenAlex has no field
        for at all, and silently reports as{" "}
        <code className="font-mono text-xs">false</code>, which reads as
        &ldquo;fine&rdquo;.
      </>
    ),
    card2Link: "Browse the retraction record →",
  },

  works: {
    title: "Works",
    sub: "Every work in the frame. Each row carries the routes that admitted it, because a frame that forgets how it found something cannot be audited.",
    countCapped: "10,000+",
    countWorks: (n: string) => `${n} works`,
    matching: (q: string) => ` matching “${q}”`,
    empty: "No works match these filters.",
  },

  recent: {
    title: "Recent Canadian works",
    sub:
      "A rolling OpenAlex view of works published during the selected 15 to 30 day window. Deployment is configured to refresh it daily and retain every earlier successful window.",
    liveBadge: "scheduled daily layer",
    immutableTitle: "The frozen release does not move",
    immutableBody:
      "These records live in a separate table. They do not change the 4,299,418 work release, its findings, its classifier coverage, or any citable cohort link.",
    syncTitle: "Daily update status",
    awaitingFirstSync: "The first deployed OpenAlex update has not finished yet.",
    updatedAt: (date: string) => `Last completed ${date}`,
    window: (from: string, to: string) => `Publication window ${from} to ${to}`,
    stored: (count: string) => `${count} works stored in that window`,
    latestFailed:
      "The latest attempt did not finish. The last complete window remains available.",
    days: "Publication window",
    daysOption: (days: number) => `past ${days} days`,
    route: "Canadian route",
    routeAny: "Any route",
    routeAff: "Canadian affiliation",
    routeFund: "Canadian funder",
    routeVenue: "Canadian venue",
    routeAbout: "About Canada",
    search: "Title search",
    searchPlaceholder: "Search recent titles",
    apply: "Apply",
    reset: "Clear filters",
    filterErrors: {
      days: "Choose a publication window from 15 through 30 whole days.",
      pagination: "The page must be positive and the page size must be from 1 through 100.",
      route: "Choose one of the available Canadian routes.",
      year: "The publication year must contain four digits.",
      has_abstract: "Abstract availability must be true or false.",
      length: "The title query may contain 200 characters; exact values may contain 300.",
    },
    count: (count: string) => `${count} recent works`,
    empty: "No recent works match these filters.",
    institutionFilter: (name: string) => `Institution: ${name}`,
    removeInstitution: "Remove institution filter",
    removeFilter: "Remove this filter",
    filterHint: "Filter recent works by this exact value",
    published: (date: string) => `Published ${date}`,
    noAbstract: "no abstract",
    back: "← recent works",
    classificationTitle: "Classification status",
    classificationBody:
      "No category is asserted for this rolling layer. The current classifier has not passed human validation, so newly retrieved works remain unclassified.",
    abstractTitle: "Abstract",
    abstractPubMed: "Abstract supplied by PubMed.",
    abstractEuropePmc: "Abstract supplied by Europe PMC.",
    abstractOpenAlex: "Abstract reconstructed from OpenAlex.",
    abstractStored: "Abstract stored during the daily OpenAlex update.",
    abstractNone: "No abstract is available from the current sources.",
    recordTitle: "The live record",
    publicationDate: "Publication date",
    publicationYear: "Publication year",
    type: "Type",
    language: "Language",
    hasAbstract: "Has abstract",
    venue: "Venue",
    topic: "Topic",
    field: "Field",
    institutions: "Canadian institutions",
    funders: "Funders",
    keywords: "Keywords",
    authors: "Canadian-affiliated authors",
    identifiers: "Identifiers",
    pmid: "PMID",
    pmcid: "PMCID",
    openAlex: "OpenAlex",
    doi: "DOI",
    noAuthors: "No named Canadian-affiliated author is available.",
    lastSynced: (date: string) => `Database record refreshed ${date}`,
  },

  /**
   * The cohort builder: the front page, and the reason the site exists. Every
   * label here sits next to a value that is ALSO the API's vocabulary
   * (?category=metaresearch works in both languages), so only the human words
   * switch.
   */
  cohort: {
    title: "Build a cohort",
    sub: (n: string) =>
      `Query the ${n} Canadian works in the frame, see the exact count, export it, cite it. Every filter state is a URL; every URL is a reproducible query.`,
    topic: "Topic",
    venue: "Venue",
    typeaheadMin: "type 2+ characters to search",
    typeaheadNone: "no matches",
    typeaheadClear: "clear",
    category: "Category",
    anyCategory: "Any category",
    design: "Study design",
    anyDesign: "Any design",
    agreement: "Label agreement",
    agreementAny: "any model suffices",
    agreementAll: "all models must agree",
    labeled: "Label status",
    labeledAny: "Any",
    labeledOnly: "Labelled works only",
    labeledNone: "Unlabelled works only",
    retraction: "Retraction",
    retractionAny: "Any",
    retractionOnly: "Retracted only",
    retractionExclude: "Exclude retracted",
    abstract: "Abstract",
    abstractAny: "Any",
    abstractHas: "Has abstract",
    abstractNone: "No abstract",
    routes: "Canadian routes",
    routeAny: "any",
    routeRequire: "required",
    routeExclude: "excluded",
    routeAffLabel: "Affiliation",
    routeFundLabel: "Funder",
    routeVenueLabel: "Venue route",
    routeAboutLabel: "About Canada",
    routesHint:
      "The four routes compose: require the funder route and exclude affiliation to get the funder-only stratum no affiliation-based frame ever sees.",
    labelFacetsTitle: "Machine labels",
    labelFacetsHint:
      "Frontier-LLM labels, unvalidated, and sparse: most of the frame is not labelled yet. Filtering on a category or design restricts the cohort to labelled works; absence of a label is never a negative label.",
    /** The sentence that must travel with every filtered result set. */
    coverage: (labeled: string, total: string) =>
      `Labels cover ${labeled} of ${total} works in this cohort.`,
    coverageNote:
      "The rest are unlabelled, which is not a negative label: the label table is sparse today and grows as labelling rounds land.",
    categoryNames: {
      metaresearch: "Metaresearch",
      metaepi_narrow: "Meta-epidemiology (narrow)",
      metaepi_broad: "Meta-epidemiology (broad)",
      bibliometrics: "Bibliometrics",
      sts: "Science and technology studies",
      scholarly_communication: "Scholarly communication",
      open_science: "Open science",
      research_integrity: "Research integrity",
      // Not a facet: the model declined to judge on the evidence it was given.
      // It appears in Landscape counts because hiding it would overstate the rest.
      insufficient_payload: "Insufficient payload (model declined to judge)",
    } as Record<string, string>,
    designNames: {
      randomized_trial: "Randomized trial",
      nonrandomized_trial: "Non-randomized trial",
      observational: "Observational",
      systematic_review: "Systematic review",
      meta_analysis: "Meta-analysis",
      case_report: "Case report",
      qualitative: "Qualitative",
      simulation_or_modeling: "Simulation or modelling",
      bench_or_experimental: "Bench or experimental",
      theoretical_or_conceptual: "Theoretical or conceptual",
      not_applicable: "Not applicable",
      design_other: "Other design",
    } as Record<string, string>,
    exportTitle: "Export",
    exportCsv: "CSV",
    exportJson: "JSON",
    exportNote: (cap: string) =>
      `The current cohort, streamed from the database: every work column, the machine labels, the provisional scores, and the per-row validation status. Exports are capped at ${cap} rows.`,
    exportTruncated: (total: string, cap: string) =>
      `This cohort has ${total} works, more than the ${cap}-row export cap: the file will contain the first ${cap} ordered by OpenAlex id, and says so in its last line. Narrow the cohort, page the API, or rebuild the frame from the repository for the rest.`,
    citeButton: "Cite this cohort",
    citeWorking: "minting…",
    citeCopy: "copy",
    citeCopied: "copied",
    citeNote:
      "Mints a permanent /q/ link for this exact query. The same filters always produce the same link, whoever asks.",
    apiLine: "This cohort over the API:",
  },

  landscape: {
    title: "Landscape",
    sub: "What the machine-labelled subset of the frame looks like: categories, study designs, years, languages. Below it, the frame described by itself.",
    bannerTitle: "Read the coverage before the counts",
    banner: (labeled: string, frame: string, pct: string) =>
      `Labels cover ${labeled} of the ${frame} works in the frame (${pct}). Every count in this section is over that labelled subset only; it says what the labelled works look like, never how much of the frame is in a category. These are machine labels (frontier LLM, unvalidated), and an unlabelled work is NOT a negative.`,
    tileLabeled: "Labelled works",
    tileLabeledNote: "works with at least one model label",
    tileRows: "Label rows",
    tileRowsNote: "one per (work, model) pair",
    tileModels: "Models",
    tileModelsNote: "each work is labelled by up to three",
    byCategoryTitle: "Labelled works by category",
    byCategoryNote:
      "A work counts under a category if at least one model applied it; the darker figure requires every model that labelled the work to agree. The gap between the two columns is the models disagreeing, and that gap is a finding, not noise.",
    byDesignTitle: "Labelled works by study design",
    byDesignNote:
      "Same two readings: any model, and all models in agreement. No design label here is MEDLINE-validated yet; when that validation lands it will be marked explicitly.",
    byYearTitle: "Labelled works by year",
    byYearNote:
      "Where the labelling rounds have reached so far. This is coverage of the label table, not a property of the field.",
    byLangTitle: "Labelled works by language",
    byLangNote:
      "Coverage again: the labelling rounds sample the frame, and the frame is 6% French.",
    thCategory: "Category",
    thDesign: "Study design",
    thYear: "Year",
    thLang: "Language",
    thAny: "Any model",
    thAll: "All models agree",
    thLabeled: "Labelled works",
    frameTitle: "The frame itself",
    frameSub: (n: string) =>
      `Everything below is over all ${n} works, labelled or not. Every figure is a query against the database, computed at request time and cached for an hour; nothing here is a number someone typed.`,
    collaborationTitle: "Canadian institution collaboration",
    collaborationSub: (works: string, institutions: string) =>
      `This network covers ${works} works with at least one named Canadian institution and ${institutions} distinct institution labels. A line joins two institutions that appear on the same work; a thicker line means more shared works.`,
    collaborationWorks: "Works represented",
    collaborationInstitutions: "Institution labels",
    collaborationPeriod: "Publication years",
    collaborationPeriodValue: (from: number, to: number) => `${from} to ${to}`,
    collaborationAria:
      "Network of Canadian institutions connected by jointly affiliated works",
    collaborationAuthorAria:
      "Network of Canadian-affiliated authors connected by coauthored works",
    collaborationInstitutionMode: "Institutions",
    collaborationAuthorMode: "Authors",
    collaborationShown: "Institutions shown",
    collaborationAuthorsShown: "Authors shown",
    collaborationLegend: "Leading institutions in this view",
    collaborationAuthorLegend: "Leading authors in this view",
    collaborationStrongestPairs: "Strongest collaboration pairs in this view",
    collaborationWorksUnit: "works",
    collaborationFilterHint: "View all works with this institution",
    collaborationAuthorHint: "Open this author on OpenAlex",
    collaborationSharedWorks: "shared works",
    collaborationMethod: (cap: string, excluded: string, edgeLimit: string, displayLimit: string) =>
      `Edges are computed offline over the complete frame. Works naming more than ${cap} Canadian institutions are excluded from pair generation to control quadratic expansion; this affects ${excluded} works, which remain in the node counts. The stored network retains the ${edgeLimit} strongest pairs and this view displays up to ${displayLimit} nodes.`,
    authorNetworkPending:
      "Canadian-affiliated author names and affiliations are now shown on each work record. A complete author-to-author graph is withheld until the full 482-partition authorship reharvest finishes; the old one-partition source covers only 6,202 works and would be misleading here.",
  },

  qpage: {
    eyebrow: "A citable cohort query",
    title: (hash: string) => `Cohort q/${hash}`,
    sub: "This link names a query, not a result list. The filters below are stored; the counts are recomputed live against the pinned snapshot every time the page loads, because re-running the query is the honest way to reproduce a number.",
    filtersTitle: "The query",
    noFilters: "No filters: this cohort is the entire frame.",
    countsTitle: "Counts, recomputed now",
    totalLabel: "Works in the cohort",
    labeledLabel: "Carry machine labels",
    labeledNote:
      "frontier-LLM labels, unvalidated; the rest are unlabelled, not negative",
    snapshotTitle: "Snapshot",
    snapshotLine: (release: string, built: string) =>
      `OpenAlex pinned release ${release} (all 482 partitions, publication years 2000 to 2025); frame built ${built}. The snapshot is byte-identical forever, so this query returns the same works on any future day.`,
    citeTitle: "Suggested citation",
    citation: (n: string, hash: string, date: string, release: string) =>
      `Sofi-Mahmudi A. MetaCan: the Canadian research frame. Cohort q/${hash} (${n} works; retrieved ${date}). https://metacan.xera.ac/q/${hash}. Data: OpenAlex pinned snapshot ${release}.`,
    openBuilder: "Open this cohort in the builder →",
    apiLabel: "The same cohort over the API",
    exportLabel: "Export",
  },

  filters: {
    searchPlaceholder: "Search titles: full-text over 4,299,418 works",
    searchAria: "Search titles",
    searchButton: "Search",
    route: "Route",
    field: "Field",
    type: "Type",
    language: "Language",
    yearRange: "Year range",
    from: "from",
    to: "to",
    yearFrom: "Year from",
    yearTo: "Year to",
    consensus: "Screen consensus",
    sort: "Sort",
    flags: "Flags",
    retracted: "Retracted",
    noAbstract: "No abstract",
    anyRoute: "Any route",
    routeAff: "Canadian affiliation",
    routeFund: "Canadian funder",
    routeVenue: "Canadian venue",
    routeAbout: "About Canada",
    routeNoAff: "NO affiliation (invisible to the usual frame)",
    anyField: "Any field",
    anyType: "Any type",
    anyLanguage: "Any language",
    sortCited: "Most cited",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    consensusAny: "Any",
    consensus3: "3/3: all three models",
    consensus2: "2/3: contested",
    consensus1: "1/3: one model only",
    consensus0: "0/3: all three said out",
    active: (n: number) => `${n} filter${n === 1 ? "" : "s"} active`,
    clearAll: "clear all",
    appliedValues: "Applied exact-value filters",
    removeFilter: (label: string, value: string) =>
      `Remove ${label} filter: ${value}`,
  },

  workRow: {
    routeAffTitle: "Admitted by a Canadian affiliation",
    routeFundTitle: "Admitted by a Canadian funder",
    routeVenueTitle: "Admitted by a Canadian venue",
    routeAboutTitle: "Admitted by being about Canada",
    noAffTitle:
      "No Canadian affiliation. An affiliation-only frame would never have seen this work.",
    noAbstractChip: "no abstract",
    noAbstractTitle:
      "No abstract in OpenAlex. A historical pilot model assigned positive labels at roughly half the rate in this stratum. That is a machine-label association, not an accuracy estimate.",
    consensusAll: "3/3 metaresearch",
    consensusN: (n: number) => `${n}/3 metaresearch`,
    consensusAllTitle: "All three models called this metaresearch.",
    consensusNTitle: (n: number) =>
      `Only ${n} of 3 historical pilot models called this metaresearch. This is model disagreement, not a validated field label.`,
    retractionMissedTitle: (nature: string) =>
      `${nature}: recorded by Retraction Watch, NOT flagged by OpenAlex.`,
    retractionMissedSuffix: " · OpenAlex missed it",
    // Label provenance, on every cohort row. The framing is part of the data:
    // these are machine labels from frontier LLMs, unvalidated.
    labelsPrefix: "labels",
    labelChipTitle: (
      model: string,
      cats: string,
      design: string,
      conf: string,
    ) =>
      `Machine label (frontier LLM, unvalidated). ${model} said: categories [${cats || "none"}], study design ${design || "none"}, confidence ${conf || "unstated"}.`,
    labelNoCats: "no category",
    agreementAgree: "models agree",
    agreementAgreeTitle:
      "Every model that labelled this work gave the same categories and study design.",
    agreementSplit: "models split",
    agreementSplitTitle:
      "The models that labelled this work disagree on its categories or study design. The disagreement ships as data; it is not averaged away.",
    agreementSingle: "one model",
    agreementSingleTitle:
      "Only one model has labelled this work so far, so there is nobody to agree or disagree with.",
    unlabeled: "unlabelled",
    unlabelledTitle:
      "No model has labelled this work yet. The label table is sparse and grows as labelling rounds land; absence of a label is NOT a negative label.",
  },

  /**
   * Shown ONLY on views that carry machine scores (the work detail block and the
   * analytics spread row). The scores are a PROVISIONAL BASELINE from a model
   * whose maturity gate has not passed (pilot/results/maturity.json), and this
   * banner is the sentence that must travel with them everywhere they appear.
   */
  scoreBanner: {
    text: "Baseline scores from an immature model (maturity gate not passed, 7 training rounds). Scores rank; they never assert a category.",
  },

  workDetail: {
    back: "← all works",
    onOpenAlex: (id: string) => `${id} on OpenAlex`,
    citations: (n: string) => `${n} citations`,
    routeAffName: "Canadian affiliation",
    routeAffWhy:
      "An author listed a Canadian institution. This is the only route the usual frame has.",
    routeFundName: "Canadian funder",
    routeFundWhy:
      "A Canadian agency funded it. The work may carry no Canadian affiliation at all.",
    routeVenueName: "Canadian venue",
    routeVenueWhy: "It was published in a Canadian venue.",
    routeAboutName: "About Canada",
    routeAboutWhy: "Its subject is Canada, wherever its authors sit.",
    whyTitle: "Why is this work in the frame?",
    whySub:
      "A frame that forgets how it found something cannot be audited. These are the routes that admitted this work.",
    noAffCallout: (
      <>
        <strong style={{ color: "var(--mc-accent)" }}>
          No Canadian affiliation.
        </strong>{" "}
        An affiliation-only frame, the usual design, would never have seen this
        work. It is one of the works that make the case for inverting the frame.
      </>
    ),
    postPubTitle: "Post-publication record",
    nature: "Nature",
    reason: "Reason",
    date: "Date",
    flagged: "Flagged by OpenAlex?",
    flaggedYes: "Yes",
    flaggedNo:
      "No. Retraction Watch records this, and OpenAlex does not flag it.",
    rwSource: (
      <>
        Source: Retraction Watch, joined by DOI. OpenAlex records retraction as{" "}
        <code className="font-mono text-xs">is_retracted</code>, a boolean over
        a state space with at least four values, so it cannot express an
        expression of concern, a correction or a reinstatement; it reports them
        as <code className="font-mono text-xs">false</code>, which reads as
        &ldquo;fine&rdquo;.
      </>
    ),
    openalexOnly:
      "OpenAlex flags this work as retracted, but it carries no matching Retraction Watch record in this frame.",
    screenTitle: "Historical three-model pilot",
    screenAll: "all 1,000 screened works →",
    consensus3: (
      <>
        <strong style={{ color: "var(--in-scope)" }}>All three models</strong>{" "}
        labelled this work as metaresearch in the historical pilot. This is
        model agreement, not a validated field label.
      </>
    ),
    consensus0: (
      <>
        <strong style={{ color: "var(--out)" }}>All three models</strong> called
        this out of scope in the historical pilot. This is model agreement, not
        a human reference judgement.
      </>
    ),
    consensusN: (n: number) => (
      <>
        <strong style={{ color: "var(--contested)" }}>
          {n} of 3 models called this metaresearch.
        </strong>{" "}
        This is a historical pilot disagreement: the model label changes with
        the model asked. It is one of the 51 works in the disagreement dossier.
      </>
    ),
    stratumLine: (stratum: string, weight: string) =>
      `stratum: ${stratum} · design weight: ${weight} (the sample is stratified; any rate computed without the weight is wrong)`,
    genre: (g: string) => `genre: ${g}`,
    aboutCanada: "about Canada",
    confidence: "confidence",
    tierAdjacent: "T3 · adjacent, not in scope",
    labelsTitle: "Machine labels (frontier LLM, unvalidated)",
    labelsSub:
      "Per-model category and study-design labels from the labelling rounds. They are machine output, unvalidated, and the disagreement between models ships as data. No study design here is MEDLINE-validated yet.",
    labelCategories: "Categories",
    labelDesign: "Study design",
    labelDomain: "Domain",
    labelGenre: "Genre",
    labelAboutSystem: "About the Canadian research system",
    labelAboutTopic: "About a Canadian topic",
    scoresTitle: "Machine scores (provisional)",
    scoresSub:
      "The two teacher heads of the student model, read on this work. A score orders the frame for review; it never asserts a category, and the validation status ships verbatim with every row.",
    scoreOpus: "Opus teacher head",
    scoreGpt: "GPT teacher head",
    scoreSpread: "Teacher spread",
    scoreSpreadNote: "how far apart the two teachers sit on this one work",
    validationStatus: "Validation status",
    validationStatusNote:
      "verbatim from the scoring run: score_only means the number may rank works, and no category label ships from it",
    abstractTitle: "Abstract",
    abstractExpand: "Show full abstract",
    abstractCollapse: "Show less",
    abstractStored:
      "Stored with the screening record, where it is evidence for the labels above.",
    abstractPubMed:
      "Retrieved from PubMed through NCBI EFetch. Structured section labels are preserved.",
    abstractEuropePmc:
      "Retrieved from the Europe PMC core record. Structured section labels are preserved when supplied.",
    abstractOpenAlex:
      "Fetched live from OpenAlex and de-inverted. Abstracts are not stored in this database: the inverted indexes are 8.6 GB of the frame’s 9.3 GB of text, and the host has 13 GB free.",
    abstractUnavailable:
      "OpenAlex records an abstract for this work, but it could not be fetched just now.",
    abstractNone:
      "No abstract. This is not a gap in this database; OpenAlex has none either. 23.3% of the frame is in this state. A historical pilot model assigned positive labels at roughly half the rate here, which is a machine-label association rather than an accuracy estimate.",
    recordTitle: "The record",
    filterHint: "View all works with this value",
    venue: "Venue",
    topic: "Topic",
    field: "Field",
    authors: "Canadian-affiliated authors",
    institutions: "Canadian institutions",
    funders: "Funders",
    keywords: "Keywords",
    hasAbstract: "Has abstract in OpenAlex",
    pmid: "PMID",
    pmcid: "PMCID",
    api: "API",
  },

  screen: {
    eyebrow: (n: string) =>
      `${n} works · historical unvalidated pilot · Opus 4.8 · GPT-5.6 (high) · Grok 4.5 · one locked rubric`,
    h1: "The historical pilot models did not draw the same boundary.",
    p1: (v: {
      n: string;
      anyIn: number;
      n3: number;
      pct3: string;
      n1: number;
      pct1: string;
    }) => (
      <>
        In a historical unvalidated pilot, three frontier models screened the same {v.n} works, drawn from the real
        frame with known selection probabilities, against the same locked rubric
        on its full eight-field payload. Of the{" "}
        <strong style={{ color: "var(--ink)" }}>{v.anyIn}</strong> works{" "}
        <em>any</em> model called metaresearch, only{" "}
        <strong style={{ color: "var(--in-scope)" }}>{v.n3}</strong> ({v.pct3})
        were called metaresearch by all three, and{" "}
        <strong style={{ color: "var(--contested)" }}>{v.n1}</strong> ({v.pct1})
        rest on a single model&apos;s opinion.
      </>
    ),
    p2: (
      <>
        Two screeners can agree on a <em>rate</em> while finding almost entirely
        different <em>works</em>. At a roughly 1% model-positive rate, negative
        agreement can dominate the overall percentage. The table below exposes
        the individual model decisions; it does not establish field membership.
      </>
    ),
    statAnyLabel: "Any model said metaresearch",
    statAnyNote: "the historical pilot model-positive dossier",
    statAllLabel: "All three agreed",
    statAllNote: (pct: string) => `${pct} of the dossier: three-model agreement`,
    statTwoLabel: "Two of three",
    statTwoNote: "contested",
    statOneLabel: "One model only",
    statOneNote: (pct: string) =>
      `${pct} of the dossier rests on one model's opinion`,
    modelsTitle: "The three models are not interchangeable",
    modelsSub: (v: { n: string; anyIn: number }) => (
      <>
        How many of the {v.n} works each model called metaresearch (tier T1 or
        T2), on identical input. T3 is <em>adjacent</em> and does not count as
        in scope, which is why a model&apos;s count can never exceed the{" "}
        {v.anyIn} works in the dossier.
      </>
    ),
    modelsSpread: (
      <>
        Swap which historical pilot model you call &ldquo;the screener&rdquo; and
        the model-positive count moves. That spread measures variation among
        these model outputs; it is not uncertainty about the size of Canadian
        metaresearch.
      </>
    ),
    dossierTitle: "The disagreement dossier",
    dossierSub:
      "All three historical pilot verdicts, confidences and reasons side by side. These machine disagreements can inform rubric development; they do not replace human validation.",
    reasonLabel: "Model rationale",
    tabDossier: "The dossier (any model said in)",
    tab3: "3/3: model agreement",
    tab2: "2/3: contested",
    tab1: "1/3: one model only",
    tab0: "0/3: model agreement outside",
    tabAll: "All screened works",
    workCount: (total: string, one: boolean) =>
      `${total} work${one ? "" : "s"}`,
    thWork: "Work",
    thStratum: "Stratum",
    emptyView: "No works in this view.",
    tierT1: "T1: core metaresearch (counts as IN)",
    tierT2: "T2: metaresearch (counts as IN)",
    tierT3: "T3: adjacent. Does NOT count as in scope.",
    tierOut: "out of scope",
    foundTitle: "What the screen actually found",
    computed: (date: string) => `Computed ${date}`,
    allFindings: "all findings",
    dossierJson: "this dossier as JSON",
  },

  analytics: {
    title: "Analytics",
    sub: (n: string) =>
      `The frame, described by itself. Every figure is a query against the ${n} works, computed at request time and cached for an hour; nothing here is a number someone typed.`,
    tileWorks: "Works in the frame",
    tileNoAff: "No Canadian affiliation",
    tileNoAbs: "No abstract",
    tileNotices: "Retraction notices",
    ofFrame: (pct: string) => `${pct} of the frame`,
    joinedFromRW: "joined from Retraction Watch",
    byYearTitle: "Works by year",
    byYearNote: (pct: string, n: string) =>
      `The frame over time, with the works that carry NO Canadian affiliation drawn underneath. The gap between the two lines is what an affiliation-only frame silently loses: ${pct} of the frame, ${n} works.`,
    byRouteTitle: "Works by route",
    byRouteNote: (sum: string, over: string, total: string) =>
      `Why each work is in the frame. The four routes OVERLAP, because a work can be admitted by several. These bars therefore sum to ${sum}, which is ${over} more than the ${total} works in the frame. That overlap is the next chart.`,
    overlapTitle: "The overlap: exact route combinations",
    overlapNote:
      "Each work counted once, under the exact set of routes that admitted it. Teal bars are works admitted by a SINGLE route: remove that route from the design and those works vanish from the frame entirely.",
    byFieldTitle: "Works by field",
    byFieldNote: "OpenAlex's primary field, as recorded.",
    byLangTitle: "Works by language",
    byLangNote:
      "French is highlighted. It is 6% of the frame, it is oversampled in the screen on purpose, and it is the language the abstract cascade rescues worst (15.4% recovery against 38.8% for English).",
    gapTitle: "The abstract gap is structural, not noise",
    gapNote: (pct: string) =>
      `Share of works with no abstract, by type, highest first. ${pct} of the frame has no abstract, and a historical pilot model assigned positive labels at roughly half the rate there. This is a machine-label association, not an accuracy estimate. The gap is concentrated in work types that often do not carry abstracts, so restricting screening to abstract-bearing works would change the frame's composition. Its effect on human-validated outcomes remains unknown.`,
    retractionTitle:
      "The post-publication record has four states, and OpenAlex has a boolean",
    retractionNote: (notices: string, missed: string) =>
      `${notices} works in the frame carry a Retraction Watch notice. The solid bar is what OpenAlex flags; the hatched bar is what it reports as “false”: ${missed} works whose notice OpenAlex does not carry, which a reader takes to mean “fine”. An expression of concern is not a retraction, and \`is_retracted\` has no way to say so.`,
    thState: "State",
    thWorks: "Works",
    thFlagged: "OpenAlex flags it",
    thMissed: "OpenAlex reports false",
    venuesTitle: "Top venues",
    venuesNote: "By work count in the frame.",
    fundersTitle: "Top funders",
    fundersNote:
      "Split from the semicolon-separated funder string. The funder route admits works that carry no Canadian affiliation at all.",
    scoresTitle: "Teacher spread over the frame (provisional baseline)",
    scoresNote: (n: string) =>
      `Every one of the ${n} works carries two provisional teacher-head scores, and the spread is how far the two heads sit apart on one work. These figures come from pilot/results/frame_scores.json, the file the scoring run writes; nothing here was typed by hand.`,
    tileScored: "Works scored",
    tileScoredNote: "every work in the frame, by the two-teacher panel",
    tileMeanSpread: "Mean teacher spread",
    tileMeanSpreadNote: "the average disagreement between the two heads",
    tileP99Spread: "Teacher spread, 99th percentile",
    tileP99SpreadNote: "99% of works sit below this spread",
    tileSplit: "Works where the teachers would split",
    tileSplitNote: "spread above 0.5",
    apiNote: (p: P) => (
      <>
        Every series here is available as JSON:{" "}
        <Link href={p("/api-docs")} className="link">
          see the API
        </Link>
        .
      </>
    ),
  },

  charts: {
    allWorks: "All works",
    noCaAff: "No Canadian affiliation",
    works: "Works",
    noAbstract: "No abstract",
    flagged: "OpenAlex flags it",
    missed: "OpenAlex reports FALSE",
    routeAff: "Canadian affiliation",
    routeFund: "Canadian funder",
    routeVenue: "Canadian venue",
    routeAbout: "About Canada",
  },

  findings: {
    title: "Findings",
    lead: (n: number) => (
      <>
        All {n} findings, rendered directly from{" "}
        <code className="font-mono text-xs">pilot/results/findings.json</code>:
        the file the pilot scripts write. No number on this page was typed by a
        human, which is the only way to guarantee the site and the analysis
        cannot drift apart.
        <span className="mt-2 block font-medium">
          These are historical outputs from an unvalidated machine pilot. They
          measure model behaviour, not human-coded field truth. Human validation
          is still pending.
        </span>
      </>
    ),
    apiLink: "the same file over the API →",
    computed: (key: string, date: string) => `${key} · computed ${date}`,
    originalLabel: "",
    valuesLabel: "Structured source values",
    titles: {
      affiliation_gap: "The affiliation gap",
      topics: "The topic route",
      erudit: "Érudit is invisible to OpenAlex",
      language_gap: "The language gap",
      polysemy: "Polysemy defeats the lexicon",
      capture_recapture_fails: "Capture-recapture is void here",
      canadian_linkage: "Canadian linkage",
      openalex_is_metered: "OpenAlex is metered",
      base_rate: "The base rate",
      agreement: "Swap the screener, move the answer",
      base_rate_robustness: "Base-rate robustness",
      topic_route_recall: "Topic-route recall",
      screening_cost: "What screening costs",
      audit_power: "The power of a human audit",
      label_limits: "What the labels cannot tell us",
      agent_variance: "Agent variance",
      retraction_record: "A boolean over a four-state space",
      funder_route_recall: "Funder-route recall",
      abstract_cascade: "The abstract gap is structural",
      preprint_coverage: "Preprint coverage",
      trial_linkage: "Trial linkage",
      three_model_screen: "The three-model screen",
      adjudication: "Independent adjudication",
      canadian_linkage_misnames_itself: "The Canadian clauses are misnamed",
      distillation_ceiling: "The distillation ceiling",
      classifier: "What the classifier can and cannot do",
      active_learning: "Active learning and the anchor limit",
      gemma_gate: "The Gemma gate",
      instrument_contradicts_itself: "The instrument contradicts itself",
      the_frame: "The completed frame",
      v1_to_v2: "From rubric v1 to v2",
      zero_probability_region: "The zero-probability region",
    } as Record<string, string>,
  },

  about: {
    title: "About MétaCan",
    lead: "MétaCan is a map of Canadian metaresearch that can be audited. That sentence is doing more work than it looks: almost no research map can be, and the reason is structural rather than careless.",
    flipTitle: "The frame flip",
    flipP1: (
      <>
        The usual way to map a field is to retrieve what <em>looks</em> like the
        field, such as a keyword list, a topic classifier, or a journal set, and
        then ask which of the results are Canadian. This makes the field&apos;s
        boundary a property of your query. And it has a fatal property for
        anyone who wants to check your work:{" "}
        <strong style={{ color: "var(--ink)" }}>
          you cannot measure the recall of a lexicon against the works the
          lexicon never showed you
        </strong>
        . The misses are invisible by construction, so the map cannot report its
        own error, so it cannot be audited.
      </>
    ),
    flipP2: (
      <>
        So this project inverts the frame. It starts from{" "}
        <strong style={{ color: "var(--ink)" }}>all Canadian research</strong>:
        an external, checkable criterion enumerable from a pinned OpenAlex
        snapshot. It makes field membership a{" "}
        <em>classification over a known universe</em> rather than a{" "}
        <em>retrieval over the literature</em>. Once the universe is enumerable,
        recall becomes measurable, a sample has known selection probabilities,
        and a disagreement between screeners becomes a finding instead of an
        embarrassment.
      </>
    ),
    flipP3: (p: P) => (
      <>
        The cost is that &ldquo;Canadian&rdquo; must itself be defined, and it
        is: by <strong style={{ color: "var(--ink)" }}>four routes</strong>:
        affiliation, funder, venue, and subject, each recorded on every work. A
        frame that forgets how it found something cannot be audited either, so
        every row on this site carries its provenance.{" "}
        <Link href={`${p("/works")}?route=no_aff`} className="link">
          Browse the works no affiliation-only frame would ever have seen
        </Link>
        .
      </>
    ),
    whyTitle: "Why the deliverable is a disagreement",
    whyP1: (
      <>
        In a historical unvalidated pilot, three frontier models screened the same 1,000 works against the same
        locked rubric. They did not agree. Of the works <em>any</em> model
        called metaresearch, only about a third were called metaresearch by all
        three, and nearly half rest on a single model&apos;s opinion.
      </>
    ),
    whyP2: (p: P) => (
      <>
        The tempting move is to average this away and publish a base rate. That
        would be false precision, and worse, it would be{" "}
        <em>hiding the only interesting thing the experiment found</em>. Two
        screeners can agree on a <em>rate</em> while finding almost entirely
        different <em>works</em>. At a low model-positive rate, negative
        agreement can dominate the overall percentage. The historical record is the{" "}
        <Link href={p("/screen")} className="link">
          disagreement dossier
        </Link>
        : the works where these machine labels vary. They can inform rubric
        development but cannot replace human validation.
      </>
    ),
    limitsTitle: "What the data cannot say",
    limitsLead:
      "Three limits are measured rather than hedged, because a limit you have measured is a finding and a limit you have merely acknowledged is an excuse.",
    limitAbstract: "The abstract gap is structural",
    limitRetraction: "Retraction is not a boolean",
    limitAgreement: "Swap the screener, move the answer",
    limitsAll: "All findings, rendered from the pipeline’s own output →",
    errorsTitle: "The errors",
    errorsP1: (
      <>
        This project records its own mistakes.{" "}
        <a
          className="link"
          href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md"
        >
          DEVIATIONS.md
        </a>{" "}
        lists them: deviations from the protocol, defects in the screening
        harness, an estimator that had to be cut rather than dressed up as a
        lower bound, a rescue path built around a source that turned out not to
        deposit the data at all. They were written down as they happened and
        before submission, not reconstructed afterwards.
      </>
    ),
    errorsP2: (
      <>
        This is not humility for its own sake. The whole argument of MétaCan is
        that a map which cannot report its own error is not a map you can trust.
        A project making that argument while quietly polishing its own record
        would refute itself in the act of publishing. So: the capture-recapture
        estimator implied Canada produces 59% of the world&apos;s metaresearch,
        which is absurd, and it was{" "}
        <strong style={{ color: "var(--ink)" }}>cut</strong>, not softened. The
        abstract cascade was built around Crossref as the discipline-agnostic
        rescue, and Crossref recovered 2 abstracts against PubMed&apos;s 180.
        That rescue{" "}
        <strong style={{ color: "var(--ink)" }}>does not exist</strong>, and the
        gap is structural. GPT-5.6 violated the locked output schema on 18 of
        1,000 records; the manifest validator caught it, and it is recorded
        rather than silently repaired.
      </>
    ),
    methodTitle: "Method, in short",
    methodFrameK: "Frame",
    methodFrame:
      "Every Canadian work in a pinned OpenAlex snapshot (all 482 partitions), each work exactly once, admitted by one or more of four routes: Canadian affiliation, Canadian funder, Canadian venue, or subject-about-Canada.",
    methodScreenK: "Screen",
    methodScreen:
      "1,000 works drawn with known selection probabilities, stratified (French oversampled), screened by Claude Opus 4.8, GPT-5.6 (high) and Grok 4.5 against one locked rubric on its full eight-field payload. Chunks were randomized and manifest-logged before any model ran; the harness, never the model, writes the label files.",
    methodWeightsK: "Weights",
    methodWeights:
      "The sample is stratified, so every rate is design-weighted. A rate computed from the raw sample without the weight is wrong, and the weight ships with every screened record in the API.",
    methodAbstractsK: "Abstracts",
    methodAbstracts: (
      <>
        Not stored. The inverted indexes are 8.6 GB of the frame&apos;s 9.3 GB
        of text and the host has 13 GB free. The detail page therefore checks
        PubMed and Europe PMC first, then falls back to OpenAlex. Whether a work{" "}
        <em>has</em> an abstract is stored, because that is itself a finding.
      </>
    ),
    methodRetractionK: "Retraction",
    methodRetraction: (
      <>
        Joined to Retraction Watch by DOI, and kept in its own table with four
        states, because OpenAlex&apos;s{" "}
        <code className="font-mono text-xs">is_retracted</code> is a boolean
        over a state space that has at least four values.
      </>
    ),
    methodReproK: "Reproducibility",
    methodRepro: (
      <>
        Every number on this site is produced by a script in the repository and
        read from <code className="font-mono text-xs">findings.json</code>.
        Nothing is typed by hand, so the site and the analysis cannot drift
        apart.
      </>
    ),
    sourcesTitle: "Sources, licence, contact",
    sourcesBody:
      "Data: OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT, data CC-BY-4.0. Built by Ahmad Sofi-Mahmudi for the Canadian Metaresearch Data Challenge (Canadian Reproducibility Network).",
    repoLink: "The repository",
    apiLink: "the public API",
  },

  apiDocs: {
    title: "The public API",
    lead: (p: P) => (
      <>
        Read-only, JSON, CORS-enabled, no key. Every endpoint is backed by the
        same functions the pages call:{" "}
        <code className="font-mono text-xs">searchWorks()</code> serves both{" "}
        <Link href={p("/works")} className="link">
          /works
        </Link>{" "}
        and <code className="font-mono text-xs">/api/v1/works</code>. The API
        therefore cannot answer a different question from the page above it.
      </>
    ),
    baseUrl: "Base URL:",
    thParam: "Parameter",
    thType: "Type",
    thMeaning: "Meaning",
    summaryDesc:
      "The frame in one object: total works, the no-affiliation and no-abstract counts, the four route marginals, and the screen's consensus histogram.",
    worksDesc:
      "Browse and search the whole frame. Full-text over titles, every filter the browse page offers, paginated.",
    worksNote: (
      <>
        <strong>The count is capped at 10,000.</strong> Counting 4.3M rows
        exactly costs seconds and nobody reads the number, so{" "}
        <code className="font-mono text-xs">total_is_capped: true</code> means
        &ldquo;at least 10,000&rdquo;, not &ldquo;exactly 10,000&rdquo;. Page
        through if you need more.
      </>
    ),
    worksParams: {
      q: "Full-text search over titles (Postgres tsvector; terms are ANDed).",
      year: "Inclusive publication-year bounds.",
      lang: "Language code, e.g. en, fr.",
      type: "Work type, e.g. article, preprint, dissertation.",
      field: "OpenAlex primary field, e.g. 'Medicine'.",
      memberships:
        "Exact membership in a Canadian institution, funder, or OpenAlex keyword. Values are the full labels shown on a work record.",
      route:
        "Route provenance: why the work is in the frame. no_aff returns the works with NO Canadian affiliation, which are the ones an affiliation-only frame never sees.",
      retracted: "Only works OpenAlex flags as retracted.",
      noAbstract:
        "Only works with no abstract. A historical pilot model assigned positive labels at roughly half the rate here; this is not an accuracy estimate.",
      nIn: "Screening consensus: how many of the three models called it metaresearch.",
      sort: "Default: cited.",
      page: "per_page max 100, default 25.",
    },
    worksExample: (base: string) =>
      `# The works an affiliation-only frame would never have seen,\n# most-cited first:\ncurl -sS "${base}/api/v1/works?route=no_aff&sort=cited&per_page=5" | jq '.results[] | {id, title, cited_by, routes}'\n\n# French-language works with no abstract, published since 2015:\ncurl -sS "${base}/api/v1/works?lang=fr&no_abstract=1&year_from=2015&per_page=5" | jq\n\n# Full-text search:\ncurl -sS "${base}/api/v1/works?q=reproducibility+crisis&per_page=3" | jq '.results[].title'`,
    workDesc:
      "One work, every field, the routes that admitted it, its Retraction Watch state if any, and all three models' labels and reasons if it was screened.",
    workAbstractParam:
      "Check PubMed and Europe PMC first, then fall back to OpenAlex and de-invert its record. The response also includes PMID, PMCID, and Canadian-affiliated author names with their institutions when available. Off by default: these fields are not in this database, so asking for them costs an upstream round-trip.",
    workExample: (base: string) =>
      `# A work, with its provenance:\ncurl -sS ${base}/api/v1/works/W2342586781 | jq '{id, title, routes}'\n\n# With the preferred abstract, source, and PubMed identifiers:\ncurl -sS "${base}/api/v1/works/W2342586781?abstract=1" | jq '{abstract, abstract_source, pmid, pmcid}'`,
    recentDesc:
      "Browse the rolling OpenAlex layer for works published during the selected recent window. Results include route provenance, the stored abstract, PubMed identifiers, and Canadian-affiliated authors and institutions.",
    recentNote: (
      <>
        <strong>The frozen v1 release is unchanged.</strong> This endpoint reads
        a separate daily table. No classifier category is returned because the
        current classifier has not passed human validation.
      </>
    ),
    recentParams: {
      days: "Inclusive publication window. The default is 15 days.",
      q: "Case-insensitive substring search over recent titles.",
      route: "Require one of the four Canadian admission routes.",
      facets:
        "Exact publication year, type, language, and abstract availability. has_abstract accepts true or false.",
      exact:
        "Exact record values. Institution, funder, and keyword use array membership; venue, topic, and field use exact equality.",
      page: "per_page has a maximum of 100 and defaults to 25.",
    },
    recentExample: (base: string) =>
      `# The latest 15 days of Canadian-affiliated works:\ncurl -sS "${base}/api/v1/recent?days=15&route=ca_aff&per_page=5" | jq '{meta, titles: [.results[].title]}'`,
    recentWorkDesc:
      "One stored recent work with its abstract, identifiers, exact route provenance, Canadian-affiliated authors, and update timestamps.",
    recentWorkExample: (base: string) =>
      `curl -sS ${base}/api/v1/recent/W1234567890 | jq '{id, title, routes, pmid, canadian_authors}'`,
    screenedDesc:
      "The 1,000 screened works with all three models' tiers, confidences and reasons, plus the design weight. Raw historical genre output is exposed only with an explicit unusable-field status.",
    screenedNote: (
      <>
        <strong>The sample is stratified.</strong> Every record carries a{" "}
        <code className="font-mono text-xs">weight</code> (inverse selection
        probability). Any rate you compute from these rows without applying the
        weight is wrong.
      </>
    ),
    screenedParams: {
      contestedOnly:
        "The historical disagreement dossier: every work any model called metaresearch. It documents model variation for rubric development and human validation; it does not locate the field boundary.",
      nIn: "Exact consensus count.",
      stratum: "e.g. aff_core, about_only, french, venue_new, fund_new.",
      page: "per_page max 100.",
    },
    screenedExample: (base: string) =>
      `# The disagreement dossier: works on which historical models differed.\ncurl -sS "${base}/api/v1/screened?contested_only=1" | jq '.meta.summary'\n\n# The works only ONE model called metaresearch:\ncurl -sS "${base}/api/v1/screened?n_in=1" \\\n  | jq '.results[] | {title, opus: .opus.tier, gpt: .gpt.tier, grok: .grok.tier}'`,
    byRouteDesc:
      "The four routes: marginals, and the exact route combinations.",
    byRouteNote: (
      <>
        The routes <strong>overlap</strong>, because a work can be admitted by
        several. Therefore, <code className="font-mono text-xs">marginals</code>{" "}
        sums to more than the frame.{" "}
        <code className="font-mono text-xs">combinations</code> counts each work
        once and sums to the total.
      </>
    ),
    byYearDesc:
      "Works per year, with the no-affiliation and no-abstract counts alongside, because both gaps move over time.",
    byFieldDesc:
      "The field breakdown, plus languages, the abstract gap by type, top venues, top funders, and the four-state retraction record: everything the analytics page draws, in one call.",
    findingsDesc:
      "All findings, served verbatim from the file the pilot scripts write. Every number quoted anywhere on this site comes from here.",
    cohortDesc: (p: P) => (
      <>
        The cohort builder&apos;s own query. Same parser, same function as{" "}
        <Link href={p("/")} className="link">
          the front page
        </Link>
        , so the API cannot answer a different question from the page above it.
        Takes every /api/v1/works parameter, plus the facets below.
      </>
    ),
    cohortNote: (
      <>
        <strong>
          The count is exact, and the label coverage travels with it.
        </strong>{" "}
        <code className="font-mono text-xs">meta.total</code> is the real N (a
        cohort is cited by its N), and{" "}
        <code className="font-mono text-xs">meta.labels_cover</code> says how
        many works in THIS cohort carry machine labels. The label table is
        sparse; an empty <code className="font-mono text-xs">labels</code> array
        means <em>unlabelled</em>, never &ldquo;not in the category&rdquo;.
      </>
    ),
    cohortParams: {
      topic:
        "Exact OpenAlex primary topic. Values come from the typeahead: /api/v1/facets/topic?q=…",
      venue: "Exact venue string. Values come from /api/v1/facets/venue?q=…",
      routesTri:
        "Tri-state route facets: 1 requires the route, 0 excludes it, absent means any. They compose (route_fund=1&route_aff=0 is the funder-only stratum), which the single `route` parameter cannot express.",
      retracted: "1 = retracted only; 0 = exclude retracted; absent = any.",
      abstract: "has = only works with an abstract; none = only works without.",
      category:
        "Label facet: works at least one model put in this category. Machine labels (frontier LLM, unvalidated); filtering on this restricts the cohort to labelled works.",
      design:
        "Label facet: works at least one model gave this study design. Not MEDLINE-validated yet.",
      agreement:
        "any (default) = one model suffices; all = every model that labelled the work must agree on the filtered value.",
      labeled:
        "1 = only works with at least one label row; 0 = only unlabelled works.",
    },
    cohortExample: (base: string) =>
      `# Metaresearch-labelled observational works, 2015 onward, with exact count:\ncurl -sS "${base}/api/v1/cohort?category=metaresearch&design=observational&year_from=2015" \\\n  | jq '{total: .meta.total, labels_cover: .meta.labels_cover, first: .results[0].title}'\n\n# The funder-only stratum: Canadian-funded works with NO Canadian affiliation:\ncurl -sS "${base}/api/v1/cohort?route_fund=1&route_aff=0&per_page=5" | jq '.meta.total'`,
    exportDesc:
      "The whole cohort as a file, streamed from the database: every work column, the machine labels with their agreement, the provisional scores, and the per-row validation_status, verbatim.",
    exportNote: (
      <>
        <strong>Capped at 100,000 rows.</strong> The truncation is never silent:
        it is declared in{" "}
        <code className="font-mono text-xs">meta.truncated</code> (JSON), in a
        trailing comment line (CSV), and in the{" "}
        <code className="font-mono text-xs">X-Export-Truncated</code> header.
        Past the cap, narrow the cohort or rebuild the frame from the
        repository.
      </>
    ),
    exportParams: {
      format:
        "csv (default) or json. Everything else is the same filter vocabulary as /api/v1/cohort.",
    },
    exportExample: (base: string) =>
      `# A labelled cohort as CSV:\ncurl -sSL "${base}/api/v1/cohort/export?category=metaresearch&format=csv" -o cohort.csv\n\n# As JSON, metadata first:\ncurl -sS "${base}/api/v1/cohort/export?design=systematic_review&year_from=2020&format=json" | jq '.meta'`,
    permalinkDesc:
      "Mint the citable /q/<hash> permalink for a filter state. Idempotent: the hash is a function of the canonical filters, so the same cohort always gets the same URL, whoever asks and whenever.",
    permalinkExample: (base: string) =>
      `curl -sS -X POST "${base}/api/v1/permalink?category=metaresearch&year_from=2015" \\\n  | jq '{url, total, labels_cover}'`,
    labelsStatsDesc:
      "The label landscape: coverage, categories, study designs, years and languages over the machine-labelled subset. The same function the Landscape page renders, so the two cannot drift.",
    facetsDesc:
      "Search-as-you-type over the ~85,000 distinct venues and ~4,500 distinct topics, with frame-wide counts. Two characters minimum.",
    facetsExample: (base: string) =>
      `curl -sS "${base}/api/v1/facets/venue?q=canadian+journal" | jq '.results[:3]'\ncurl -sS "${base}/api/v1/facets/topic?q=peer+review" | jq '.results[:3]'`,
    notesTitle: "Notes",
    noteCors: (
      <>
        <strong>CORS</strong> is open (
        <code className="font-mono text-xs">*</code>). This is a public CC-BY
        research dataset; the point of publishing it is that you can query it
        from your own page without proxying.
      </>
    ),
    noteCache: (
      <>
        <strong>Caching.</strong> Responses carry{" "}
        <code className="font-mono text-xs">s-maxage=3600</code>. The frame is a
        pinned snapshot: it does not change between deploys, so a stale
        aggregate is not a risk and re-scanning 4.3M rows per request would be.
      </>
    ),
    noteLimit: (
      <>
        <strong>No key, no rate limit</strong>, but it is one small server. Be
        reasonable, and if you need the whole frame, take{" "}
        <a
          className="link"
          href="https://github.com/choxos/CaRN-data-challenge"
        >
          the repository
        </a>{" "}
        and rebuild it locally rather than paginating four million rows out of
        this box.
      </>
    ),
    noteLicense: (
      <>
        <strong>Licence.</strong> Data CC-BY-4.0, code MIT. Cite OpenAlex and
        Retraction Watch as the upstream sources.
      </>
    ),
  },
};

export type Dictionary = typeof en;

const fr: Dictionary = {
  meta: {
    titleDefault: "MétaCan : la base de sondage de la recherche canadienne",
    titleTemplate: "%s · MétaCan",
    description:
      "4 299 418 travaux canadiens tirés d'un instantané OpenAlex épinglé. Chaque notice indique pourquoi elle a été repérée et à quel titre elle est canadienne.",
    works: "Travaux",
    workNotFound: "Travail introuvable",
    recent: "Travaux canadiens récents",
    recentNotFound: "Travail récent introuvable",
    screen: "Le tri à trois modèles",
    analytics: "Analytique",
    landscape: "Panorama",
    findings: "Constats",
    api: "API",
    about: "À propos",
    qTitle: (hash: string) => `Cohorte ${hash}`,
    qNotFound: "Cohorte introuvable",
  },

  nav: {
    works: "Travaux",
    recent: "Récents",
    screen: "Le tri",
    analytics: "Analytique",
    landscape: "Panorama",
    findings: "Constats",
    api: "API",
    about: "À propos",
    cohort: "Bâtir une cohorte",
    howBuilt: "Comment ce site a été construit :",
    menu: "Menu",
    close: "Fermer",
    navigation: "Navigation principale",
  },

  common: {
    previous: "← précédent",
    next: "suivant →",
    pageOf: (page: string, pages: string) => `page ${page} sur ${pages}`,
    page: (page: string) => `page ${page}`,
    noTitle: "[sans titre]",
    notAvailable: "Non disponible",
    citations: "citations",
    yes: "oui",
    no: "non",
    toggleTheme: "Changer de thème",
  },

  footer: {
    line1: (
      <>
        Chaque chiffre de ce site est produit par un script du{" "}
        <a
          className="link"
          href="https://github.com/choxos/CaRN-data-challenge"
        >
          dépôt
        </a>
        , et les erreurs sont consignées dans{" "}
        <a
          className="link"
          href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md"
        >
          DEVIATIONS.md
        </a>
        , rédigé avant le dépôt de la proposition.
      </>
    ),
    line2:
      "Données : OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT · Données CC BY 4.0 · Ahmad Sofi-Mahmudi",
  },

  home: {
    eyebrow:
      "Un instantané OpenAlex épinglé · les 482 partitions · 2000 à 2025",
    h1: "Ne cherchez pas la métarecherche. Cherchez le Canada, puis triez.",
    lead: (
      <>
        Le devis habituel repère ce qui <em>ressemble</em> à de la
        métarecherche, puis demande si c&apos;est canadien. La frontière du
        domaine devient ainsi une propriété de votre liste de mots-clés, et
        c&apos;est pourquoi de telles cartes ne peuvent pas être vérifiées : on
        ne peut pas mesurer ce qu&apos;un lexique ne vous a jamais montré. Cette
        base est inversée. Elle contient{" "}
        <strong style={{ color: "var(--ink)" }}>
          toute la recherche canadienne
        </strong>
        , un critère externe et vérifiable, de sorte que l&apos;appartenance au
        domaine devient une classification sur un univers énumérable, et non un
        repérage dans la littérature.
      </>
    ),
    statFrameLabel: "Travaux dans la base",
    statFrameNote:
      "chaque travail canadien de l'instantané, compté exactement une fois",
    statNoAffLabel: "Invisibles à la seule affiliation",
    statNoAffNote: (pct: string) =>
      `${pct} : une base fondée sur la seule affiliation les perd en silence`,
    statNoAbsLabel: "Sans résumé",
    statNoAbsNote: (pct: string) =>
      `${pct} : un modèle historique y a attribué environ moitié moins d'étiquettes positives`,
    statScreenedLabel: "Projet pilote historique à trois modèles",
    statScreenedNote:
      "étiquettes automatiques non validées d'Opus 4.8 · GPT-5.6 · Grok 4.5",
    card1Title: "Les modèles du projet pilote historique ont divergé.",
    card1P1: (
      <>
        Dans un projet pilote historique non validé, trois modèles de pointe ont trié les mêmes 1 000 travaux selon la même
        grille verrouillée, sur la charge utile complète de huit champs que la
        grille a toujours prescrite. Parmi les travaux qu&apos;au moins{" "}
        <em>un</em> modèle a qualifiés de métarecherche, seulement{" "}
        <strong style={{ color: "var(--ink)" }}>
          37 % l&apos;ont été par les trois
        </strong>
        , et 47 % reposent sur l&apos;avis d&apos;un seul modèle. Deux trieurs
        peuvent s&apos;accorder sur un <em>taux</em> tout en repérant des{" "}
        <em>travaux</em> presque entièrement différents. À un faible taux de
        réponses positives des modèles, l&apos;accord négatif peut dominer le
        pourcentage global.
      </>
    ),
    card1P2: (p: P) => (
      <>
        Le dossier historique est le{" "}
        <Link href={p("/screen")} className="link">
          dossier des désaccords
        </Link>{" "}
        : les travaux pour lesquels ces étiquettes automatiques varient. Ils
        peuvent éclairer la grille, mais ne remplacent pas une validation humaine.
      </>
    ),
    card2Title: "Un booléen sur un espace à quatre états",
    card2Body: (retr: string, eoc: string) => (
      <>
        OpenAlex consigne la rétractation dans{" "}
        <code className="font-mono text-xs">is_retracted</code>, un booléen. Le
        dossier post-publication compte au moins quatre états. Jointe à
        Retraction Watch, cette base porte{" "}
        <strong style={{ color: "var(--ink)" }}>{retr}</strong> travaux munis
        d&apos;un avis consigné, dont{" "}
        <strong style={{ color: "var(--concern)" }}>{eoc}</strong> sont des{" "}
        <em>expressions de préoccupation</em> : un état pour lequel OpenAlex
        n&apos;a aucun champ, et qu&apos;il rapporte silencieusement comme{" "}
        <code className="font-mono text-xs">false</code>, ce qui se lit comme «
        rien à signaler ».
      </>
    ),
    card2Link: "Parcourir le dossier des rétractations →",
  },

  works: {
    title: "Travaux",
    sub: "Tous les travaux de la base. Chaque rangée indique les voies par lesquelles le travail a été admis, car une base qui oublie comment elle a trouvé un travail ne peut pas être vérifiée.",
    countCapped: "10 000+",
    countWorks: (n: string) => `${n} travaux`,
    matching: (q: string) => ` correspondant à « ${q} »`,
    empty: "Aucun travail ne correspond à ces filtres.",
  },

  recent: {
    title: "Travaux canadiens récents",
    sub:
      "Une vue OpenAlex évolutive des travaux publiés pendant la période choisie de 15 à 30 jours. Le déploiement est configuré pour l'actualiser chaque jour et conserver chaque période antérieure réussie.",
    liveBadge: "couche planifiée chaque jour",
    immutableTitle: "La version figée ne bouge pas",
    immutableBody:
      "Ces notices sont conservées dans une table distincte. Elles ne modifient ni la version de 4 299 418 travaux, ni ses constats, ni la couverture du classificateur, ni les liens de cohorte citables.",
    syncTitle: "État de l'actualisation quotidienne",
    awaitingFirstSync:
      "La première actualisation OpenAlex déployée n'est pas encore terminée.",
    updatedAt: (date: string) => `Dernière réussite le ${date}`,
    window: (from: string, to: string) =>
      `Période de publication du ${from} au ${to}`,
    stored: (count: string) => `${count} travaux conservés pour cette période`,
    latestFailed:
      "La plus récente tentative ne s'est pas terminée. La dernière période complète demeure disponible.",
    days: "Période de publication",
    daysOption: (days: number) => `${days} derniers jours`,
    route: "Voie canadienne",
    routeAny: "Toutes les voies",
    routeAff: "Affiliation canadienne",
    routeFund: "Organisme subventionnaire canadien",
    routeVenue: "Revue canadienne",
    routeAbout: "Sujet canadien",
    search: "Recherche dans le titre",
    searchPlaceholder: "Rechercher dans les titres récents",
    apply: "Appliquer",
    reset: "Effacer les filtres",
    filterErrors: {
      days: "Choisissez une période de publication de 15 à 30 jours entiers.",
      pagination: "La page doit être positive et sa taille doit être comprise entre 1 et 100.",
      route: "Choisissez l'une des voies canadiennes disponibles.",
      year: "L'année de publication doit comporter quatre chiffres.",
      has_abstract: "La disponibilité du résumé doit être vraie ou fausse.",
      length: "La recherche dans le titre peut contenir 200 caractères; les valeurs exactes peuvent en contenir 300.",
    },
    count: (count: string) => `${count} travaux récents`,
    empty: "Aucun travail récent ne correspond à ces filtres.",
    institutionFilter: (name: string) => `Établissement : ${name}`,
    removeInstitution: "Retirer le filtre d'établissement",
    removeFilter: "Retirer ce filtre",
    filterHint: "Filtrer les travaux récents par cette valeur exacte",
    published: (date: string) => `Publié le ${date}`,
    noAbstract: "sans résumé",
    back: "← travaux récents",
    classificationTitle: "État de la classification",
    classificationBody:
      "Aucune catégorie n'est affirmée pour cette couche évolutive. Le classificateur actuel n'a pas réussi une validation humaine; les travaux nouvellement récupérés demeurent donc non classifiés.",
    abstractTitle: "Résumé",
    abstractPubMed: "Résumé fourni par PubMed.",
    abstractEuropePmc: "Résumé fourni par Europe PMC.",
    abstractOpenAlex: "Résumé reconstruit depuis OpenAlex.",
    abstractStored: "Résumé conservé lors de l'actualisation OpenAlex quotidienne.",
    abstractNone: "Aucun résumé n'est disponible dans les sources actuelles.",
    recordTitle: "La notice évolutive",
    publicationDate: "Date de publication",
    publicationYear: "Année de publication",
    type: "Type",
    language: "Langue",
    hasAbstract: "Résumé disponible",
    venue: "Revue",
    topic: "Sujet",
    field: "Domaine",
    institutions: "Établissements canadiens",
    funders: "Organismes subventionnaires",
    keywords: "Mots-clés",
    authors: "Personnes signataires affiliées au Canada",
    identifiers: "Identifiants",
    pmid: "PMID",
    pmcid: "PMCID",
    openAlex: "OpenAlex",
    doi: "DOI",
    noAuthors:
      "Aucune personne signataire nommée et affiliée au Canada n'est disponible.",
    lastSynced: (date: string) => `Notice actualisée dans la base le ${date}`,
  },

  cohort: {
    title: "Bâtir une cohorte",
    sub: (n: string) =>
      `Interrogez les ${n} travaux canadiens de la base, obtenez le compte exact, exportez-le, citez-le. Chaque état des filtres est une URL; chaque URL est une requête reproductible.`,
    topic: "Sujet",
    venue: "Revue",
    typeaheadMin: "saisissez au moins 2 caractères",
    typeaheadNone: "aucun résultat",
    typeaheadClear: "effacer",
    category: "Catégorie",
    anyCategory: "Toutes les catégories",
    design: "Devis d'étude",
    anyDesign: "Tous les devis",
    agreement: "Accord des étiquettes",
    agreementAny: "un seul modèle suffit",
    agreementAll: "tous les modèles doivent concorder",
    labeled: "État des étiquettes",
    labeledAny: "Tous",
    labeledOnly: "Travaux étiquetés seulement",
    labeledNone: "Travaux non étiquetés seulement",
    retraction: "Rétractation",
    retractionAny: "Tous",
    retractionOnly: "Rétractés seulement",
    retractionExclude: "Exclure les rétractés",
    abstract: "Résumé",
    abstractAny: "Tous",
    abstractHas: "Avec résumé",
    abstractNone: "Sans résumé",
    routes: "Voies canadiennes",
    routeAny: "toutes",
    routeRequire: "exigée",
    routeExclude: "exclue",
    routeAffLabel: "Affiliation",
    routeFundLabel: "Financement",
    routeVenueLabel: "Voie de la revue",
    routeAboutLabel: "Porte sur le Canada",
    routesHint:
      "Les quatre voies se composent : exigez la voie du financement et excluez l'affiliation pour obtenir la strate financée-seulement qu'aucune base fondée sur l'affiliation ne voit jamais.",
    labelFacetsTitle: "Étiquettes machine",
    labelFacetsHint:
      "Étiquettes de grands modèles de langage de pointe, non validées et clairsemées : la majeure partie de la base n'est pas encore étiquetée. Filtrer sur une catégorie ou un devis restreint la cohorte aux travaux étiquetés; l'absence d'étiquette n'est jamais une étiquette négative.",
    coverage: (labeled: string, total: string) =>
      `Les étiquettes couvrent ${labeled} des ${total} travaux de cette cohorte.`,
    coverageNote:
      "Les autres sont non étiquetés, ce qui n'est pas une étiquette négative : la table des étiquettes est clairsemée aujourd'hui et s'enrichit au fil des rondes d'étiquetage.",
    categoryNames: {
      metaresearch: "Métarecherche",
      metaepi_narrow: "Méta-épidémiologie (sens strict)",
      metaepi_broad: "Méta-épidémiologie (sens large)",
      bibliometrics: "Bibliométrie",
      sts: "Études des sciences et des technologies",
      scholarly_communication: "Communication savante",
      open_science: "Science ouverte",
      research_integrity: "Intégrité de la recherche",
      insufficient_payload:
        "Charge utile insuffisante (le modèle a refusé de juger)",
    } as Record<string, string>,
    designNames: {
      randomized_trial: "Essai randomisé",
      nonrandomized_trial: "Essai non randomisé",
      observational: "Observationnel",
      systematic_review: "Revue systématique",
      meta_analysis: "Méta-analyse",
      case_report: "Étude de cas",
      qualitative: "Qualitatif",
      simulation_or_modeling: "Simulation ou modélisation",
      bench_or_experimental: "Expérimental (laboratoire)",
      theoretical_or_conceptual: "Théorique ou conceptuel",
      not_applicable: "Sans objet",
      design_other: "Autre devis",
    } as Record<string, string>,
    exportTitle: "Exporter",
    exportCsv: "CSV",
    exportJson: "JSON",
    exportNote: (cap: string) =>
      `La cohorte courante, diffusée en continu depuis la base de données : toutes les colonnes des travaux, les étiquettes machine, les scores provisoires et l'état de validation de chaque rangée. Les exportations sont plafonnées à ${cap} rangées.`,
    exportTruncated: (total: string, cap: string) =>
      `Cette cohorte compte ${total} travaux, plus que le plafond d'exportation de ${cap} rangées : le fichier contiendra les ${cap} premières, ordonnées par identifiant OpenAlex, et le déclare à sa dernière ligne. Resserrez la cohorte, paginez l'API, ou reconstruisez la base depuis le dépôt pour le reste.`,
    citeButton: "Citer cette cohorte",
    citeWorking: "création…",
    citeCopy: "copier",
    citeCopied: "copié",
    citeNote:
      "Crée un lien /q/ permanent pour cette requête exacte. Les mêmes filtres produisent toujours le même lien, qui que soit le demandeur.",
    apiLine: "Cette cohorte par l'API :",
  },

  landscape: {
    title: "Panorama",
    sub: "À quoi ressemble le sous-ensemble étiqueté par machine : catégories, devis d'étude, années, langues. En dessous, la base décrite par elle-même.",
    bannerTitle: "Lisez la couverture avant les comptes",
    banner: (labeled: string, frame: string, pct: string) =>
      `Les étiquettes couvrent ${labeled} des ${frame} travaux de la base (${pct}). Chaque compte de cette section porte sur ce seul sous-ensemble étiqueté; il dit à quoi ressemblent les travaux étiquetés, jamais quelle part de la base appartient à une catégorie. Ce sont des étiquettes machine (grand modèle de langage de pointe, non validées), et un travail non étiqueté n'est PAS un négatif.`,
    tileLabeled: "Travaux étiquetés",
    tileLabeledNote: "travaux portant au moins une étiquette de modèle",
    tileRows: "Rangées d'étiquettes",
    tileRowsNote: "une par paire (travail, modèle)",
    tileModels: "Modèles",
    tileModelsNote: "chaque travail est étiqueté par jusqu'à trois modèles",
    byCategoryTitle: "Travaux étiquetés par catégorie",
    byCategoryNote:
      "Un travail compte sous une catégorie si au moins un modèle la lui a attribuée; le chiffre plus foncé exige que tous les modèles qui ont étiqueté le travail concordent. L'écart entre les deux colonnes, c'est le désaccord des modèles, et cet écart est un constat, pas du bruit.",
    byDesignTitle: "Travaux étiquetés par devis d'étude",
    byDesignNote:
      "Les deux mêmes lectures : au moins un modèle, puis tous les modèles en accord. Aucun devis ici n'est encore validé contre MEDLINE; quand cette validation arrivera, elle sera marquée explicitement.",
    byYearTitle: "Travaux étiquetés par année",
    byYearNote:
      "Là où les rondes d'étiquetage se sont rendues jusqu'ici. C'est la couverture de la table des étiquettes, pas une propriété du domaine.",
    byLangTitle: "Travaux étiquetés par langue",
    byLangNote:
      "Encore la couverture : les rondes échantillonnent la base, et la base est à 6 % francophone.",
    thCategory: "Catégorie",
    thDesign: "Devis d'étude",
    thYear: "Année",
    thLang: "Langue",
    thAny: "Au moins un modèle",
    thAll: "Tous les modèles concordent",
    thLabeled: "Travaux étiquetés",
    frameTitle: "La base elle-même",
    frameSub: (n: string) =>
      `Tout ce qui suit porte sur les ${n} travaux, étiquetés ou non. Chaque chiffre est une requête sur la base de données, calculée à la demande et mise en cache une heure; rien ici n'est un nombre saisi à la main.`,
    collaborationTitle: "Collaboration entre établissements canadiens",
    collaborationSub: (works: string, institutions: string) =>
      `Ce réseau couvre ${works} travaux portant au moins un établissement canadien nommé et ${institutions} libellés d'établissement distincts. Une ligne relie deux établissements présents sur le même travail; une ligne plus épaisse indique davantage de travaux communs.`,
    collaborationWorks: "Travaux représentés",
    collaborationInstitutions: "Libellés d'établissement",
    collaborationPeriod: "Années de publication",
    collaborationPeriodValue: (from: number, to: number) => `${from} à ${to}`,
    collaborationAria:
      "Réseau des établissements canadiens reliés par des travaux à affiliations communes",
    collaborationAuthorAria:
      "Réseau des personnes signataires affiliées au Canada reliées par des travaux communs",
    collaborationInstitutionMode: "Établissements",
    collaborationAuthorMode: "Personnes",
    collaborationShown: "Établissements affichés",
    collaborationAuthorsShown: "Personnes affichées",
    collaborationLegend: "Principaux établissements dans cette vue",
    collaborationAuthorLegend: "Principales personnes dans cette vue",
    collaborationStrongestPairs: "Principales paires de collaboration dans cette vue",
    collaborationWorksUnit: "travaux",
    collaborationFilterHint: "Voir tous les travaux de cet établissement",
    collaborationAuthorHint: "Ouvrir cette personne dans OpenAlex",
    collaborationSharedWorks: "travaux communs",
    collaborationMethod: (cap: string, excluded: string, edgeLimit: string, displayLimit: string) =>
      `Les liens sont calculés hors ligne sur la base complète. Les travaux nommant plus de ${cap} établissements canadiens sont exclus de la production des paires afin de maîtriser l'expansion quadratique; cela touche ${excluded} travaux, qui restent inclus dans les comptes des nœuds. Le réseau conservé retient les ${edgeLimit} paires les plus fortes et cette vue affiche jusqu'à ${displayLimit} nœuds.`,
    authorNetworkPending:
      "Les noms des personnes signataires affiliées au Canada et leurs établissements figurent maintenant dans chaque notice. Le graphe complet entre personnes reste masqué jusqu'à la fin de la nouvelle collecte des 482 partitions; l'ancienne source à une seule partition ne couvre que 6 202 travaux et serait trompeuse ici.",
  },

  qpage: {
    eyebrow: "Une requête de cohorte citable",
    title: (hash: string) => `Cohorte q/${hash}`,
    sub: "Ce lien nomme une requête, pas une liste de résultats. Les filtres ci-dessous sont conservés; les comptes sont recalculés en direct contre l'instantané épinglé à chaque chargement, car réexécuter la requête est la façon honnête de reproduire un nombre.",
    filtersTitle: "La requête",
    noFilters: "Aucun filtre : cette cohorte est la base entière.",
    countsTitle: "Comptes, recalculés à l'instant",
    totalLabel: "Travaux dans la cohorte",
    labeledLabel: "Portent des étiquettes machine",
    labeledNote:
      "étiquettes de modèles de pointe, non validées; les autres sont non étiquetés, non négatifs",
    snapshotTitle: "Instantané",
    snapshotLine: (release: string, built: string) =>
      `Version épinglée d'OpenAlex du ${release} (les 482 partitions, années de publication 2000 à 2025); base construite le ${built}. L'instantané est identique à l'octet près pour toujours : cette requête renverra les mêmes travaux quel que soit le jour.`,
    citeTitle: "Citation suggérée",
    citation: (n: string, hash: string, date: string, release: string) =>
      `Sofi-Mahmudi A. MetaCan : la base de sondage de la recherche canadienne. Cohorte q/${hash} (${n} travaux; consultée le ${date}). https://metacan.xera.ac/q/${hash}. Données : instantané OpenAlex épinglé du ${release}.`,
    openBuilder: "Ouvrir cette cohorte dans le constructeur →",
    apiLabel: "La même cohorte par l'API",
    exportLabel: "Exporter",
  },

  filters: {
    searchPlaceholder:
      "Rechercher dans les titres : plein texte sur 4 299 418 travaux",
    searchAria: "Rechercher dans les titres",
    searchButton: "Rechercher",
    route: "Voie",
    field: "Domaine",
    type: "Type",
    language: "Langue",
    yearRange: "Période",
    from: "de",
    to: "à",
    yearFrom: "Année de début",
    yearTo: "Année de fin",
    consensus: "Consensus du tri",
    sort: "Ordre",
    flags: "Indicateurs",
    retracted: "Rétractés",
    noAbstract: "Sans résumé",
    anyRoute: "Toutes les voies",
    routeAff: "Affiliation canadienne",
    routeFund: "Organisme subventionnaire canadien",
    routeVenue: "Revue canadienne",
    routeAbout: "Porte sur le Canada",
    routeNoAff: "SANS affiliation (invisible à la base habituelle)",
    anyField: "Tous les domaines",
    anyType: "Tous les types",
    anyLanguage: "Toutes les langues",
    sortCited: "Les plus cités",
    sortNewest: "Les plus récents",
    sortOldest: "Les plus anciens",
    consensusAny: "Tous",
    consensus3: "3/3 : les trois modèles",
    consensus2: "2/3 : contesté",
    consensus1: "1/3 : un seul modèle",
    consensus0: "0/3 : les trois ont dit hors champ",
    active: (n: number) => `${n} filtre${n === 1 ? " actif" : "s actifs"}`,
    clearAll: "tout effacer",
    appliedValues: "Filtres de valeur exacte appliqués",
    removeFilter: (label: string, value: string) =>
      `Retirer le filtre ${label} : ${value}`,
  },

  workRow: {
    routeAffTitle: "Admis par une affiliation canadienne",
    routeFundTitle: "Admis par un organisme subventionnaire canadien",
    routeVenueTitle: "Admis par une revue canadienne",
    routeAboutTitle: "Admis parce qu'il porte sur le Canada",
    noAffTitle:
      "Aucune affiliation canadienne. Une base fondée sur la seule affiliation n'aurait jamais vu ce travail.",
    noAbstractChip: "sans résumé",
    noAbstractTitle:
      "Aucun résumé dans OpenAlex. Un modèle du projet pilote historique a attribué environ moitié moins d'étiquettes positives dans cette strate. Il s'agit d'une association entre étiquettes machine, et non d'une estimation de l'exactitude.",
    consensusAll: "3/3 métarecherche",
    consensusN: (n: number) => `${n}/3 métarecherche`,
    consensusAllTitle:
      "Les trois modèles ont qualifié ce travail de métarecherche.",
    consensusNTitle: (n: number) =>
      `Seulement ${n} modèle${n === 1 ? "" : "s"} sur 3 ${n === 1 ? "a" : "ont"} qualifié ce travail de métarecherche : un travail contesté, à la frontière empirique du domaine.`,
    retractionMissedTitle: (nature: string) =>
      `${nature} : consigné par Retraction Watch, NON signalé par OpenAlex.`,
    retractionMissedSuffix: " · manqué par OpenAlex",
    labelsPrefix: "étiquettes",
    labelChipTitle: (
      model: string,
      cats: string,
      design: string,
      conf: string,
    ) =>
      `Étiquette machine (grand modèle de langage de pointe, non validée). ${model} a répondu : catégories [${cats || "aucune"}], devis d'étude ${design || "aucun"}, confiance ${conf || "non précisée"}.`,
    labelNoCats: "aucune catégorie",
    agreementAgree: "modèles en accord",
    agreementAgreeTitle:
      "Tous les modèles qui ont étiqueté ce travail ont donné les mêmes catégories et le même devis d'étude.",
    agreementSplit: "modèles en désaccord",
    agreementSplitTitle:
      "Les modèles qui ont étiqueté ce travail divergent sur ses catégories ou son devis d'étude. Le désaccord est livré comme donnée; il n'est pas moyenné.",
    agreementSingle: "un seul modèle",
    agreementSingleTitle:
      "Un seul modèle a étiqueté ce travail jusqu'ici : personne avec qui concorder ou diverger.",
    unlabeled: "non étiqueté",
    unlabelledTitle:
      "Aucun modèle n'a encore étiqueté ce travail. La table des étiquettes est clairsemée et s'enrichit au fil des rondes; l'absence d'étiquette n'est PAS une étiquette négative.",
  },

  scoreBanner: {
    text: "Scores de référence d'un modèle non mature (critères de maturité non atteints, 7 itérations). Un score ordonne; il n'affirme jamais une catégorie.",
  },

  workDetail: {
    back: "← tous les travaux",
    onOpenAlex: (id: string) => `${id} sur OpenAlex`,
    citations: (n: string) => `${n} citations`,
    routeAffName: "Affiliation canadienne",
    routeAffWhy:
      "Une personne signataire a déclaré un établissement canadien. C'est la seule voie dont dispose la base habituelle.",
    routeFundName: "Organisme subventionnaire canadien",
    routeFundWhy:
      "Un organisme canadien l'a financé. Le travail peut ne porter aucune affiliation canadienne.",
    routeVenueName: "Revue canadienne",
    routeVenueWhy: "Il a paru dans une revue canadienne.",
    routeAboutName: "Porte sur le Canada",
    routeAboutWhy: "Son objet est le Canada, où que soient ses auteurs.",
    whyTitle: "Pourquoi ce travail est-il dans la base ?",
    whySub:
      "Une base qui oublie comment elle a trouvé un travail ne peut pas être vérifiée. Voici les voies qui ont admis celui-ci.",
    noAffCallout: (
      <>
        <strong style={{ color: "var(--mc-accent)" }}>
          Aucune affiliation canadienne.
        </strong>{" "}
        Une base fondée sur la seule affiliation (le devis habituel)
        n&apos;aurait jamais vu ce travail. C&apos;est l&apos;un des travaux qui
        justifient l&apos;inversion de la base.
      </>
    ),
    postPubTitle: "Dossier post-publication",
    nature: "Nature",
    reason: "Motif",
    date: "Date",
    flagged: "Signalé par OpenAlex ?",
    flaggedYes: "Oui",
    flaggedNo:
      "Non : Retraction Watch le consigne, et OpenAlex ne le signale pas.",
    rwSource: (
      <>
        Source : Retraction Watch, jointe par DOI. OpenAlex consigne la
        rétractation dans{" "}
        <code className="font-mono text-xs">is_retracted</code>, un booléen sur
        un espace d&apos;états à au moins quatre valeurs ; il ne peut donc
        exprimer ni une expression de préoccupation, ni une correction, ni un
        rétablissement, et les rapporte comme{" "}
        <code className="font-mono text-xs">false</code>, ce qui se lit comme «
        rien à signaler ».
      </>
    ),
    openalexOnly:
      "OpenAlex signale ce travail comme rétracté, mais aucune notice correspondante de Retraction Watch ne figure dans cette base.",
    screenTitle: "Projet pilote historique à trois modèles",
    screenAll: "les 1 000 travaux triés →",
    consensus3: (
      <>
        <strong style={{ color: "var(--in-scope)" }}>Les trois modèles</strong>{" "}
        ont qualifié ce travail de métarecherche dans le projet pilote
        historique. Il s'agit d'un accord entre modèles, pas d'une étiquette
        validée du domaine.
      </>
    ),
    consensus0: (
      <>
        <strong style={{ color: "var(--out)" }}>Les trois modèles</strong>{" "}
        l&apos;ont jugé hors champ dans le projet pilote historique. Il s'agit
        d'un accord entre modèles, pas d'un jugement humain de référence.
      </>
    ),
    consensusN: (n: number) => (
      <>
        <strong style={{ color: "var(--contested)" }}>
          {n} modèle{n === 1 ? "" : "s"} sur 3 {n === 1 ? "a" : "ont"} qualifié
          ce travail de métarecherche.
        </strong>{" "}
        Il s'agit d'un désaccord du projet pilote historique : l'étiquette
        change selon le modèle interrogé. C&apos;est l&apos;un des 51 travaux du
        dossier des désaccords.
      </>
    ),
    stratumLine: (stratum: string, weight: string) =>
      `strate : ${stratum} · poids de sondage : ${weight} (l'échantillon est stratifié ; tout taux calculé sans le poids est faux)`,
    genre: (g: string) => `genre : ${g}`,
    aboutCanada: "porte sur le Canada",
    confidence: "confiance",
    tierAdjacent: "T3 · adjacent, hors champ",
    labelsTitle:
      "Étiquettes machine (grand modèle de langage de pointe, non validées)",
    labelsSub:
      "Étiquettes de catégorie et de devis d'étude par modèle, issues des rondes d'étiquetage. C'est une sortie machine, non validée, et le désaccord entre modèles est livré comme donnée. Aucun devis ici n'est encore validé contre MEDLINE.",
    labelCategories: "Catégories",
    labelDesign: "Devis d'étude",
    labelDomain: "Domaine",
    labelGenre: "Genre",
    labelAboutSystem: "Porte sur le système de recherche canadien",
    labelAboutTopic: "Porte sur un sujet canadien",
    scoresTitle: "Scores machine (provisoires)",
    scoresSub:
      "Les deux têtes enseignantes du modèle étudiant, lues sur ce travail. Un score ordonne la base pour la relecture; il n'affirme jamais une catégorie, et le statut de validation accompagne chaque rangée tel quel.",
    scoreOpus: "Tête enseignante Opus",
    scoreGpt: "Tête enseignante GPT",
    scoreSpread: "Écart entre enseignants",
    scoreSpreadNote:
      "la distance entre les deux têtes enseignantes sur ce seul travail",
    validationStatus: "Statut de validation",
    validationStatusNote:
      "tel quel depuis la passe de notation : score_only signifie que le nombre peut ordonner les travaux, et qu'aucune étiquette de catégorie n'en découle",
    abstractTitle: "Résumé",
    abstractExpand: "Afficher le résumé complet",
    abstractCollapse: "Réduire le résumé",
    abstractStored:
      "Conservé avec la notice de tri, où il sert de preuve aux étiquettes ci-dessus.",
    abstractPubMed:
      "Récupéré depuis PubMed par NCBI EFetch. Les titres des sections structurées sont conservés.",
    abstractEuropePmc:
      "Récupéré depuis la notice complète d'Europe PMC. Les titres des sections structurées sont conservés lorsqu'ils sont fournis.",
    abstractOpenAlex:
      "Récupéré en direct depuis OpenAlex et désinversé. Les résumés ne sont pas conservés dans cette base de données : les index inversés représentent 8,6 Go des 9,3 Go de texte de la base, et le serveur dispose de 13 Go libres.",
    abstractUnavailable:
      "OpenAlex consigne un résumé pour ce travail, mais il n'a pas pu être récupéré à l'instant.",
    abstractNone:
      "Aucun résumé. Ce n'est pas une lacune de cette base de données; OpenAlex n'en a pas non plus. 23,3 % de la base est dans cet état. Un modèle historique y a attribué environ moitié moins d'étiquettes positives; il s'agit d'une association entre étiquettes machine, et non d'une estimation de l'exactitude.",
    recordTitle: "La notice",
    filterHint: "Voir tous les travaux ayant cette valeur",
    venue: "Revue",
    topic: "Thématique",
    field: "Domaine",
    authors: "Personnes signataires affiliées au Canada",
    institutions: "Établissements canadiens",
    funders: "Organismes subventionnaires",
    keywords: "Mots-clés",
    hasAbstract: "Résumé présent dans OpenAlex",
    pmid: "PMID",
    pmcid: "PMCID",
    api: "API",
  },

  screen: {
    eyebrow: (n: string) =>
      `${n} travaux · projet pilote historique non validé · Opus 4.8 · GPT-5.6 (high) · Grok 4.5 · une seule grille verrouillée`,
    h1: "Les modèles du projet pilote historique n'ont pas tracé la même frontière.",
    p1: (v: {
      n: string;
      anyIn: number;
      n3: number;
      pct3: string;
      n1: number;
      pct1: string;
    }) => (
      <>
        Dans un projet pilote historique non validé, trois modèles de pointe ont trié les mêmes {v.n} travaux, tirés de la
        vraie base avec des probabilités de sélection connues, selon la même
        grille verrouillée sur sa charge utile complète de huit champs. Parmi
        les <strong style={{ color: "var(--ink)" }}>{v.anyIn}</strong> travaux
        qu&apos;au moins <em>un</em> modèle a qualifiés de métarecherche,
        seulement <strong style={{ color: "var(--in-scope)" }}>{v.n3}</strong> (
        {v.pct3}) l&apos;ont été par les trois, et{" "}
        <strong style={{ color: "var(--contested)" }}>{v.n1}</strong> ({v.pct1})
        reposent sur l&apos;avis d&apos;un seul modèle.
      </>
    ),
    p2: (
      <>
        Deux trieurs peuvent s&apos;accorder sur un <em>taux</em> tout en
        repérant des <em>travaux</em> presque entièrement différents. À un taux
        de réponses positives d&apos;environ 1 %, l&apos;accord négatif peut
        dominer le pourcentage global. Le tableau ci-dessous expose les
        décisions de chaque modèle; il n&apos;établit pas l&apos;appartenance au
        domaine.
      </>
    ),
    statAnyLabel: "Au moins un modèle a dit métarecherche",
    statAnyNote:
      "le dossier des réponses positives des modèles du projet pilote historique",
    statAllLabel: "Les trois d’accord",
    statAllNote: (pct: string) => `${pct} du dossier : accord entre les trois modèles`,
    statTwoLabel: "Deux sur trois",
    statTwoNote: "contesté",
    statOneLabel: "Un seul modèle",
    statOneNote: (pct: string) =>
      `${pct} du dossier repose sur l'avis d'un seul modèle`,
    modelsTitle: "Les trois modèles ne sont pas interchangeables",
    modelsSub: (v: { n: string; anyIn: number }) => (
      <>
        Combien des {v.n} travaux chaque modèle a qualifiés de métarecherche
        (niveau T1 ou T2), sur des données identiques. T3 est <em>adjacent</em>{" "}
        et ne compte pas comme dans le champ ; c&apos;est pourquoi le compte
        d&apos;un modèle ne peut jamais dépasser les {v.anyIn} travaux du
        dossier.
      </>
    ),
    modelsSpread: (
      <>
        Changez le modèle du projet pilote historique que vous appelez « le
        trieur » et le nombre de réponses positives change. Cet écart mesure la
        variation entre ces sorties de modèles; ce n&apos;est pas une incertitude
        sur la taille de la métarecherche canadienne.
      </>
    ),
    dossierTitle: "Le dossier des désaccords",
    dossierSub:
      "Les trois verdicts, confiances et motifs du projet pilote historique côte à côte. Ces désaccords automatiques peuvent éclairer la rédaction de la grille; ils ne remplacent pas une validation humaine.",
    reasonLabel: "Justification originale en anglais",
    tabDossier: "Le dossier (au moins un modèle a dit oui)",
    tab3: "3/3 : accord entre modèles",
    tab2: "2/3 : contestés",
    tab1: "1/3 : un seul modèle",
    tab0: "0/3 : accord des modèles hors champ",
    tabAll: "Tous les travaux triés",
    workCount: (total: string, one: boolean) =>
      `${total} ${one ? "travail" : "travaux"}`,
    thWork: "Travail",
    thStratum: "Strate",
    emptyView: "Aucun travail dans cette vue.",
    tierT1: "T1 : métarecherche centrale (compte comme DANS le champ)",
    tierT2: "T2 : métarecherche (compte comme DANS le champ)",
    tierT3: "T3 : adjacent. NE compte PAS comme dans le champ.",
    tierOut: "hors champ",
    foundTitle: "Ce que le tri a réellement trouvé",
    computed: (date: string) => `Calculé le ${date}`,
    allFindings: "tous les constats",
    dossierJson: "ce dossier en JSON",
  },

  analytics: {
    title: "Analytique",
    sub: (n: string) =>
      `La base, décrite par elle-même. Chaque chiffre est une requête sur les ${n} travaux, calculée à la demande et mise en cache une heure ; rien ici n'est un nombre saisi à la main.`,
    tileWorks: "Travaux dans la base",
    tileNoAff: "Sans affiliation canadienne",
    tileNoAbs: "Sans résumé",
    tileNotices: "Avis de rétractation",
    ofFrame: (pct: string) => `${pct} de la base`,
    joinedFromRW: "joints depuis Retraction Watch",
    byYearTitle: "Travaux par année",
    byYearNote: (pct: string, n: string) =>
      `La base au fil du temps, avec en dessous les travaux SANS affiliation canadienne. L'écart entre les deux courbes est ce qu'une base fondée sur la seule affiliation perd en silence : ${pct} de la base, soit ${n} travaux.`,
    byRouteTitle: "Travaux par voie",
    byRouteNote: (sum: string, over: string, total: string) =>
      `Pourquoi chaque travail est dans la base. Les quatre voies SE RECOUPENT (un travail peut être admis par plusieurs) : ces barres totalisent donc ${sum}, soit ${over} de plus que les ${total} travaux de la base. Ce recoupement fait l'objet du graphique suivant.`,
    overlapTitle: "Le recoupement : combinaisons exactes de voies",
    overlapNote:
      "Chaque travail est compté une seule fois, sous l'ensemble exact des voies qui l'ont admis. Les barres sarcelle sont les travaux admis par une SEULE voie : retirez cette voie du devis et ces travaux disparaissent entièrement de la base.",
    byFieldTitle: "Travaux par domaine",
    byFieldNote: "Le domaine principal d'OpenAlex, tel que consigné.",
    byLangTitle: "Travaux par langue",
    byLangNote:
      "Le français est mis en évidence. Il représente 6 % de la base, il est volontairement suréchantillonné dans le tri, et c'est la langue que la cascade de résumés récupère le plus mal (15,4 % de récupération contre 38,8 % pour l'anglais).",
    gapTitle: "L'écart des résumés est structurel, pas du bruit",
    gapNote: (pct: string) =>
      `Part des travaux sans résumé, par type, de la plus élevée à la plus faible. ${pct} de la base n'a aucun résumé, et un modèle historique y a attribué environ moitié moins d'étiquettes positives. Il s'agit d'une association entre étiquettes machine, et non d'une estimation de l'exactitude. L'écart se concentre dans des types de travaux qui n'ont souvent pas de résumé; limiter le tri aux travaux avec résumé changerait donc la composition de la base. L'effet sur des résultats validés par des humains demeure inconnu.`,
    retractionTitle:
      "Le dossier post-publication a quatre états, et OpenAlex a un booléen",
    retractionNote: (notices: string, missed: string) =>
      `${notices} travaux de la base portent un avis Retraction Watch. La barre pleine est ce qu'OpenAlex signale ; la barre hachurée est ce qu'il rapporte comme « false » : ${missed} travaux dont OpenAlex ne porte pas l'avis, ce qu'un lecteur comprend comme « rien à signaler ». Une expression de préoccupation n'est pas une rétractation, et is_retracted n'a aucun moyen de le dire.`,
    thState: "État",
    thWorks: "Travaux",
    thFlagged: "OpenAlex le signale",
    thMissed: "OpenAlex rapporte false",
    venuesTitle: "Principales revues",
    venuesNote: "Selon le nombre de travaux dans la base.",
    fundersTitle: "Principaux organismes subventionnaires",
    fundersNote:
      "Extraits de la chaîne d'organismes séparée par des points-virgules. La voie du financement admet des travaux qui ne portent aucune affiliation canadienne.",
    scoresTitle:
      "L'écart entre enseignants sur toute la base (référence provisoire)",
    scoresNote: (n: string) =>
      `Chacun des ${n} travaux porte deux scores provisoires de têtes enseignantes, et l'écart mesure la distance entre les deux têtes sur un même travail. Ces chiffres proviennent de pilot/results/frame_scores.json, le fichier qu'écrit la passe de notation; rien ici n'est saisi à la main.`,
    tileScored: "Travaux notés",
    tileScoredNote:
      "chaque travail de la base, par le tandem de têtes enseignantes",
    tileMeanSpread: "Écart moyen entre enseignants",
    tileMeanSpreadNote: "le désaccord moyen entre les deux têtes",
    tileP99Spread: "Écart entre enseignants, 99e centile",
    tileP99SpreadNote: "99 % des travaux se situent sous cet écart",
    tileSplit: "Travaux où les enseignants divergeraient",
    tileSplitNote: "écart supérieur à 0,5",
    apiNote: (p: P) => (
      <>
        Chaque série est offerte en JSON :{" "}
        <Link href={p("/api-docs")} className="link">
          voir l&apos;API
        </Link>
        .
      </>
    ),
  },

  charts: {
    allWorks: "Tous les travaux",
    noCaAff: "Sans affiliation canadienne",
    works: "Travaux",
    noAbstract: "Sans résumé",
    flagged: "OpenAlex le signale",
    missed: "OpenAlex rapporte FALSE",
    routeAff: "Affiliation canadienne",
    routeFund: "Financement canadien",
    routeVenue: "Revue canadienne",
    routeAbout: "Porte sur le Canada",
  },

  findings: {
    title: "Constats",
    lead: (n: number) => (
      <>
        Les {n} constats, rendus directement depuis{" "}
        <code className="font-mono text-xs">pilot/results/findings.json</code>,
        le fichier qu&apos;écrivent les scripts du pilote. Aucun nombre de cette
        page n&apos;a été saisi par un humain : c&apos;est la seule façon de
        garantir que le site et l&apos;analyse ne peuvent pas diverger.
        <span className="mt-2 block font-medium">
          Il s&apos;agit de résultats historiques issus d&apos;un pilote machine non
          validé. Ils mesurent le comportement des modèles, et non une vérité de
          terrain codée par des humains. La validation humaine reste à faire.
        </span>
      </>
    ),
    apiLink: "le même fichier par l'API →",
    computed: (key: string, date: string) => `${key} · calculé le ${date}`,
    originalLabel: "Énoncé original (findings.json) :",
    valuesLabel: "Valeurs structurées du fichier source",
    titles: {
      affiliation_gap: "L'écart d'affiliation",
      topics: "La voie thématique",
      erudit: "Érudit est invisible pour OpenAlex",
      language_gap: "L'écart linguistique",
      polysemy: "La polysémie met le lexique en échec",
      capture_recapture_fails: "La capture-recapture est ici sans valeur",
      canadian_linkage: "Le lien canadien",
      openalex_is_metered: "OpenAlex est facturé à l'usage",
      base_rate: "Le taux de base",
      agreement: "Changez de trieur, la réponse bouge",
      base_rate_robustness: "La robustesse du taux de base",
      topic_route_recall: "Le rappel de la voie thématique",
      screening_cost: "Ce que coûte le tri",
      audit_power: "La puissance d'un audit humain",
      label_limits: "Ce que les étiquettes ne peuvent pas dire",
      agent_variance: "La variance des agents",
      retraction_record: "Un booléen sur un espace à quatre états",
      funder_route_recall: "Le rappel de la voie du financement",
      abstract_cascade: "L'écart des résumés est structurel",
      preprint_coverage: "La couverture des prépublications",
      trial_linkage: "Le lien aux essais cliniques",
      three_model_screen: "Le tri à trois modèles",
      adjudication: "L'arbitrage indépendant",
      canadian_linkage_misnames_itself:
        "Les clauses canadiennes portent mal leur nom",
      distillation_ceiling: "Le plafond de la distillation",
      classifier: "Ce que le classificateur peut et ne peut pas faire",
      active_learning: "L'apprentissage actif et la limite des témoins",
      gemma_gate: "Le seuil de Gemma",
      instrument_contradicts_itself: "L'instrument se contredit",
      the_frame: "La base achevée",
      v1_to_v2: "De la grille v1 à la v2",
      zero_probability_region: "La région de probabilité nulle",
    } as Record<string, string>,
  },

  about: {
    title: "À propos de MétaCan",
    lead: "MétaCan est une carte de la métarecherche canadienne qui peut être vérifiée. Cette phrase travaille plus qu'il n'y paraît : presque aucune carte de la recherche ne le peut, et la raison tient à la structure, non à la négligence.",
    flipTitle: "L'inversion de la base",
    flipP1: (
      <>
        La façon habituelle de cartographier un domaine consiste à repérer ce
        qui <em>ressemble</em> au domaine (une liste de mots-clés, un
        classificateur thématique, un ensemble de revues), puis à demander
        lesquels des résultats sont canadiens. La frontière du domaine devient
        ainsi une propriété de votre requête. Et cela a une propriété fatale
        pour quiconque veut vérifier votre travail :{" "}
        <strong style={{ color: "var(--ink)" }}>
          on ne peut pas mesurer le rappel d&apos;un lexique sur les travaux que
          le lexique ne vous a jamais montrés
        </strong>
        . Les manques sont invisibles par construction ; la carte ne peut donc
        pas rapporter sa propre erreur, et elle ne peut donc pas être vérifiée.
      </>
    ),
    flipP2: (
      <>
        Ce projet inverse donc la base. Il part de{" "}
        <strong style={{ color: "var(--ink)" }}>
          toute la recherche canadienne
        </strong>
        , un critère externe et vérifiable, énumérable depuis un instantané
        OpenAlex épinglé, et fait de l&apos;appartenance au domaine une{" "}
        <em>classification sur un univers connu</em> plutôt qu&apos;un{" "}
        <em>repérage dans la littérature</em>. Une fois l&apos;univers
        énumérable, le rappel devient mesurable, un échantillon a des
        probabilités de sélection connues, et un désaccord entre trieurs devient
        un constat plutôt qu&apos;un embarras.
      </>
    ),
    flipP3: (p: P) => (
      <>
        Le prix à payer est que « canadien » doit lui-même être défini, et il
        l&apos;est : par{" "}
        <strong style={{ color: "var(--ink)" }}>quatre voies</strong>{" "}
        (affiliation, organisme subventionnaire, revue et sujet), chacune
        consignée sur chaque travail. Une base qui oublie comment elle a trouvé
        un travail ne peut pas non plus être vérifiée ; chaque rangée de ce site
        porte donc sa provenance.{" "}
        <Link href={`${p("/works")}?route=no_aff`} className="link">
          Parcourez les travaux qu&apos;aucune base fondée sur la seule
          affiliation n&apos;aurait jamais vus
        </Link>
        .
      </>
    ),
    whyTitle: "Pourquoi le livrable est un désaccord",
    whyP1: (
      <>
        Trois modèles de pointe ont trié les mêmes 1 000 travaux selon la même
        grille verrouillée. Ils ne se sont pas accordés. Parmi les travaux
        qu&apos;au moins <em>un</em> modèle a qualifiés de métarecherche,
        environ le tiers seulement l&apos;a été par les trois, et près de la
        moitié repose sur l&apos;avis d&apos;un seul modèle.
      </>
    ),
    whyP2: (p: P) => (
      <>
        La tentation est de moyenner tout cela et de publier un taux de base. Ce
        serait de la fausse précision, et pire : ce serait{" "}
        <em>
          cacher la seule chose intéressante que l&apos;expérience a trouvée
        </em>
        . Deux trieurs peuvent s&apos;accorder sur un <em>taux</em> tout en
        repérant des <em>travaux</em> presque entièrement différents. À un faible
        taux de réponses positives des modèles, l&apos;accord négatif peut dominer
        le pourcentage global. Le dossier historique est le{" "}
        <Link href={p("/screen")} className="link">
          dossier des désaccords
        </Link>{" "}
        : les travaux pour lesquels ces étiquettes automatiques varient. Ils
        peuvent éclairer la grille, mais ne remplacent pas une validation humaine.
      </>
    ),
    limitsTitle: "Ce que les données ne peuvent pas dire",
    limitsLead:
      "Trois limites sont mesurées plutôt qu'atténuées, parce qu'une limite mesurée est un constat et qu'une limite simplement reconnue est une excuse.",
    limitAbstract: "L'écart des résumés est structurel",
    limitRetraction: "La rétractation n'est pas un booléen",
    limitAgreement: "Changez de trieur, la réponse bouge",
    limitsAll:
      "Tous les constats, rendus depuis la sortie de la chaîne de traitement →",
    errorsTitle: "Les erreurs",
    errorsP1: (
      <>
        Ce projet consigne ses propres erreurs.{" "}
        <a
          className="link"
          href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md"
        >
          DEVIATIONS.md
        </a>{" "}
        les recense : des écarts au protocole, des défauts du dispositif de tri,
        un estimateur qu&apos;il a fallu supprimer plutôt que maquiller en borne
        inférieure, une voie de secours bâtie autour d&apos;une source qui, au
        bout du compte, ne dépose pas les données. Elles ont été consignées au
        moment où elles survenaient et avant le dépôt de la proposition, non
        reconstruites après coup.
      </>
    ),
    errorsP2: (
      <>
        Ce n&apos;est pas de l&apos;humilité pour elle-même. Tout
        l&apos;argument de MétaCan est qu&apos;une carte incapable de rapporter
        sa propre erreur n&apos;est pas une carte digne de confiance. Un projet
        qui soutiendrait cela tout en polissant discrètement son propre dossier
        se réfuterait en publiant. Donc : l&apos;estimateur de capture-recapture
        impliquait que le Canada produit 59 % de la métarecherche mondiale, ce
        qui est absurde, et il a été{" "}
        <strong style={{ color: "var(--ink)" }}>supprimé</strong>, non adouci.
        La cascade de résumés avait été bâtie autour de Crossref comme voie de
        secours indépendante des disciplines, et Crossref a récupéré 2 résumés
        contre 180 pour PubMed : cette voie de secours{" "}
        <strong style={{ color: "var(--ink)" }}>n&apos;existe pas</strong>, et
        l&apos;écart est structurel. GPT-5.6 a enfreint le schéma de sortie
        verrouillé sur 18 des 1 000 notices ; le validateur de manifeste
        l&apos;a détecté, et l&apos;incident est consigné plutôt que réparé en
        silence.
      </>
    ),
    methodTitle: "La méthode, en bref",
    methodFrameK: "Base de sondage",
    methodFrame:
      "Chaque travail canadien d'un instantané OpenAlex épinglé (les 482 partitions), chacun compté exactement une fois, admis par une ou plusieurs des quatre voies : affiliation canadienne, organisme subventionnaire canadien, revue canadienne, ou sujet portant sur le Canada.",
    methodScreenK: "Tri",
    methodScreen:
      "1 000 travaux tirés avec des probabilités de sélection connues, stratifiés (français suréchantillonné), triés par Claude Opus 4.8, GPT-5.6 (high) et Grok 4.5 selon une seule grille verrouillée sur sa charge utile complète de huit champs. Les lots ont été randomisés et consignés au manifeste avant l'exécution de tout modèle, et c'est le dispositif qui écrit les fichiers d'étiquettes, jamais le modèle.",
    methodWeightsK: "Poids",
    methodWeights:
      "L'échantillon est stratifié : chaque taux est donc pondéré par le plan de sondage. Un taux calculé sur l'échantillon brut sans le poids est faux, et le poids accompagne chaque notice triée dans l'API.",
    methodAbstractsK: "Résumés",
    methodAbstracts: (
      <>
        Non conservés. Les index inversés représentent 8,6 Go des 9,3 Go de
        texte de la base et le serveur dispose de 13 Go libres. La page de
        détail consulte donc d&apos;abord PubMed et Europe PMC, puis utilise
        OpenAlex en dernier recours. Le fait qu&apos;un travail en <em>ait</em>{" "}
        un est conservé, car c&apos;est en soi un constat.
      </>
    ),
    methodRetractionK: "Rétractation",
    methodRetraction: (
      <>
        Jointe à Retraction Watch par DOI, et conservée dans sa propre table à
        quatre états, parce que le champ{" "}
        <code className="font-mono text-xs">is_retracted</code> d&apos;OpenAlex
        est un booléen sur un espace d&apos;états qui compte au moins quatre
        valeurs.
      </>
    ),
    methodReproK: "Reproductibilité",
    methodRepro: (
      <>
        Chaque nombre de ce site est produit par un script du dépôt et lu depuis{" "}
        <code className="font-mono text-xs">findings.json</code>. Rien
        n&apos;est saisi à la main : le site et l&apos;analyse ne peuvent donc
        pas diverger.
      </>
    ),
    sourcesTitle: "Sources, licence, contact",
    sourcesBody:
      "Données : OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT, données CC BY 4.0. Réalisé par Ahmad Sofi-Mahmudi pour le Défi de données en métarecherche canadienne (Réseau canadien de la reproductibilité).",
    repoLink: "Le dépôt",
    apiLink: "l'API publique",
  },

  apiDocs: {
    title: "L'API publique",
    lead: (p: P) => (
      <>
        Lecture seule, JSON, CORS ouvert, sans clé. Chaque point d&apos;accès
        s&apos;appuie sur les mêmes fonctions que les pages :{" "}
        <code className="font-mono text-xs">searchWorks()</code> sert à la fois{" "}
        <Link href={p("/works")} className="link">
          /works
        </Link>{" "}
        et <code className="font-mono text-xs">/api/v1/works</code>, de sorte
        que l&apos;API ne peut pas répondre à une autre question que la page
        au-dessus d&apos;elle.
      </>
    ),
    baseUrl: "URL de base :",
    thParam: "Paramètre",
    thType: "Type",
    thMeaning: "Signification",
    summaryDesc:
      "La base en un seul objet : le total des travaux, les comptes sans affiliation et sans résumé, les marginales des quatre voies, et l'histogramme de consensus du tri.",
    worksDesc:
      "Parcourir et chercher toute la base. Plein texte sur les titres, tous les filtres de la page de consultation, paginé.",
    worksNote: (
      <>
        <strong>Le compte est plafonné à 10 000.</strong> Compter exactement 4,3
        M de rangées coûte des secondes et personne ne lit le nombre ;{" "}
        <code className="font-mono text-xs">total_is_capped: true</code>{" "}
        signifie donc « au moins 10 000 », et non « exactement 10 000 ». Paginez
        s&apos;il vous en faut davantage.
      </>
    ),
    worksParams: {
      q: "Recherche plein texte sur les titres (tsvector Postgres ; les termes sont liés par ET).",
      year: "Bornes inclusives sur l’année de publication.",
      lang: "Code de langue, p. ex. en, fr.",
      type: "Type de travail, p. ex. article, preprint, dissertation.",
      field: "Domaine principal OpenAlex, p. ex. 'Medicine'.",
      memberships:
        "Appartenance exacte à un établissement canadien, à un organisme subventionnaire ou à un mot-clé OpenAlex. Les valeurs sont les libellés complets affichés dans la notice d'un travail.",
      route:
        "Provenance par voie : pourquoi le travail est dans la base. no_aff renvoie les travaux SANS affiliation canadienne, ceux qu'une base fondée sur la seule affiliation ne voit jamais.",
      retracted: "Seulement les travaux qu'OpenAlex signale comme rétractés.",
      noAbstract:
        "Seulement les travaux sans résumé. Un modèle historique y a attribué environ moitié moins d'étiquettes positives; il ne s'agit pas d'une estimation de l'exactitude.",
      nIn: "Consensus du tri : combien des trois modèles ont qualifié le travail de métarecherche.",
      sort: "Par défaut : cited.",
      page: "per_page : 100 au maximum, 25 par défaut.",
    },
    worksExample: (base: string) =>
      `# Les travaux qu'une base fondée sur la seule affiliation n'aurait jamais vus,\n# les plus cités d'abord :\ncurl -sS "${base}/api/v1/works?route=no_aff&sort=cited&per_page=5" | jq '.results[] | {id, title, cited_by, routes}'\n\n# Travaux en français, sans résumé, parus depuis 2015 :\ncurl -sS "${base}/api/v1/works?lang=fr&no_abstract=1&year_from=2015&per_page=5" | jq\n\n# Recherche plein texte :\ncurl -sS "${base}/api/v1/works?q=reproducibility+crisis&per_page=3" | jq '.results[].title'`,
    workDesc:
      "Un travail, tous ses champs, les voies qui l'ont admis, son état Retraction Watch le cas échéant, et les étiquettes et motifs des trois modèles s'il a été trié.",
    workAbstractParam:
      "Consulter d'abord PubMed et Europe PMC, puis utiliser OpenAlex en dernier recours et désinverser sa notice. La réponse comprend aussi le PMID, le PMCID, ainsi que les noms des personnes signataires affiliées au Canada et leurs établissements lorsqu'ils sont disponibles. Désactivé par défaut : ces champs ne sont pas dans cette base de données, les demander coûte donc un aller-retour vers l'amont.",
    workExample: (base: string) =>
      `# Un travail, avec sa provenance :\ncurl -sS ${base}/api/v1/works/W2342586781 | jq '{id, title, routes}'\n\n# Avec le résumé privilégié, sa source et les identifiants PubMed :\ncurl -sS "${base}/api/v1/works/W2342586781?abstract=1" | jq '{abstract, abstract_source, pmid, pmcid}'`,
    recentDesc:
      "Parcourir la couche OpenAlex évolutive pour les travaux publiés pendant la période récente choisie. Les résultats comprennent la provenance par voie, le résumé conservé, les identifiants PubMed, ainsi que les personnes signataires et les établissements canadiens.",
    recentNote: (
      <>
        <strong>La version v1 figée ne change pas.</strong> Ce point d&apos;accès
        lit une table quotidienne distincte. Aucune catégorie du classificateur
        n&apos;est renvoyée, car le classificateur actuel n&apos;a pas réussi une
        validation humaine.
      </>
    ),
    recentParams: {
      days: "Période de publication inclusive. La valeur par défaut est 15 jours.",
      q: "Recherche de sous-chaîne insensible à la casse dans les titres récents.",
      route: "Exiger l'une des quatre voies d'admission canadiennes.",
      facets:
        "Année de publication, type, langue et disponibilité du résumé exacts. has_abstract accepte true ou false.",
      exact:
        "Valeurs exactes de la notice. Établissement, organisme subventionnaire et mot-clé utilisent l'appartenance au tableau; revue, sujet et domaine utilisent l'égalité exacte.",
      page: "per_page est limité à 100 et vaut 25 par défaut.",
    },
    recentExample: (base: string) =>
      `# Les 15 derniers jours de travaux avec une affiliation canadienne :\ncurl -sS "${base}/api/v1/recent?days=15&route=ca_aff&per_page=5" | jq '{meta, titles: [.results[].title]}'`,
    recentWorkDesc:
      "Un travail récent conservé avec son résumé, ses identifiants, la provenance exacte par voie, les personnes signataires affiliées au Canada et les horodatages d'actualisation.",
    recentWorkExample: (base: string) =>
      `curl -sS ${base}/api/v1/recent/W1234567890 | jq '{id, title, routes, pmid, canadian_authors}'`,
    screenedDesc:
      "Les 1 000 travaux triés, avec les niveaux, les confiances et les motifs des trois modèles, plus le poids de sondage. Les anciennes valeurs brutes du genre ne sont exposées qu'avec un statut explicite indiquant que ce champ est inutilisable.",
    screenedNote: (
      <>
        <strong>L&apos;échantillon est stratifié.</strong> Chaque notice porte
        un <code className="font-mono text-xs">weight</code> (l&apos;inverse de
        la probabilité de sélection). Tout taux calculé sur ces rangées sans
        appliquer le poids est faux.
      </>
    ),
    screenedParams: {
      contestedOnly:
        "Le dossier historique des désaccords : chaque travail qu'au moins un modèle a qualifié de métarecherche. Il documente la variation entre modèles pour élaborer la grille et préparer la validation humaine; il ne situe pas la frontière du domaine.",
      nIn: "Compte de consensus exact.",
      stratum: "p. ex. aff_core, about_only, french, venue_new, fund_new.",
      page: "per_page : 100 au maximum.",
    },
    screenedExample: (base: string) =>
      `# Le dossier des désaccords : travaux sur lesquels les modèles historiques diffèrent.\ncurl -sS "${base}/api/v1/screened?contested_only=1" | jq '.meta.summary'\n\n# Les travaux qu'un SEUL modèle a qualifié de métarecherche :\ncurl -sS "${base}/api/v1/screened?n_in=1" \\\n  | jq '.results[] | {title, opus: .opus.tier, gpt: .gpt.tier, grok: .grok.tier}'`,
    byRouteDesc:
      "Les quatre voies : marginales, et combinaisons exactes de voies.",
    byRouteNote: (
      <>
        Les voies <strong>se recoupent</strong> (un travail peut être admis par
        plusieurs) : <code className="font-mono text-xs">marginals</code>{" "}
        totalise donc plus que la base.{" "}
        <code className="font-mono text-xs">combinations</code> compte chaque
        travail une seule fois et totalise le total exact.
      </>
    ),
    byYearDesc:
      "Les travaux par année, avec en regard les comptes sans affiliation et sans résumé, parce que les deux écarts évoluent dans le temps.",
    byFieldDesc:
      "La répartition par domaine, plus les langues, l'écart des résumés par type, les principales revues, les principaux organismes subventionnaires et le dossier de rétractation à quatre états : tout ce que dessine la page Analytique, en un seul appel.",
    findingsDesc:
      "Tous les constats, servis tels quels depuis le fichier qu’écrivent les scripts du pilote. Chaque nombre cité où que ce soit sur ce site vient d’ici.",
    cohortDesc: (p: P) => (
      <>
        La requête du constructeur de cohortes lui-même. Même analyseur, même
        fonction que{" "}
        <Link href={p("/")} className="link">
          la page d&apos;accueil
        </Link>
        , de sorte que l&apos;API ne peut pas répondre à une autre question que
        la page au-dessus d&apos;elle. Accepte tous les paramètres de
        /api/v1/works, plus les facettes ci-dessous.
      </>
    ),
    cohortNote: (
      <>
        <strong>
          Le compte est exact, et la couverture des étiquettes
          l&apos;accompagne.
        </strong>{" "}
        <code className="font-mono text-xs">meta.total</code> est le vrai N (une
        cohorte se cite par son N), et{" "}
        <code className="font-mono text-xs">meta.labels_cover</code> dit combien
        de travaux de CETTE cohorte portent des étiquettes machine. La table des
        étiquettes est clairsemée; un tableau{" "}
        <code className="font-mono text-xs">labels</code> vide signifie{" "}
        <em>non étiqueté</em>, jamais « hors de la catégorie ».
      </>
    ),
    cohortParams: {
      topic:
        "Sujet principal OpenAlex exact. Les valeurs viennent de la saisie semi-automatique : /api/v1/facets/topic?q=…",
      venue:
        "Nom de revue exact. Les valeurs viennent de /api/v1/facets/venue?q=…",
      routesTri:
        "Facettes de voies à trois états : 1 exige la voie, 0 l'exclut, absent signifie « toutes ». Elles se composent (route_fund=1&route_aff=0 donne la strate financée-seulement), ce que le seul paramètre route ne peut pas exprimer.",
      retracted:
        "1 = rétractés seulement; 0 = exclure les rétractés; absent = tous.",
      abstract:
        "has = seulement les travaux avec résumé; none = seulement ceux sans résumé.",
      category:
        "Facette d'étiquette : les travaux qu'au moins un modèle a placés dans cette catégorie. Étiquettes machine (grand modèle de langage de pointe, non validées); ce filtre restreint la cohorte aux travaux étiquetés.",
      design:
        "Facette d'étiquette : les travaux auxquels au moins un modèle a attribué ce devis d'étude. Pas encore validé contre MEDLINE.",
      agreement:
        "any (défaut) = un modèle suffit; all = tous les modèles ayant étiqueté le travail doivent concorder sur la valeur filtrée.",
      labeled:
        "1 = seulement les travaux portant au moins une étiquette; 0 = seulement les travaux non étiquetés.",
    },
    cohortExample: (base: string) =>
      `# Travaux observationnels étiquetés métarecherche, depuis 2015, avec compte exact :\ncurl -sS "${base}/api/v1/cohort?category=metaresearch&design=observational&year_from=2015" \\\n  | jq '{total: .meta.total, labels_cover: .meta.labels_cover, first: .results[0].title}'\n\n# La strate financée-seulement : travaux financés au Canada SANS affiliation canadienne :\ncurl -sS "${base}/api/v1/cohort?route_fund=1&route_aff=0&per_page=5" | jq '.meta.total'`,
    exportDesc:
      "La cohorte entière en un fichier, diffusé en continu depuis la base de données : toutes les colonnes des travaux, les étiquettes machine avec leur accord, les scores provisoires et l'état de validation de chaque rangée, tel quel.",
    exportNote: (
      <>
        <strong>Plafonné à 100 000 rangées.</strong> La troncature n&apos;est
        jamais silencieuse : elle est déclarée dans{" "}
        <code className="font-mono text-xs">meta.truncated</code> (JSON), dans
        une ligne de commentaire finale (CSV) et dans l&apos;en-tête{" "}
        <code className="font-mono text-xs">X-Export-Truncated</code>. Au-delà
        du plafond, resserrez la cohorte ou reconstruisez la base depuis le
        dépôt.
      </>
    ),
    exportParams: {
      format:
        "csv (défaut) ou json. Tout le reste suit le même vocabulaire de filtres que /api/v1/cohort.",
    },
    exportExample: (base: string) =>
      `# Une cohorte étiquetée en CSV :\ncurl -sSL "${base}/api/v1/cohort/export?category=metaresearch&format=csv" -o cohort.csv\n\n# En JSON, métadonnées d'abord :\ncurl -sS "${base}/api/v1/cohort/export?design=systematic_review&year_from=2020&format=json" | jq '.meta'`,
    permalinkDesc:
      "Créer le permalien citable /q/<hash> d'un état de filtres. Idempotent : le hachage est une fonction des filtres canoniques, la même cohorte reçoit donc toujours la même URL, qui que soit le demandeur et quel que soit le moment.",
    permalinkExample: (base: string) =>
      `curl -sS -X POST "${base}/api/v1/permalink?category=metaresearch&year_from=2015" \\\n  | jq '{url, total, labels_cover}'`,
    labelsStatsDesc:
      "Le panorama des étiquettes : couverture, catégories, devis d'étude, années et langues sur le sous-ensemble étiqueté par machine. La même fonction que rend la page Panorama, de sorte que les deux ne peuvent pas diverger.",
    facetsDesc:
      "Saisie semi-automatique sur les ~85 000 revues distinctes et ~4 500 sujets distincts, avec les comptes sur toute la base. Deux caractères au minimum.",
    facetsExample: (base: string) =>
      `curl -sS "${base}/api/v1/facets/venue?q=canadian+journal" | jq '.results[:3]'\ncurl -sS "${base}/api/v1/facets/topic?q=peer+review" | jq '.results[:3]'`,
    notesTitle: "Remarques",
    noteCors: (
      <>
        <strong>CORS</strong> est ouvert (
        <code className="font-mono text-xs">*</code>). C&apos;est un jeu de
        données de recherche public sous CC-BY ; l&apos;intérêt de le publier
        est que vous puissiez l&apos;interroger depuis votre propre page sans
        serveur mandataire.
      </>
    ),
    noteCache: (
      <>
        <strong>Cache.</strong> Les réponses portent{" "}
        <code className="font-mono text-xs">s-maxage=3600</code>. La base est un
        instantané épinglé : elle ne change pas entre les déploiements, un
        agrégat un peu vieux n&apos;est donc pas un risque, alors que rebalayer
        4,3 M de rangées à chaque requête en serait un.
      </>
    ),
    noteLimit: (
      <>
        <strong>Sans clé, sans limite de débit</strong>, mais c&apos;est un seul
        petit serveur. Restez raisonnable, et s&apos;il vous faut toute la base,
        prenez{" "}
        <a
          className="link"
          href="https://github.com/choxos/CaRN-data-challenge"
        >
          le dépôt
        </a>{" "}
        et reconstruisez-la localement plutôt que d&apos;en paginer quatre
        millions de rangées hors de cette machine.
      </>
    ),
    noteLicense: (
      <>
        <strong>Licence.</strong> Données CC BY 4.0, code MIT. Citez OpenAlex et
        Retraction Watch comme sources amont.
      </>
    ),
  },
};

export const dictionaries: Record<Lang, Dictionary> = { en, fr };

export function getDict(lang: Lang): Dictionary {
  return dictionaries[lang];
}

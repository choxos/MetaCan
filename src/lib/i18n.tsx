import type { ReactNode } from 'react'
import Link from 'next/link'
import { type Lang } from '@/lib/lang'

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
 * Conventions, inherited from the prototype catalog in app/src/lib/i18n.ts:
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

type P = (path: string) => string

const en = {
  meta: {
    titleDefault: 'MétaCan: the Canadian research frame',
    titleTemplate: '%s · MétaCan',
    description:
      '4,299,418 Canadian works from a pinned OpenAlex snapshot. Every record shows why it was found and why it counts as Canadian.',
    works: 'Works',
    workNotFound: 'Work not found',
    screen: 'The three-model screen',
    analytics: 'Analytics',
    landscape: 'Landscape',
    findings: 'Findings',
    api: 'API',
    about: 'About',
    qTitle: (hash: string) => `Cohort ${hash}`,
    qNotFound: 'Cohort not found',
  },

  nav: {
    works: 'Works',
    screen: 'Screen',
    analytics: 'Analytics',
    landscape: 'Landscape',
    findings: 'Findings',
    api: 'API',
    about: 'About',
    cohort: 'Cohort',
    recent: 'Recent',
    network: 'Network',
    howBuilt: 'How this was built',
  },

  network: {
    eyebrow: 'Collaboration',
    title: 'The in-Canada collaboration network',
    sub: 'Researchers with a Canadian-affiliated authorship on a frame work, connected only where BOTH sides of a shared byline were Canadian-affiliated. The overview shows the strongest ties in the frame; search a researcher to see their neighborhood.',
    kpiAuthors: 'researchers with a Canadian-affiliated authorship',
    kpiEdges: 'Canada-only collaboration ties',
    kpiRelease: (r: string) => `author layer: OpenAlex release ${r}`,
    notLoaded: 'The author layer is not loaded yet. The network appears once it is.',
    searchLabel: 'Search researchers',
    searchPlaceholder: 'Search a researcher by name',
    backOverview: 'Overview',
    overviewHint: 'Click a node, or search a researcher, to see their in-Canada neighborhood. Node size is Canadian-affiliated output; edge thickness is tie strength.',
    egoTitle: 'Researcher',
    caWorksOf: (n: string) => `${n} Canadian-affiliated frame works`,
    viewCohort: 'View their works in the cohort builder',
    sharedN: (n: string) => `${n} shared`,
    focusLabel: 'Focus on this researcher',
    loading: 'Loading the neighborhood…',
    empty: 'Nothing to draw.',
    honestyNodes: 'Nodes are researchers with at least one Canadian-affiliated authorship on a frame work; being Canadian-affiliated is a property of the authorship, not the person.',
    honestyEdges: 'An edge exists only where BOTH authorships on the shared work were Canadian-affiliated.',
    honestyWeight: 'Tie strength uses fractional counting: each shared work contributes 1/(number of authors minus 1), so one huge consortium byline does not outrank years of small-team work.',
    honestyGuard: (max: string, excluded: string) => `Works with more than ${max} Canadian-affiliated authorships are excluded from edges (${excluded} works); they remain in search, bylines and every count.`,
    honestyIntl: 'International collaborators are invisible here BY DESIGN: this page maps the in-Canada network, and the cohort builder is where every work, whoever wrote it, is counted.',
  },

  common: {
    previous: '← previous',
    next: 'next →',
    pageOf: (page: string, pages: string) => `page ${page} of ${pages}`,
    page: (page: string) => `page ${page}`,
    noTitle: '[no title]',
    citations: 'citations',
    yes: 'yes',
    no: 'no',
    none: 'not available',
    rangeSeparator: 'to',
    toggleTheme: 'Toggle theme',
    menu: 'Menu',
  },

  footer: {
    line1: (
      <>
        Every number on this site is produced by a script in{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge">
          the repository
        </a>
        , and the errors are recorded in{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md">
          DEVIATIONS.md
        </a>
        , written before submission.
      </>
    ),
    line2:
      'Data: OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT · Data CC-BY-4.0 · Ahmad Sofi-Mahmudi',
    data: 'Data CC BY 4.0',
    code: 'Code MIT',
    snapshot: (date: string) => `OpenAlex snapshot ${date}`,
  },

  /** The front page: the design's landing screen. Every number binds to the database. */
  home: {
    heroEyebrow: 'Open · Provenance-tracked · Bilingual',
    heroTitle: 'A provenance-tracked map of Canadian metaresearch.',
    heroBody:
      'Define a cohort of Canadian research works, count it exactly, export it, and cite it. Every record carries why it was retrieved: four checkable metadata routes over a frozen OpenAlex frame, not a keyword list.',
    searchPh: 'Search titles: try “data sharing”, “biais de publication”…',
    searchBtn: 'Search',
    fYear: 'Publication year',
    fLang: 'Language',
    fType: 'Type',
    fCat: 'Category',
    sparse: '· sparse',
    anyLang: 'Any language',
    anyType: 'Any type',
    anyLabel: 'Any label',
    routesWord: 'Routes',
    routesTri: 'tri-state: any / required / excluded; routes compose',
    routesEg: 'e.g. funded by Canada, no Canadian affiliation →',
    k1l: 'Works in the frozen frame',
    k1s: (date: string) => `482 partitions · snapshot frozen ${date}`,
    k2l: 'Invisible to affiliation',
    k2s: (pct: string) => `${pct} carry no Canadian affiliation at all`,
    k3l: 'French-language works',
    k3s: 'Érudit ISSN/DOI crosswalk pending',
    k4l: 'Machine-screened for training',
    k4s: (version: string) => `classifier ${version} ·`,
    k4warn: 'human validation pending',
    routesTitle: 'Four routes into the frame',
    routesMeta: (n: string) => `${n} works · routes overlap`,
    calloutTail: (pct: string) =>
      `works (${pct}) carry no Canadian affiliation at all; an affiliation-only frame never sees them.`,
    seeTitle: 'What the frame can see',
    seeMeta: 'coverage of the frozen release',
    sVenue: 'Has venue metadata',
    sAbs: 'Has an abstract',
    sFrench: 'French-language',
    sNoFund: 'No funder metadata',
    sNoAbs: 'No abstract',
    seeNote:
      'Coverage holds within the frame. A work absent from covered sources, or lacking every detectable Canadian signal, is outside what this design can estimate.',
    prevMeta: 'No filters · sorted by most cited',
    prevTitle: 'Cohort preview',
    showingLine: (shown: string, total: string, labeled: string) =>
      `Showing ${shown} of ${total} works · machine labels cover ${labeled}; an unlabeled work is unknown, not a negative`,
    seeAll: 'See all works',
    ctaEyebrow: 'The boundary, measured',
    ctaTitle: 'The field’s edge is not a line the models share: it is a region they each cut differently.',
    cta1s: 'works screened by three frontier models under one locked rubric',
    cta2s: (pct: string) => `flagged works called metaresearch by all three: ${pct} set agreement`,
    cta3s: 'flagged works are contested: one or two models said metaresearch, and the disagreement ships as data',
    routeAffName: 'Canadian affiliation',
    routeFundName: 'Canadian funder',
    routeVenueName: 'Canadian venue',
    routeAboutName: 'about Canada',
  },

  works: {
    title: 'Works',
    sub: 'Every work in the frame. Each row carries the routes that admitted it, because a frame that forgets how it found something cannot be audited.',
    countCapped: '10,000+',
    countWorks: (n: string) => `${n} works`,
    matching: (q: string) => ` matching “${q}”`,
    empty: 'No works match these filters.',
  },

  /**
   * The cohort builder: the front page, and the reason the site exists. Every
   * label here sits next to a value that is ALSO the API's vocabulary
   * (?category=metaresearch works in both languages), so only the human words
   * switch.
   */
  cohort: {
    title: 'Build a cohort',
    sub: (n: string) =>
      `Query the ${n} Canadian works in the frame, see the exact count, export it, cite it. Every filter state is a URL; every URL is a reproducible query.`,
    topic: 'Topic',
    venue: 'Venue',
    typeaheadMin: 'type 2+ characters to search',
    typeaheadNone: 'no matches',
    typeaheadClear: 'clear',
    category: 'Category',
    anyCategory: 'Any category',
    design: 'Study design',
    anyDesign: 'Any design',
    agreement: 'Label agreement',
    agreementAny: 'any model suffices',
    agreementAll: 'all models must agree',
    labelSource: 'Evidence source',
    directLabels: 'Direct model labels (sparse)',
    predictedLabels: 'Unvalidated frame prediction signals',
    predictionMode: 'Prediction policy',
    predictionCandidate: 'Candidate signal: either source (direct Gemma or distilled Codex)',
    predictionConsensus: 'Consensus signal: both sources agree',
    labeled: 'Label status',
    labeledAny: 'Any',
    labeledOnly: 'Labeled works only',
    labeledNone: 'Unlabeled works only',
    retraction: 'Retraction',
    retractionAny: 'Any',
    retractionOnly: 'Retracted only',
    retractionExclude: 'Exclude retracted',
    abstract: 'Abstract',
    abstractAny: 'Any',
    abstractHas: 'Has abstract',
    abstractNone: 'No abstract',
    routes: 'Canadian routes',
    routeAny: 'any',
    routeRequire: 'required',
    routeExclude: 'excluded',
    routeAffLabel: 'Affiliation',
    routeFundLabel: 'Funder',
    routeVenueLabel: 'Venue route',
    routeAboutLabel: 'About Canada',
    routesHint:
      'The four routes compose: require the funder route and exclude affiliation to get the funder-only stratum no affiliation-based frame ever sees.',
    labelFacetsTitle: 'Machine labels',
    labelFacetsHint:
      'Direct Codex and Gemma labels are unvalidated and sparse. Distilled predictions cover the full frame and are also unvalidated. Choose the evidence source explicitly; absence of a direct label is never a negative label.',
    /** The sentence that must travel with every filtered result set. */
    coverage: (labeled: string, total: string) => `Labels cover ${labeled} of ${total} works in this cohort.`,
    coverageNote:
      'The rest are unlabeled, which is not a negative label: the label table is sparse today and grows as labeling rounds land.',
    predictionCoverage: (predicted: string, total: string) =>
      `Distilled predictions cover ${predicted} of ${total} works in this cohort.`,
    predictionCoverageNote:
      'Predictions are machine_predicted_unvalidated. The Gemma side is a direct model label for every work (title-only); the Codex side is a distilled, calibrated classifier. Candidate is the union; consensus is the intersection.',
    categoryNames: {
      metaresearch: 'Metaresearch',
      metaepi_narrow: 'Meta-epidemiology (narrow)',
      metaepi_broad: 'Meta-epidemiology (broad)',
      bibliometrics: 'Bibliometrics',
      sts: 'Science and technology studies',
      scholarly_communication: 'Scholarly communication',
      open_science: 'Open science',
      research_integrity: 'Research integrity',
      // Not a facet: the model declined to judge on the evidence it was given.
      // It appears in Landscape counts because hiding it would overstate the rest.
      insufficient_payload: 'Insufficient payload (model declined to judge)',
    } as Record<string, string>,
    designNames: {
      randomized_trial: 'Randomized trial',
      nonrandomized_trial: 'Non-randomized trial',
      observational: 'Observational',
      systematic_review: 'Systematic review',
      meta_analysis: 'Meta-analysis',
      case_report: 'Case report',
      qualitative: 'Qualitative',
      simulation_or_modeling: 'Simulation or modeling',
      bench_or_experimental: 'Bench or experimental',
      theoretical_or_conceptual: 'Theoretical or conceptual',
      not_applicable: 'Not applicable',
      design_other: 'Other design',
    } as Record<string, string>,
    domainNames: {
      methods: 'Methods',
      reporting: 'Reporting',
      reproducibility: 'Reproducibility',
      evaluation: 'Evaluation',
      incentives: 'Incentives',
    } as Record<string, string>,
    genreNames: {
      empirical: 'Empirical',
      review: 'Review',
      methods: 'Methods',
      commentary: 'Commentary',
      editorial: 'Editorial',
      protocol: 'Protocol',
      dataset: 'Dataset',
      software: 'Software',
      other: 'Other',
    } as Record<string, string>,
    exportTitle: 'Export',
    exportCsv: 'CSV',
    exportJson: 'JSON',
    exportNote: (cap: string) =>
      `The current cohort, streamed from the database: every work column, the machine labels, the provisional scores, and the per-row validation status. Exports are capped at ${cap} rows.`,
    exportTruncated: (total: string, cap: string) =>
      `This cohort has ${total} works, more than the ${cap}-row export cap: the file will contain the first ${cap} ordered by OpenAlex id, and says so in its last line. Narrow the cohort, page the API, or rebuild the frame from the repository for the rest.`,
    citeButton: 'Cite this cohort',
    citeWorking: 'minting…',
    citeCopy: 'copy',
    citeCopied: 'copied',
    citeNote:
      'Mints a permanent /q/ link for this exact query. The same filters always produce the same link, whoever asks.',
    apiLine: 'This cohort over the API:',
    // The design's cohort-builder chrome.
    eyebrow: 'Cohort builder',
    titleTail: 'works, Canadian by any of four routes.',
    subA: 'Every filter state is a URL; the URL is the query; the query is citable via',
    subB: '. The page, the API and the export parse the same parameters.',
    exportCsvBtn: 'Export CSV',
    exportJsonBtn: 'Export JSON',
    copyPermalinkBtn: 'Copy /q/ permalink',
    apiQueryBtn: 'API query',
    searchTerm: 'Search term',
    authorTerm: 'Author',
    authorPlaceholder: 'Author name',
    resultsWord: 'results',
    resultsByYear: 'Results by year',
    pubDate: 'Publication date',
    dateLast5: 'Last 5 years',
    dateLast10: 'Last 10 years',
    dateSince2000: 'Since 2000',
    langEn: 'English',
    langFr: 'French',
    citations: 'Citations',
    cited10: '10+ citations',
    cited100: '100+ citations',
    categories: 'Categories',
    sparseCov: 'Machine labels · sparse coverage',
    evidence: 'Evidence',
    evAbs: 'Has abstract',
    evUnanimous: 'Unanimous in-scope (3/3)',
    evRetracted: 'Retracted',
    evLabeled: 'Carries direct labels',
    unlabeledNote: 'An unlabeled work is unknown, not a negative. Label coverage is reported on every query.',
    matchTailQ: (q: string) => `works match “${q}”`,
    matchAll: 'works in the cohort',
    ofTotal: (n: string) => `of ${n}`,
    triAny: 'any',
    triReq: 'req',
    triExcl: 'excl',
    rsAff: 'affiliation',
    rsFund: 'funder',
    rsVenue: 'journal',
    rsAbout: 'aboutness',
  },

  landscape: {
    title: 'Landscape',
    sub: 'What the machine-labeled subset of the frame looks like: categories, study designs, years, languages. Below it, the frame described by itself.',
    bannerTitle: 'Read the coverage before the counts',
    banner: (labeled: string, frame: string, pct: string) =>
      `Labels cover ${labeled} of the ${frame} works in the frame (${pct}). Every count in this section is over that labeled subset only; it says what the labeled works look like, never how much of the frame is in a category. These are direct model labels, unvalidated, and an unlabeled work is NOT a negative.`,
    tileLabeled: 'Labeled works',
    tileLabeledNote: 'works with at least one model label',
    tileRows: 'Label rows',
    tileRowsNote: 'one per (work, model) pair',
    tileModels: 'Models',
    tileModelsNote: 'each work is labeled by up to three',
    byCategoryTitle: 'Labeled works by category',
    byCategoryNote:
      'A work counts under a category if at least one model applied it; the darker figure requires every model that labeled the work to agree. The gap between the two columns is the models disagreeing, and that gap is a finding, not noise.',
    byDesignTitle: 'Labeled works by study design',
    byDesignNote:
      'Same two readings: any model, and all models in agreement. No design label here is MEDLINE-validated yet; when that validation lands it will be marked explicitly.',
    byYearTitle: 'Labeled works by year',
    byYearNote:
      'Where the labeling rounds have reached so far. This is coverage of the label table, not a property of the field.',
    byLangTitle: 'Labeled works by language',
    byLangNote: 'Coverage again: the labeling rounds sample the frame, and the frame is 6% French.',
    thCategory: 'Category',
    thDesign: 'Study design',
    thYear: 'Year',
    thLang: 'Language',
    thAny: 'Any model',
    thAll: 'All models agree',
    thLabeled: 'Labeled works',
    frameTitle: 'The frame itself',
    frameSub: (n: string) =>
      `Everything below is over all ${n} works, labeled or not. Every figure is a query against the database, computed at request time and cached for an hour; nothing here is a number someone typed.`,
    // The design's landscape additions.
    eyebrow: 'Landscape',
    designTitle: 'The shape of the frame',
    designBody:
      'Counts and trends over the frozen release. Design-based intervals arrive with the human audit; nothing on this page estimates field prevalence.',
    yearTitle: 'Works per publication year',
    yearMeta: (min: string, max: string) => `${min} to ${max}`,
    baselineL: (y: string) => `${y} baseline`,
    peakL: (y: string) => `${y} peak`,
    growthL: (y: string) => `Growth since ${y}`,
    latestL: (y: string) => `Works in ${y}`,
    catsTitle: 'Machine label counts',
    catsMeta: (n: string) => `over ${n} labeled works`,
    fieldsTitle: 'Top fields',
    fieldsMeta: 'whole frame · OpenAlex primary field',
    langTitle: 'Language mix',
    langMeta: 'whole frame',
    langEn: 'English',
    langFr: 'French',
    langOther: 'Other languages',
  },

  /**
   * The live layer: recent Canadian works synced daily from the OpenAlex API
   * into recent_work, visibly separate from the frozen frame. Counts and sync
   * metadata come from recent_work / recent_sync_run, never from copy.
   */
  recent: {
    eyebrow: 'Live layer',
    title: 'Recent publications',
    body: (n: string) =>
      `A visibly separate rolling layer of new Canadian works, updated daily from the OpenAlex API. These records are not part of the frozen ${n}-work release and carry no classifier category until a classifier passes human validation.`,
    liveChip: 'live layer',
    statusA: 'Updated daily ·',
    statusB: (date: string) => `works added since the ${date} freeze`,
    lastSync: (ts: string) => `last sync ${ts}`,
    lastSyncFailed: (ts: string) => `last sync attempt failed (${ts})`,
    lastSyncNone: 'no completed sync yet',
    lexicon: (v: string) => `lexicon ${v}`,
    empty:
      'The live layer holds no synced works right now. The sync runs daily against the OpenAlex API; its latest status is reported above, and an empty layer is reported as empty rather than filled in.',
  },

  qpage: {
    eyebrow: 'A citable cohort query',
    title: (hash: string) => `Cohort q/${hash}`,
    sub: 'This link names a query, not a result list. The filters below are stored; the counts are recomputed live against the pinned snapshot every time the page loads, because re-running the query is the honest way to reproduce a number.',
    filtersTitle: 'The query',
    noFilters: 'No filters: this cohort is the entire frame.',
    countsTitle: 'Counts, recomputed now',
    totalLabel: 'Works in the cohort',
    labeledLabel: 'Carry machine labels',
    labeledNote: 'direct model labels, unvalidated; the rest are unlabeled, not negative',
    snapshotTitle: 'Snapshot',
    snapshotLine: (release: string, built: string) =>
      `OpenAlex pinned release ${release} (all 482 partitions, publication years 2000 to 2025); frame built ${built}. The snapshot is byte-identical forever, so this query returns the same works on any future day.`,
    authorLayerLine: (release: string) =>
      `This cohort filters on authors, so it also reads the author layer, harvested from OpenAlex release ${release}.`,
    authorLayerDrift: (current: string) =>
      `The site's author layer has since been refreshed (now release ${current}); live counts may differ from when this permalink was minted.`,
    citeTitle: 'Suggested citation',
    citation: (n: string, hash: string, date: string, release: string) =>
      `Sofi-Mahmudi A. MetaCan: the Canadian research frame. Cohort q/${hash} (${n} works; retrieved ${date}). https://metacan.xera.ac/q/${hash}. Data: OpenAlex pinned snapshot ${release}.`,
    openBuilder: 'Open this cohort in the builder →',
    apiLabel: 'The same cohort over the API',
    exportLabel: 'Export',
  },

  filters: {
    searchPlaceholder: 'Search titles: full-text over 4,299,418 works',
    searchAria: 'Search titles',
    searchButton: 'Search',
    route: 'Route',
    field: 'Field',
    type: 'Type',
    language: 'Language',
    yearRange: 'Year range',
    from: 'from',
    to: 'to',
    yearFrom: 'Year from',
    yearTo: 'Year to',
    consensus: 'Screen consensus',
    sort: 'Sort',
    flags: 'Flags',
    retracted: 'Retracted',
    noAbstract: 'No abstract',
    anyRoute: 'Any route',
    routeAff: 'Canadian affiliation',
    routeFund: 'Canadian funder',
    routeVenue: 'Canadian venue',
    routeAbout: 'About Canada',
    routeNoAff: 'NO affiliation (invisible to the usual frame)',
    anyField: 'Any field',
    anyType: 'Any type',
    anyLanguage: 'Any language',
    sortCited: 'Most cited',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    consensusAny: 'Any',
    consensus3: '3/3: all three models',
    consensus2: '2/3: contested',
    consensus1: '1/3: one model only',
    consensus0: '0/3: all three said out',
    active: (n: number) => `${n} filter${n === 1 ? '' : 's'} active`,
    clearAll: 'clear all',
  },

  workRow: {
    routeAffTitle: 'Admitted by a Canadian affiliation',
    routeFundTitle: 'Admitted by a Canadian funder',
    routeVenueTitle: 'Admitted by a Canadian venue',
    routeAboutTitle: 'Admitted by being about Canada',
    noAffTitle: 'No Canadian affiliation. An affiliation-only frame would never have seen this work.',
    caAuthorTitle: 'Canadian institutional affiliation on this work.',
    moreAuthors: (n: number) => `+${n} more`,
    noAbstractChip: 'no abstract',
    noAbstractTitle:
      'No abstract in OpenAlex. The screen finds half as much metaresearch in this stratum, so this is a measured bias, not a missing field.',
    consensusAll: '3/3 metaresearch',
    consensusN: (n: number) => `${n}/3 metaresearch`,
    consensusAllTitle: 'All three models called this metaresearch.',
    consensusNTitle: (n: number) =>
      `Only ${n} of 3 models called this metaresearch: a contested work, on the field's empirical boundary.`,
    retractionMissedTitle: (nature: string) =>
      `${nature}: recorded by Retraction Watch, NOT flagged by OpenAlex.`,
    retractionMissedSuffix: ' · OpenAlex missed it',
    // Label provenance, on every cohort row. The framing is part of the data:
    // these are direct model labels, unvalidated.
    labelsPrefix: 'labels',
    labelChipTitle: (model: string, cats: string, design: string, conf: string) =>
      `Direct model label, unvalidated. ${model} said: categories [${cats || 'none'}], study design ${design || 'none'}, confidence ${conf || 'unstated'}.`,
    labelNoCats: 'no category',
    agreementAgree: 'models agree',
    agreementAgreeTitle: 'Every model that labeled this work gave the same categories and study design.',
    agreementSplit: 'models split',
    agreementSplitTitle:
      'The models that labeled this work disagree on its categories or study design. The disagreement ships as data; it is not averaged away.',
    agreementSingle: 'one model',
    agreementSingleTitle: 'Only one model has labeled this work so far, so there is nobody to agree or disagree with.',
    unlabeled: 'unlabeled',
    unlabelledTitle:
      'No model has labeled this work yet. The label table is sparse and grows as labeling rounds land; absence of a label is NOT a negative label.',
    predictionPrefix: 'machine prediction',
    predictionCandidate: 'candidate',
    predictionConsensus: 'consensus',
    predictionNone: 'none',
    predictionTitle: (
      version: string,
      disagreement: string,
      uncertainty: string,
      status: string,
    ) =>
      `Distilled Codex plus direct title-only Gemma. Version ${version}. Teacher disagreement score ${disagreement}. Threshold uncertainty score ${uncertainty}. Status ${status}. This is not a human validated label.`,
  },

  /**
   * Shown ONLY on views that carry machine scores (the work detail block and the
   * analytics spread row). The scores are a PROVISIONAL BASELINE from a model
   * whose maturity gate has not passed (pilot/results/maturity.json), and this
   * banner is the sentence that must travel with them everywhere they appear.
   */
  scoreBanner: {
    text: 'Baseline scores from an immature model (maturity gate not passed, 7 training rounds). Scores rank; they never assert a category.',
  },

  workDetail: {
    back: '← all works',
    onOpenAlex: (id: string) => `${id} on OpenAlex`,
    citations: (n: string) => `${n} citations`,
    routeAffName: 'Canadian affiliation',
    routeAffWhy: 'An author listed a Canadian institution. This is the only route the usual frame has.',
    routeFundName: 'Canadian funder',
    routeFundWhy: 'A Canadian agency funded it. The work may carry no Canadian affiliation at all.',
    routeVenueName: 'Canadian venue',
    routeVenueWhy: 'It was published in a Canadian venue.',
    routeAboutName: 'About Canada',
    routeAboutWhy: 'Its subject is Canada, wherever its authors sit.',
    clsTitle: 'Classification',
    clsBadge: 'machine, unvalidated',
    clsSubDirect: (n: number) =>
      n === 1
        ? 'Labeled directly by one model reading the full record.'
        : `Labeled directly by ${n} models reading the full record.`,
    clsSubConsensus: 'Machine predicted; the direct Gemma label and the distilled Codex classifier agree on what is shown here.',
    clsSubCandidate: 'Machine predicted; a candidate call from one source (direct Gemma or distilled Codex), not a consensus.',
    clsNoCats: 'The models applied no category: nothing in the taxonomy fit this work.',
    clsSplitNote: 'The models disagree on parts of this classification; every voice is preserved in the section at the end of the page.',
    clsMethodsHint: 'How this classification was reached, model by model and score by score, is at the end of the page under "How this classification was reached".',
    clsNone: 'Not classified yet. No model has labeled this work and no prediction covers it; absence of a label is not a negative label.',
    methodsTitle: 'How this classification was reached',
    methodsToggle: 'expand',
    whyTitle: 'Why this work is in the frame',
    whySub: 'A frame that forgets how it found something cannot be audited. These are the routes that admitted this work.',
    noAffCallout: (
      <>
        <strong style={{ color: 'var(--mc-accent)' }}>No Canadian affiliation.</strong> An affiliation-only frame,
        the usual design, would never have seen this work. It is one of the works that make the case for inverting
        the frame.
      </>
    ),
    postPubTitle: 'Post-publication record',
    nature: 'Nature',
    reason: 'Reason',
    date: 'Date',
    flagged: 'Flagged by OpenAlex?',
    flaggedYes: 'Yes',
    flaggedNo: 'No. Retraction Watch records this, and OpenAlex does not flag it.',
    rwSource: (
      <>
        Source: Retraction Watch, joined by DOI. OpenAlex records retraction as{' '}
        <code className="font-mono text-xs">is_retracted</code>, a boolean over a state space with at least four
        values, so it cannot express an expression of concern, a correction or a reinstatement; it reports them as{' '}
        <code className="font-mono text-xs">false</code>, which reads as &ldquo;fine&rdquo;.
      </>
    ),
    openalexOnly: 'OpenAlex flags this work as retracted, but it carries no matching Retraction Watch record in this frame.',
    screenTitle: 'The three-model screen',
    screenAll: 'all 5,600 screened works →',
    consensus3: (
      <>
        <strong style={{ color: 'var(--in-scope)' }}>All three models</strong> called this metaresearch. It is in
        the settled core of the field.
      </>
    ),
    consensus0: (
      <>
        <strong style={{ color: 'var(--out)' }}>All three models</strong> called this out of scope.
      </>
    ),
    consensusN: (n: number) => (
      <>
        <strong style={{ color: 'var(--contested)' }}>{n} of 3 models called this metaresearch.</strong> This work
        is <em>contested</em>: it sits on the field&apos;s empirical boundary, and whether it counts depends on
        which model you asked. It is one of the 51 works in the disagreement dossier.
      </>
    ),
    stratumLine: (stratum: string, weight: string) =>
      `stratum: ${stratum} · design weight: ${weight} (the sample is stratified; any rate computed without the weight is wrong)`,
    genre: (g: string) => `genre: ${g}`,
    aboutCanada: 'about Canada',
    confidence: 'confidence',
    tierAdjacent: 'T3 · adjacent, not in scope',
    labelsTitle: 'Direct model labels (unvalidated)',
    labelsSub:
      'Per-model category and study-design labels from the labeling rounds. They are machine output, unvalidated, and the disagreement between models ships as data. No study design here is MEDLINE-validated yet.',
    labelCategories: 'Categories',
    labelDesign: 'Study design',
    labelDomain: 'Domain',
    labelGenre: 'Genre',
    labelAboutSystem: 'About the Canadian research system',
    labelAboutTopic: 'About a Canadian topic',
    predictionTitle: 'Full frame machine prediction',
    predictionSub:
      'The Gemma side is a direct model label for every work in the frame, read from the title-only record. The Codex side is a classifier learned from the 10,348 direct Codex labels and calibrated to design-weighted sample rates; fields without enough sample support carry no Codex call. Candidate is the union of the two sides; consensus is their intersection. These outputs are machine_predicted_unvalidated and are not human labels.',
    predictionCandidate: 'Candidate categories',
    predictionConsensus: 'Consensus categories',
    predictionCandidateValue: 'Candidate signal',
    predictionConsensusValue: 'Consensus signal',
    predictionTeacherScores: 'Distilled classifier scores by category (both heads)',
    predictionDisagreement: 'Teacher disagreement score',
    predictionUncertainty: 'Threshold uncertainty score',
    scoresTitle: 'Machine scores (provisional)',
    scoresSub:
      'The two teacher heads of the student model, read on this work. A score orders the frame for review; it never asserts a category, and the validation status ships verbatim with every row.',
    scoreOpus: 'Opus teacher head',
    scoreGpt: 'GPT teacher head',
    scoreSpread: 'Teacher spread',
    scoreSpreadNote: 'how far apart the two teachers sit on this one work',
    validationStatus: 'Validation status',
    validationStatusNote:
      'verbatim from the scoring run: score_only means the number may rank works, and no category label ships from it',
    abstractTitle: 'Abstract',
    abstractStored: 'Stored with the screening record, where it is evidence for the labels above.',
    abstractFetched:
      'Fetched live from OpenAlex and de-inverted. Abstracts are not stored in this database: the inverted indexes are 8.6 GB of the frame’s 9.3 GB of text, and the host has 13 GB free.',
    abstractUnavailable: 'OpenAlex records an abstract for this work, but it could not be fetched just now.',
    abstractNone:
      'No abstract. This is not a gap in this database; OpenAlex has none either. 23.3% of the frame is in this state, and the screen finds HALF as much metaresearch here, so the absence is a measured bias rather than a missing field.',
    recordTitle: 'The record',
    venue: 'Venue',
    topic: 'Topic',
    field: 'Field',
    institutions: 'Canadian institutions',
    funders: 'Funders',
    keywords: 'Keywords',
    hasAbstract: 'Has abstract in OpenAlex',
    api: 'API',
    // The design's record-page chrome.
    backCohort: 'Back to cohort',
    record: 'Record',
    metaTitle: 'Bibliographic record',
    absSrc: 'fetched live from OpenAlex',
    absNoneShort: 'No abstract in any covered source. Its absence is recorded, not treated as a negative.',
    colModel: 'Model arm',
    colCats: 'Categories',
    colDesign: 'Study design',
    colConf: 'Confidence',
    agreeNote: 'Agreement compares identical category sets and study designs across arms.',
    predBadge: 'Teacher imitation',
    predNote: 'Not calibrated prevalence, not ground truth. Human validation pending.',
    predScore: (model: string) => `metaresearch head score (${model})`,
    predVersion: 'Version',
    quickStats: 'Quick stats',
    qsCites: 'Citations',
    qsYear: 'Published',
    qsRoutes: 'Admission routes',
    qsAbstract: 'Has abstract',
    actJson: 'Download record (JSON)',
    actPerma: 'Copy permalink',
    actPermaCopied: 'Copied',
    actReport: 'Report an issue with this record',
    explore: 'Explore more',
    exVenueL: 'Same venue',
    exTopicL: 'Same topic',
    exCatL: 'Category',
    exFrL: 'French-language works',
    expAff: 'At least one author lists a Canadian institution in the pinned OpenAlex snapshot.',
    expFund: 'A Canadian funder is recorded on the work.',
    expVenue: 'Published in a venue whose home country is Canada.',
    expAbout: 'The title or abstract carries a Canadian signal from the geographic lexicon.',
    expNoAff: 'No Canadian affiliation: this work is invisible to an affiliation-only frame.',
  },

  screen: {
    scEyebrow: 'Screening',
    eyebrow: (n: string) => `${n} works · Opus 4.8 · GPT-5.6 (high) · Grok 4.5 · one locked rubric`,
    h1: 'The field’s boundary is not a line. It is a region.',
    p1: (v: { n: string; anyIn: number; n3: number; pct3: string; n1: number; pct1: string }) => (
      <>
        Three frontier models screened the same {v.n} works, drawn from the real frame with known selection
        probabilities, against the same locked rubric on its full eight-field payload. Of the{' '}
        <strong style={{ color: 'var(--ink)' }}>{v.anyIn}</strong> works <em>any</em> model called metaresearch,
        only <strong style={{ color: 'var(--in-scope)' }}>{v.n3}</strong> ({v.pct3}) were called metaresearch by
        all three, and <strong style={{ color: 'var(--contested)' }}>{v.n1}</strong> ({v.pct1}) rest on a single
        model&apos;s opinion.
      </>
    ),
    p2: (
      <>
        Two screeners can agree on a <em>rate</em> while finding almost entirely different <em>works</em>. At a ~1%
        base rate, the settled rejects buy 98% agreement for free; this is why an agreement statistic computed
        over the whole sample tells you nothing about the boundary, and why the table below, not a percentage, is
        the deliverable.
      </>
    ),
    statAnyLabel: 'Any model said metaresearch',
    statAnyNote: "the disagreement dossier: the field's empirical boundary",
    statAllLabel: 'All three agreed',
    statAllNote: (pct: string) => `${pct} of the dossier: the settled core`,
    statTwoLabel: 'Two of three',
    statTwoNote: 'contested',
    statOneLabel: 'One model only',
    statOneNote: (pct: string) => `${pct} of the dossier rests on one model's opinion`,
    modelsTitle: 'The three models are not interchangeable',
    modelsSub: (v: { n: string; anyIn: number }) => (
      <>
        How many of the {v.n} works each model called metaresearch (tier T1 or T2), on identical input. T3 is{' '}
        <em>adjacent</em> and does not count as in scope, which is why a model&apos;s count can never exceed the{' '}
        {v.anyIn} works in the dossier.
      </>
    ),
    modelsSpread: (
      <>
        Swap which model you call &ldquo;the screener&rdquo; and the size of the field moves. That spread, not the
        binomial confidence interval on any one model&apos;s labels, is the honest uncertainty on how big Canadian
        metaresearch is.
      </>
    ),
    dossierTitle: 'The disagreement dossier',
    dossierSub:
      'All three verdicts, confidences and reasons side by side. These are the works against which the inclusion criteria have to be written because reasonable screeners, given the same rubric and evidence, disagree on them.',
    tabDossier: 'The dossier (any model said in)',
    tab3: '3/3: settled core',
    tab2: '2/3: contested',
    tab1: '1/3: one model only',
    tab0: '0/3: settled rejects',
    tabAll: 'All screened works',
    workCount: (total: string, one: boolean) => `${total} work${one ? '' : 's'}`,
    thWork: 'Work',
    thStratum: 'Stratum',
    emptyView: 'No works in this view.',
    tierT1: 'T1: core metaresearch (counts as IN)',
    tierT2: 'T2: metaresearch (counts as IN)',
    tierT3: 'T3: adjacent. Does NOT count as in scope.',
    tierOut: 'out of scope',
    foundTitle: 'What the screen actually found',
    computed: (date: string) => `Computed ${date}`,
    allFindings: 'all 32 findings',
    dossierJson: 'this dossier as JSON',
  },

  analytics: {
    title: 'Analytics',
    sub: (n: string) =>
      `The frame, described by itself. Every figure is a query against the ${n} works, computed at request time and cached for an hour; nothing here is a number someone typed.`,
    tileWorks: 'Works in the frame',
    tileNoAff: 'No Canadian affiliation',
    tileNoAbs: 'No abstract',
    tileNotices: 'Retraction notices',
    ofFrame: (pct: string) => `${pct} of the frame`,
    joinedFromRW: 'joined from Retraction Watch',
    byYearTitle: 'Works by year',
    byYearNote: (pct: string, n: string) =>
      `The frame over time, with the works that carry NO Canadian affiliation drawn underneath. The gap between the two lines is what an affiliation-only frame silently loses: ${pct} of the frame, ${n} works.`,
    byRouteTitle: 'Works by route',
    byRouteNote: (sum: string, over: string, total: string) =>
      `Why each work is in the frame. The four routes OVERLAP; a work can be admitted by several. These bars therefore sum to ${sum}, which is ${over} more than the ${total} works in the frame. That overlap is the next chart.`,
    overlapTitle: 'The overlap: exact route combinations',
    overlapNote:
      'Each work counted once, under the exact set of routes that admitted it. Teal bars are works admitted by a SINGLE route: remove that route from the design and those works vanish from the frame entirely.',
    byFieldTitle: 'Works by field',
    byFieldNote: "OpenAlex's primary field, as recorded.",
    byLangTitle: 'Works by language',
    byLangNote:
      'French is highlighted. It is 6% of the frame, it is oversampled in the screen on purpose, and it is the language the abstract cascade rescues worst (15.4% recovery against 38.8% for English).',
    gapTitle: 'The abstract gap is structural, not noise',
    gapNote: (pct: string) =>
      `Share of works with NO abstract, by type, worst first. ${pct} of the frame has no abstract, and the screen finds HALF as much metaresearch there. If the gap were random, a better index would fix it. It is not random: it is concentrated in types that never carry an abstract at all. "Just screen the works that have abstracts" is therefore a selection on a covariate that predicts the outcome.`,
    retractionTitle: 'The post-publication record has four states, and OpenAlex has a boolean',
    retractionNote: (notices: string, missed: string) =>
      `${notices} works in the frame carry a Retraction Watch notice. The solid bar is what OpenAlex flags; the hatched bar is what it reports as “false”: ${missed} works whose notice OpenAlex does not carry, which a reader takes to mean “fine”. An expression of concern is not a retraction, and \`is_retracted\` has no way to say so.`,
    thState: 'State',
    thWorks: 'Works',
    thFlagged: 'OpenAlex flags it',
    thMissed: 'OpenAlex reports false',
    venuesTitle: 'Top venues',
    venuesNote: 'By work count in the frame.',
    fundersTitle: 'Top funders',
    fundersNote:
      'Split from the semicolon-separated funder string. The funder route admits works that carry no Canadian affiliation at all.',
    scoresTitle: 'Teacher spread over the frame (provisional baseline)',
    scoresNote: (n: string) =>
      `Every one of the ${n} works carries two provisional teacher-head scores, and the spread is how far the two heads sit apart on one work. These figures come from pilot/results/frame_scores.json, the file the scoring run writes; nothing here was typed by hand.`,
    tileScored: 'Works scored',
    tileScoredNote: 'every work in the frame, by the two-teacher panel',
    tileMeanSpread: 'Mean teacher spread',
    tileMeanSpreadNote: 'the average disagreement between the two heads',
    tileP99Spread: 'Teacher spread, 99th percentile',
    tileP99SpreadNote: '99% of works sit below this spread',
    tileSplit: 'Works where the teachers would split',
    tileSplitNote: 'spread above 0.5',
    apiNote: (p: P) => (
      <>
        Every series here is available as JSON:{' '}
        <Link href={p('/api-docs')} className="link">
          see the API
        </Link>
        .
      </>
    ),
  },

  charts: {
    allWorks: 'All works',
    noCaAff: 'No Canadian affiliation',
    works: 'Works',
    noAbstract: 'No abstract',
    flagged: 'OpenAlex flags it',
    missed: 'OpenAlex reports FALSE',
    routeAff: 'Canadian affiliation',
    routeFund: 'Canadian funder',
    routeVenue: 'Canadian venue',
    routeAbout: 'About Canada',
  },

  findings: {
    title: 'Findings',
    designTitle: 'What the pilot measured.',
    lead: (n: number) => (
      <>
        All {n} findings, rendered directly from{' '}
        <code className="font-mono text-xs">pilot/results/findings.json</code>: the file the pilot scripts write.
        No number on this page was typed by a human, which is the only way to guarantee the site and the analysis
        cannot drift apart.
      </>
    ),
    apiLink: 'the same file over the API →',
    computed: (key: string, date: string) => `${key} · computed ${date}`,
    originalLabel: '',
    sourceField: 'Source field',
    titles: {
      affiliation_gap: 'The affiliation gap',
      topics: 'The topic route',
      erudit: 'Érudit is invisible to OpenAlex',
      language_gap: 'The language gap',
      polysemy: 'Polysemy defeats the lexicon',
      capture_recapture_fails: 'Capture-recapture is void here',
      canadian_linkage: 'Canadian linkage',
      openalex_is_metered: 'OpenAlex is metered',
      base_rate: 'The base rate',
      agreement: 'Swap the screener, move the answer',
      base_rate_robustness: 'Base-rate robustness',
      topic_route_recall: 'Topic-route recall',
      screening_cost: 'What screening costs',
      audit_power: 'The power of a human audit',
      label_limits: 'What the labels cannot tell us',
      agent_variance: 'Agent variance',
      retraction_record: 'A boolean over a four-state space',
      funder_route_recall: 'Funder-route recall',
      abstract_cascade: 'The abstract gap is structural',
      preprint_coverage: 'Preprint coverage',
      trial_linkage: 'Trial linkage',
      three_model_screen: 'The three-model screen',
    } as Record<string, string>,
  },

  about: {
    title: 'About MétaCan',
    lead: 'MétaCan is a map of Canadian metaresearch that can be audited. That sentence is doing more work than it looks: almost no research map can be, and the reason is structural rather than careless.',
    flipTitle: 'The frame flip',
    flipP1: (
      <>
        The usual way to map a field is to retrieve what <em>looks</em> like the field: a keyword list, a topic
        classifier, or a journal set. It then asks which of the results are Canadian. This makes the field&apos;s
        boundary a property of your query. And it has a fatal property for anyone who wants to check your work:{' '}
        <strong style={{ color: 'var(--ink)' }}>
          you cannot measure the recall of a lexicon against the works the lexicon never showed you
        </strong>
        . The misses are invisible by construction, so the map cannot report its own error, so it cannot be audited.
      </>
    ),
    flipP2: (
      <>
        So this project inverts the frame. It starts from{' '}
        <strong style={{ color: 'var(--ink)' }}>all Canadian research</strong>, an external and checkable criterion
        enumerable from a pinned OpenAlex snapshot. It makes field membership a{' '}
        <em>classification over a known universe</em> rather than a <em>retrieval over the literature</em>. Once the
        universe is enumerable, recall becomes measurable, a sample has known selection probabilities, and a
        disagreement between screeners becomes a finding instead of an embarrassment.
      </>
    ),
    flipP3: (p: P) => (
      <>
        The cost is that &ldquo;Canadian&rdquo; must itself be defined, and it is: by{' '}
        <strong style={{ color: 'var(--ink)' }}>four routes</strong>: affiliation, funder, venue, and subject,
        each recorded on every work. A frame that forgets how it found something cannot be audited either, so every
        row on this site carries its provenance.{' '}
        <Link href={`${p('/works')}?route=no_aff`} className="link">
          Browse the works no affiliation-only frame would ever have seen
        </Link>
        .
      </>
    ),
    whyTitle: 'Why the deliverable is a disagreement',
    whyP1: (
      <>
        Three frontier models screened the same 5,600 works against the same locked rubric. They did not agree. Of
        the works <em>any</em> model called metaresearch, only about a third were called metaresearch by all three,
        and nearly half rest on a single model&apos;s opinion.
      </>
    ),
    whyP2: (p: P) => (
      <>
        The tempting move is to average this away and publish a base rate. That would be false precision, and worse,
        it would be <em>hiding the only interesting thing the experiment found</em>. Two screeners can agree on a{' '}
        <em>rate</em> while finding almost entirely different <em>works</em>: at a ~1% base rate, the settled
        rejects buy 98% agreement for free. So the deliverable is not a number. It is the{' '}
        <Link href={p('/screen')} className="link">
          disagreement dossier
        </Link>
        : the works that mark the field&apos;s empirical boundary, and against which inclusion criteria actually
        have to be written.
      </>
    ),
    limitsTitle: 'What the data cannot say',
    limitsLead:
      'Three limits are measured rather than hedged, because a limit you have measured is a finding and a limit you have merely acknowledged is an excuse.',
    limitAbstract: 'The abstract gap is structural',
    limitRetraction: 'Retraction is not a boolean',
    limitAgreement: 'Swap the screener, move the answer',
    limitsAll: 'All 32 findings, rendered from the pipeline’s own output →',
    errorsTitle: 'The errors',
    errorsP1: (
      <>
        This project records its own mistakes.{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md">
          DEVIATIONS.md
        </a>{' '}
        lists them: deviations from the protocol, defects in the screening harness, an estimator that had to be cut
        rather than dressed up as a lower bound, a rescue path built around a source that turned out not to deposit
        the data at all. They were written down as they happened and before submission, not reconstructed
        afterwards.
      </>
    ),
    errorsP2: (
      <>
        This is not humility for its own sake. The whole argument of MétaCan is that a map which cannot report its
        own error is not a map you can trust. A project making that argument while quietly polishing its own record
        would refute itself in the act of publishing. So: the capture-recapture estimator implied Canada produces
        59% of the world&apos;s metaresearch, which is absurd, and it was{' '}
        <strong style={{ color: 'var(--ink)' }}>cut</strong>, not softened. The abstract cascade was built around
        Crossref as the discipline-agnostic rescue, and Crossref recovered 2 abstracts against PubMed&apos;s 180;
        so that rescue <strong style={{ color: 'var(--ink)' }}>does not exist</strong>, and the gap is structural.
        GPT-5.6 violated the locked output schema on 18 records during the first 1,000-work stage; the manifest
        validator caught it, and it is recorded rather than silently repaired.
      </>
    ),
    methodTitle: 'Method, in short',
    methodFrameK: 'Frame',
    methodFrame:
      'Every Canadian work in a pinned OpenAlex snapshot (all 482 partitions), each work exactly once, admitted by one or more of four routes: Canadian affiliation, Canadian funder, Canadian venue, or subject-about-Canada.',
    methodScreenK: 'Screen',
    methodScreen:
      '5,600 works drawn with known selection probabilities across seven exhaustive strata, with French oversampled, screened by Claude Opus 4.8, GPT-5.6 (high), and Grok 4.5 against one locked rubric on its full eight-field payload. Chunks were randomized and recorded in a manifest before any model ran; the harness, never the model, writes the label files.',
    methodWeightsK: 'Weights',
    methodWeights:
      'The sample is stratified, so every rate is design-weighted. A rate computed from the raw sample without the weight is wrong, and the weight ships with every screened record in the API.',
    methodAbstractsK: 'Abstracts',
    methodAbstracts: (
      <>
        Not stored. The inverted indexes are 8.6 GB of the frame&apos;s 9.3 GB of text and the host has 13 GB free,
        so the detail page fetches an abstract live from OpenAlex. Whether a work <em>has</em> one is stored,
        because that is itself a finding.
      </>
    ),
    methodRetractionK: 'Retraction',
    methodRetraction: (
      <>
        Joined to Retraction Watch by DOI, and kept in its own table with four states, because OpenAlex&apos;s{' '}
        <code className="font-mono text-xs">is_retracted</code> is a boolean over a state space that has at least
        four values.
      </>
    ),
    methodReproK: 'Reproducibility',
    methodRepro: (
      <>
        Every number on this site is produced by a script in the repository and read from{' '}
        <code className="font-mono text-xs">findings.json</code>. Nothing is typed by hand, so the site and the
        analysis cannot drift apart.
      </>
    ),
    sourcesTitle: 'Sources, license, contact',
    sourcesBody:
      'Data: OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT, data CC-BY-4.0. Built by Ahmad Sofi-Mahmudi for the Canadian Metaresearch Data Challenge (Canadian Reproducibility Network).',
    repoLink: 'The repository',
    apiLink: 'the public API',
    // The design's about-page chrome.
    intro1: (n: string) =>
      `MétaCan is a provenance-tracked map of Canadian metaresearch: a frozen frame of ${n} works, Canadian by any of four checkable metadata routes, with machine screening evidence, a distilled classifier, and every disagreement on the record. It exists so a meta-researcher can define a cohort, count it exactly, export it, and cite it.`,
    intro2:
      'It is maintained by one person, works in English, and says so. The frame is bounded by the pinned OpenAlex snapshot and the recorded Canadian metadata routes; no sensitive identity is inferred, and derived labels implicating Indigenous-governed data are not released without appropriate governance.',
    role: 'Independent researcher',
    citeTitle: 'Cite this release',
    licence:
      'Code MIT · Data and documentation CC BY 4.0 · No OSF registration, Zenodo archive, DOI, or completed human validation is claimed at this stage.',
  },

  apiDocs: {
    aTitle: 'The same query, as an endpoint.',
    aBody:
      'Every screen consumes public endpoints. The page, the API and the export parse the same parameters with the same function, so no surface can answer a different question from another.',
    colMethod: 'Method',
    colEndpoint: 'Endpoint',
    colDesc: 'Description',
    overview: [
      { path: '/api/v1/cohort', d: 'Count and page through a cohort for any filter set' },
      { path: '/api/v1/works/{id}', d: 'One record: routes, labels, predictions, provenance' },
      { path: '/api/v1/facets/{facet}', d: 'Typeahead values for venue and topic' },
      { path: '/api/v1/permalink', d: 'Mint a citable /q/ permalink for a pinned query' },
      { path: '/api/v1/cohort/export', d: 'CSV or JSON export of the current cohort, capped' },
      { path: '/api/v1/recent', d: 'The rolling live layer, synced daily' },
      { path: '/api/v1/screened', d: 'The three-model screen with verdicts and design weights' },
      { path: '/api/v1/stats/…', d: 'Frame-wide aggregates: summary, years, routes, fields, labels' },
      { path: '/api/v1/findings', d: 'The findings file the pilot scripts write, verbatim' },
    ] as Array<{ path: string; d: string }>,
    sampleStatus: '200',
    title: 'The public API',
    lead: (p: P) => (
      <>
        Read-only, JSON, CORS-enabled, no key. Every endpoint is backed by the same functions the pages call.{' '}
        <code className="font-mono text-xs">searchWorks()</code> serves both{' '}
        <Link href={p('/works')} className="link">
          /works
        </Link>{' '}
        and <code className="font-mono text-xs">/api/v1/works</code>, so the API cannot answer a different question
        from the page above it.
      </>
    ),
    baseUrl: 'Base URL:',
    thParam: 'Parameter',
    thType: 'Type',
    thMeaning: 'Meaning',
    summaryDesc:
      "The frame in one object: total works, the no-affiliation and no-abstract counts, the four route marginals, and the screen's consensus histogram.",
    worksDesc: 'Browse and search the whole frame. Full-text over titles, every filter the browse page offers, paginated.',
    worksNote: (
      <>
        <strong>The count is capped at 10,000.</strong> Counting 4.3M rows exactly costs seconds and nobody reads
        the number, so <code className="font-mono text-xs">total_is_capped: true</code> means &ldquo;at least
        10,000&rdquo;, not &ldquo;exactly 10,000&rdquo;. Page through if you need more.
      </>
    ),
    worksParams: {
      q: 'Full-text search over titles (Postgres tsvector; terms are ANDed).',
      author:
        'Author-name search over the author layer (same websearch semantics as q). A name is a broad net: it can match many OpenAlex author identities; author_id is the precise form.',
      authorId: 'Exact OpenAlex author id (A...), the disambiguated identity. The citable author filter.',
      year: 'Inclusive publication-year bounds.',
      citedMin: 'Minimum citation count (cited_by >= N).',
      lang: 'Language code, e.g. en, fr.',
      type: 'Work type, e.g. article, preprint, dissertation.',
      field: "OpenAlex primary field, e.g. 'Medicine'.",
      route:
        'Route provenance: why the work is in the frame. no_aff returns the works with NO Canadian affiliation, which an affiliation-only frame never sees.',
      retracted: 'Only works OpenAlex flags as retracted.',
      noAbstract: 'Only works with no abstract. The screen finds half as much metaresearch here.',
      nIn: 'Screening consensus: how many of the three models called it metaresearch.',
      sort: 'Default: cited.',
      page: 'per_page max 100, default 25.',
    },
    worksExample: (base: string) =>
      `# The works an affiliation-only frame would never have seen,\n# most-cited first:\ncurl -sS "${base}/api/v1/works?route=no_aff&sort=cited&per_page=5" | jq '.results[] | {id, title, cited_by, routes}'\n\n# French-language works with no abstract, published since 2015:\ncurl -sS "${base}/api/v1/works?lang=fr&no_abstract=1&year_from=2015&per_page=5" | jq\n\n# Full-text search:\ncurl -sS "${base}/api/v1/works?q=reproducibility+crisis&per_page=3" | jq '.results[].title'`,
    workDesc:
      'One work with every frame field, route provenance, Retraction Watch state, direct model labels, and the full frame prediction with teacher scores and uncertainty fields.',
    workAbstractParam:
      'Fetch the abstract live from OpenAlex and de-invert it. Off by default: abstracts are not in this database, so asking for one costs an upstream round-trip.',
    workExample: (base: string) =>
      `# A work, with its provenance:\ncurl -sS ${base}/api/v1/works/W2342586781 | jq '{id, title, routes}'\n\n# With the abstract fetched live from OpenAlex:\ncurl -sS "${base}/api/v1/works/W2342586781?abstract=1" | jq '.abstract'`,
    screenedDesc:
      "The 5,600 screened works with all three models' tiers, genres, confidences and reasons, plus the design weight.",
    screenedNote: (
      <>
        <strong>The sample is stratified.</strong> Every record carries a{' '}
        <code className="font-mono text-xs">weight</code> (inverse selection probability). Any rate you compute from
        these rows without applying the weight is wrong.
      </>
    ),
    screenedParams: {
      contestedOnly:
        'THE DISAGREEMENT DOSSIER: every work any model called metaresearch. This subset, not the base rate, is the project’s deliverable.',
      nIn: 'Exact consensus count.',
      stratum: 'e.g. aff_core, about_only, french, venue_new, fund_new.',
      page: 'per_page max 100.',
    },
    screenedExample: (base: string) =>
      `# The disagreement dossier: the works that mark the field's boundary.\ncurl -sS "${base}/api/v1/screened?contested_only=1" | jq '.meta.summary'\n\n# The works only ONE model called metaresearch:\ncurl -sS "${base}/api/v1/screened?n_in=1" \\\n  | jq '.results[] | {title, opus: .opus.tier, gpt: .gpt.tier, grok: .grok.tier}'`,
    byRouteDesc: 'The four routes: marginals, and the exact route combinations.',
    byRouteNote: (
      <>
        The routes <strong>overlap</strong>; a work can be admitted by several. Therefore,{' '}
        <code className="font-mono text-xs">marginals</code> sums to more than the frame.{' '}
        <code className="font-mono text-xs">combinations</code> counts each work once and sums to the total.
      </>
    ),
    byYearDesc: 'Works per year, with the no-affiliation and no-abstract counts alongside, because both gaps move over time.',
    byFieldDesc:
      'The field breakdown, plus languages, the abstract gap by type, top venues, top funders, and the four-state retraction record. This is everything the analytics page draws in one call.',
    findingsDesc:
      'All 32 findings, served verbatim from the file the pilot scripts write. Every pilot number quoted on this site comes from here.',
    predictionsDesc:
      'The full frame prediction summary and the model evaluation report, served directly from the generated pilot artifacts. They include source and model hashes, model version, category counts, policies, cross-validation results, and limitations. Every score measures fidelity to machine teachers, not human accuracy, and every prediction is machine predicted and unvalidated.',
    cohortDesc: (p: P) => (
      <>
        The cohort builder&apos;s own query. Same parser, same function as{' '}
        <Link href={p('/')} className="link">
          the front page
        </Link>
        , so the API cannot answer a different question from the page above it. Takes every /api/v1/works
        parameter, plus the facets below.
      </>
    ),
    cohortNote: (
      <>
        <strong>The count is exact, and the label coverage travels with it.</strong>{' '}
        <code className="font-mono text-xs">meta.total</code> is the real N (a cohort is cited by its N), and{' '}
        <code className="font-mono text-xs">meta.direct_labels_cover</code> reports direct label coverage, while{' '}
        <code className="font-mono text-xs">meta.predictions_cover</code> reports prediction coverage. An empty{' '}
        <code className="font-mono text-xs">labels</code> array means <em>unlabeled</em>, never &ldquo;not in the
        category&rdquo;.
      </>
    ),
    cohortParams: {
      topic: "Exact OpenAlex primary topic. Values come from the typeahead: /api/v1/facets/topic?q=…",
      venue: 'Exact venue string. Values come from /api/v1/facets/venue?q=…',
      routesTri:
        'Tri-state route facets: 1 requires the route, 0 excludes it, absent means any. They compose (route_fund=1&route_aff=0 is the funder-only stratum), which the single `route` parameter cannot express.',
      retracted: '1 = retracted only; 0 = exclude retracted; absent = any.',
      abstract: 'has = only works with an abstract; none = only works without.',
      category:
        'Category facet. Its evidence source is selected by label_source. Direct labels and predictions are both unvalidated.',
      design:
        'Study design facet. Its evidence source is selected by label_source. No study design is MEDLINE validated yet.',
      labelSource:
        'direct uses sparse direct model outputs. predicted uses full frame teacher distillation outputs. Neither is human validated.',
      predictionMode:
        'candidate uses the union of the thresholded Codex and Gemma heads. consensus uses their intersection.',
      agreement:
        'For direct labels only. any means one model suffices; all means every model that labeled the work agrees on the filtered value.',
      labeled: 'For direct labels only. 1 requires a direct label row; 0 requires no direct label row.',
    },
    cohortExample: (base: string) =>
      `# Directly labeled metaresearch works, with exact coverage:\ncurl -sS "${base}/api/v1/cohort?label_source=direct&category=metaresearch" \\\n  | jq '{total: .meta.total, direct: .meta.direct_labels_cover}'\n\n# Consensus frame predictions for metaresearch:\ncurl -sS "${base}/api/v1/cohort?label_source=predicted&prediction_mode=consensus&category=metaresearch" \\\n  | jq '{total: .meta.total, predicted: .meta.predictions_cover, first: .results[0].prediction}'`,
    exportDesc:
      'The whole cohort as a file, streamed from the database: every work column, direct labels, full prediction data, provisional legacy scores, and per-row status fields.',
    exportNote: (
      <>
        <strong>Capped at 100,000 rows.</strong> The truncation is never silent: it is declared in{' '}
        <code className="font-mono text-xs">meta.truncated</code> (JSON), in a trailing comment line (CSV), and in
        the <code className="font-mono text-xs">X-Export-Truncated</code> header. Past the cap, narrow the cohort or
        rebuild the frame from the repository.
      </>
    ),
    exportParams: {
      format: 'csv (default) or json. Everything else is the same filter vocabulary as /api/v1/cohort.',
    },
    exportExample: (base: string) =>
      `# A labeled cohort as CSV:\ncurl -sSL "${base}/api/v1/cohort/export?category=metaresearch&format=csv" -o cohort.csv\n\n# As JSON, metadata first:\ncurl -sS "${base}/api/v1/cohort/export?design=systematic_review&year_from=2020&format=json" | jq '.meta'`,
    permalinkDesc:
      'Mint the citable /q/<hash> permalink for a filter state. Idempotent: the hash is a function of the canonical filters, so the same cohort always gets the same URL, whoever asks and whenever.',
    permalinkExample: (base: string) =>
      `curl -sS -X POST "${base}/api/v1/permalink?label_source=predicted&prediction_mode=consensus&category=metaresearch" \\\n  | jq '{url, total, direct_labels_cover, predictions_cover}'`,
    labelsStatsDesc:
      'The label landscape: coverage, categories, study designs, years and languages over the machine-labeled subset. The same function the Landscape page renders, so the two cannot drift.',
    facetsDesc:
      'Search-as-you-type over the ~85,000 distinct venues and ~4,500 distinct topics, with frame-wide counts. Two characters minimum.',
    facetsExample: (base: string) =>
      `curl -sS "${base}/api/v1/facets/venue?q=canadian+journal" | jq '.results[:3]'\ncurl -sS "${base}/api/v1/facets/topic?q=peer+review" | jq '.results[:3]'`,
    facetAuthorDesc:
      'Search-as-you-type over researchers with a Canadian-affiliated authorship, ranked by Canadian output. Returns the disambiguated OpenAlex A-id next to each name; the id is what ?author_id= and the network endpoint consume. Two characters minimum.',
    networkDesc:
      'The Canada-only collaboration network. Without parameters: the overview graph of the strongest ties. With author_id: that researcher’s neighborhood. The meta block states the construction rules (nodes, edges, fractional weights, the density guard) on every response, because a graph whose rules are not in the response is not citable.',
    networkParams: {
      authorId: 'OpenAlex author id (A...). Omit for the overview graph.',
    },
    notesTitle: 'Notes',
    noteCors: (
      <>
        <strong>CORS</strong> is open (<code className="font-mono text-xs">*</code>). This is a public CC-BY
        research dataset; the point of publishing it is that you can query it from your own page without proxying.
      </>
    ),
    noteCache: (
      <>
        <strong>Caching.</strong> Responses carry <code className="font-mono text-xs">s-maxage=3600</code>. The
        frame is a pinned snapshot: it does not change between deploys, so a stale aggregate is not a risk and
        re-scanning 4.3M rows per request would be.
      </>
    ),
    noteLimit: (
      <>
        <strong>No key, no rate limit.</strong> It is one small server. Be reasonable, and if you need the
        whole frame, take{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge">
          the repository
        </a>{' '}
        and rebuild it locally rather than paginating four million rows out of this box.
      </>
    ),
    noteLicense: (
      <>
        <strong>License.</strong> Data CC-BY-4.0, code MIT. Cite OpenAlex and Retraction Watch as the upstream
        sources.
      </>
    ),
  },
}

export type Dictionary = typeof en

const fr: Dictionary = {
  meta: {
    titleDefault: 'MétaCan : la base de sondage de la recherche canadienne',
    titleTemplate: '%s · MétaCan',
    description:
      "4 299 418 travaux canadiens tirés d'un instantané OpenAlex épinglé. Chaque notice indique pourquoi elle a été repérée et à quel titre elle est canadienne.",
    works: 'Travaux',
    workNotFound: 'Travail introuvable',
    screen: 'Le tri à trois modèles',
    analytics: 'Analytique',
    landscape: 'Panorama',
    findings: 'Constats',
    api: 'API',
    about: 'À propos',
    qTitle: (hash: string) => `Cohorte ${hash}`,
    qNotFound: 'Cohorte introuvable',
  },

  nav: {
    works: 'Travaux',
    screen: 'Sélection',
    analytics: 'Analytique',
    landscape: 'Panorama',
    findings: 'Constats',
    api: 'API',
    about: 'À propos',
    cohort: 'Cohorte',
    recent: 'Récents',
    network: 'Réseau',
    howBuilt: 'En coulisses',
  },

  network: {
    eyebrow: 'Collaboration',
    title: 'Le réseau de collaboration au Canada',
    sub: 'Les chercheurs et chercheuses ayant une signature affiliée au Canada sur un travail de la base, reliés seulement lorsque LES DEUX signatures d’un travail partagé étaient affiliées au Canada. La vue d’ensemble montre les liens les plus forts ; cherchez une personne pour voir son voisinage.',
    kpiAuthors: 'chercheurs et chercheuses avec une signature affiliée au Canada',
    kpiEdges: 'liens de collaboration intra-Canada',
    kpiRelease: (r: string) => `couche des auteurs : version OpenAlex ${r}`,
    notLoaded: 'La couche des auteurs n’est pas encore chargée. Le réseau apparaîtra ensuite.',
    searchLabel: 'Chercher une personne',
    searchPlaceholder: 'Chercher une personne par son nom',
    backOverview: 'Vue d’ensemble',
    overviewHint: 'Cliquez un nœud, ou cherchez une personne, pour voir son voisinage intra-Canada. La taille d’un nœud reflète la production affiliée au Canada ; l’épaisseur d’un lien, sa force.',
    egoTitle: 'Chercheur ou chercheuse',
    caWorksOf: (n: string) => `${n} travaux de la base avec affiliation canadienne`,
    viewCohort: 'Voir ses travaux dans le constructeur de cohorte',
    sharedN: (n: string) => `${n} partagés`,
    focusLabel: 'Centrer sur cette personne',
    loading: 'Chargement du voisinage…',
    empty: 'Rien à tracer.',
    honestyNodes: 'Les nœuds sont les personnes ayant au moins une signature affiliée au Canada sur un travail de la base ; l’affiliation canadienne est une propriété de la signature, pas de la personne.',
    honestyEdges: 'Un lien n’existe que lorsque LES DEUX signatures du travail partagé étaient affiliées au Canada.',
    honestyWeight: 'La force d’un lien suit le comptage fractionnaire : chaque travail partagé compte pour 1/(nombre d’auteurs moins 1), de sorte qu’une immense signature de consortium ne surpasse pas des années de travail en petite équipe.',
    honestyGuard: (max: string, excluded: string) => `Les travaux comptant plus de ${max} signatures affiliées au Canada sont exclus des liens (${excluded} travaux) ; ils restent dans la recherche, les signatures et tous les décomptes.`,
    honestyIntl: 'Les collaborations internationales sont invisibles ici PAR CONCEPTION : cette page cartographie le réseau intra-Canada, et le constructeur de cohorte demeure l’endroit où chaque travail, quels qu’en soient les auteurs, est compté.',
  },

  common: {
    previous: '← précédent',
    next: 'suivant →',
    pageOf: (page: string, pages: string) => `page ${page} sur ${pages}`,
    page: (page: string) => `page ${page}`,
    noTitle: '[sans titre]',
    citations: 'citations',
    yes: 'oui',
    no: 'non',
    none: 'non disponible',
    rangeSeparator: 'à',
    toggleTheme: 'Changer de thème',
    menu: 'Menu',
  },

  footer: {
    line1: (
      <>
        Chaque chiffre de ce site est produit par un script du{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge">
          dépôt
        </a>
        , et les erreurs sont consignées dans{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md">
          DEVIATIONS.md
        </a>
        , rédigé avant le dépôt de la proposition.
      </>
    ),
    line2:
      'Données : OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT · Données CC BY 4.0 · Ahmad Sofi-Mahmudi',
    data: 'Données CC BY 4.0',
    code: 'Code MIT',
    snapshot: (date: string) => `Instantané OpenAlex du ${date}`,
  },

  home: {
    heroEyebrow: 'Ouvert · Provenance tracée · Bilingue',
    heroTitle: 'Une carte de la métarecherche canadienne, à provenance tracée.',
    heroBody:
      'Définissez une cohorte de travaux canadiens, comptez-la exactement, exportez-la et citez-la. Chaque enregistrement indique pourquoi il a été retenu : quatre routes de métadonnées vérifiables sur une base OpenAlex gelée, pas une liste de mots-clés.',
    searchPh: 'Rechercher dans les titres : essayez « partage de données »…',
    searchBtn: 'Rechercher',
    fYear: 'Année de publication',
    fLang: 'Langue',
    fType: 'Type',
    fCat: 'Catégorie',
    sparse: '· clairsemé',
    anyLang: 'Toutes les langues',
    anyType: 'Tous les types',
    anyLabel: 'Toute étiquette',
    routesWord: 'Routes',
    routesTri: 'tri-état : indifférent / requis / exclu; les routes se composent',
    routesEg: 'p. ex. financé par le Canada, sans affiliation canadienne →',
    k1l: 'Travaux dans la base gelée',
    k1s: (date: string) => `482 partitions · instantané gelé le ${date}`,
    k2l: 'Invisibles à l’affiliation',
    k2s: (pct: string) => `${pct} sans aucune affiliation canadienne`,
    k3l: 'Travaux en français',
    k3s: 'croisement ISSN/DOI d’Érudit à venir',
    k4l: 'Dépistés pour l’entraînement',
    k4s: (version: string) => `classifieur ${version} ·`,
    k4warn: 'validation humaine à venir',
    routesTitle: 'Quatre routes vers la base',
    routesMeta: (n: string) => `${n} travaux · les routes se chevauchent`,
    calloutTail: (pct: string) =>
      `travaux (${pct}) sans aucune affiliation canadienne; une base fondée sur la seule affiliation ne les voit jamais.`,
    seeTitle: 'Ce que la base peut voir',
    seeMeta: 'couverture de la version gelée',
    sVenue: 'Métadonnées de revue présentes',
    sAbs: 'Possède un résumé',
    sFrench: 'En français',
    sNoFund: 'Sans métadonnées de bailleur',
    sNoAbs: 'Sans résumé',
    seeNote:
      'La couverture vaut à l’intérieur de la base. Un travail absent des sources couvertes, ou sans aucun signal canadien détectable, échappe à ce que ce dispositif peut estimer.',
    prevMeta: 'Aucun filtre · tri par citations',
    prevTitle: 'Aperçu de la cohorte',
    showingLine: (shown: string, total: string, labeled: string) =>
      `${shown} de ${total} travaux affichés · les étiquettes machine couvrent ${labeled}; un travail non étiqueté est inconnu, pas un négatif`,
    seeAll: 'Voir tous les travaux',
    ctaEyebrow: 'La frontière, mesurée',
    ctaTitle: 'La limite du champ n’est pas une ligne partagée par les modèles : c’est une région que chacun découpe autrement.',
    cta1s: 'travaux dépistés par trois modèles de pointe sous une même grille verrouillée',
    cta2s: (pct: string) => `travaux signalés jugés métarecherche par les trois : ${pct} d’accord d’ensemble`,
    cta3s: 'travaux signalés contestés : un ou deux modèles ont dit métarecherche, et le désaccord est livré comme donnée',
    routeAffName: 'affiliation canadienne',
    routeFundName: 'bailleur canadien',
    routeVenueName: 'revue canadienne',
    routeAboutName: 'à propos du Canada',
  },

  works: {
    title: 'Travaux',
    sub: "Tous les travaux de la base. Chaque rangée indique les voies par lesquelles le travail a été admis, car une base qui oublie comment elle a trouvé un travail ne peut pas être vérifiée.",
    countCapped: '10 000+',
    countWorks: (n: string) => `${n} travaux`,
    matching: (q: string) => ` correspondant à « ${q} »`,
    empty: 'Aucun travail ne correspond à ces filtres.',
  },

  cohort: {
    title: 'Bâtir une cohorte',
    sub: (n: string) =>
      `Interrogez les ${n} travaux canadiens de la base, obtenez le compte exact, exportez-le, citez-le. Chaque état des filtres est une URL; chaque URL est une requête reproductible.`,
    topic: 'Sujet',
    venue: 'Revue',
    typeaheadMin: 'saisissez au moins 2 caractères',
    typeaheadNone: 'aucun résultat',
    typeaheadClear: 'effacer',
    category: 'Catégorie',
    anyCategory: 'Toutes les catégories',
    design: "Devis d'étude",
    anyDesign: 'Tous les devis',
    agreement: 'Accord des étiquettes',
    agreementAny: 'un seul modèle suffit',
    agreementAll: 'tous les modèles doivent concorder',
    labelSource: 'Source des données probantes',
    directLabels: 'Étiquettes directes de modèles (clairsemées)',
    predictedLabels: 'Signaux de prédiction non validés sur toute la base',
    predictionMode: 'Règle de prédiction',
    predictionCandidate: 'Signal candidat : au moins une source (Gemma direct ou Codex distillé)',
    predictionConsensus: 'Signal consensuel : accord des deux sources',
    labeled: 'État des étiquettes',
    labeledAny: 'Tous',
    labeledOnly: 'Travaux étiquetés seulement',
    labeledNone: 'Travaux non étiquetés seulement',
    retraction: 'Rétractation',
    retractionAny: 'Tous',
    retractionOnly: 'Rétractés seulement',
    retractionExclude: 'Exclure les rétractés',
    abstract: 'Résumé',
    abstractAny: 'Tous',
    abstractHas: 'Avec résumé',
    abstractNone: 'Sans résumé',
    routes: 'Voies canadiennes',
    routeAny: 'toutes',
    routeRequire: 'exigée',
    routeExclude: 'exclue',
    routeAffLabel: 'Affiliation',
    routeFundLabel: 'Financement',
    routeVenueLabel: 'Voie de la revue',
    routeAboutLabel: 'Porte sur le Canada',
    routesHint:
      "Les quatre voies se composent : exigez la voie du financement et excluez l'affiliation pour obtenir la strate financée-seulement qu'aucune base fondée sur l'affiliation ne voit jamais.",
    labelFacetsTitle: 'Étiquettes machine',
    labelFacetsHint:
      "Les étiquettes directes de Codex et Gemma sont non validées et clairsemées. Les prédictions distillées couvrent la base complète et sont elles aussi non validées. Choisissez explicitement la source; l'absence d'une étiquette directe n'est jamais une étiquette négative.",
    coverage: (labeled: string, total: string) =>
      `Les étiquettes couvrent ${labeled} des ${total} travaux de cette cohorte.`,
    coverageNote:
      "Les autres sont non étiquetés, ce qui n'est pas une étiquette négative : la table des étiquettes est clairsemée aujourd'hui et s'enrichit au fil des rondes d'étiquetage.",
    predictionCoverage: (predicted: string, total: string) =>
      `Les prédictions distillées couvrent ${predicted} des ${total} travaux de cette cohorte.`,
    predictionCoverageNote:
      "Ces prédictions portent le statut machine_predicted_unvalidated. Le volet Gemma est une étiquette directe du modèle pour chaque travail (titre seulement); le volet Codex est un classifieur distillé et calibré. Le mode candidate est l'union; le consensus est l'intersection.",
    categoryNames: {
      metaresearch: 'Métarecherche',
      metaepi_narrow: 'Méta-épidémiologie (sens strict)',
      metaepi_broad: 'Méta-épidémiologie (sens large)',
      bibliometrics: 'Bibliométrie',
      sts: 'Études des sciences et des technologies',
      scholarly_communication: 'Communication savante',
      open_science: 'Science ouverte',
      research_integrity: 'Intégrité de la recherche',
      insufficient_payload: 'Charge utile insuffisante (le modèle a refusé de juger)',
    } as Record<string, string>,
    designNames: {
      randomized_trial: 'Essai randomisé',
      nonrandomized_trial: 'Essai non randomisé',
      observational: 'Observationnel',
      systematic_review: 'Revue systématique',
      meta_analysis: 'Méta-analyse',
      case_report: 'Étude de cas',
      qualitative: 'Qualitatif',
      simulation_or_modeling: 'Simulation ou modélisation',
      bench_or_experimental: 'Expérimental (laboratoire)',
      theoretical_or_conceptual: 'Théorique ou conceptuel',
      not_applicable: 'Sans objet',
      design_other: 'Autre devis',
    } as Record<string, string>,
    domainNames: {
      methods: 'Méthodes',
      reporting: 'Présentation des résultats',
      reproducibility: 'Reproductibilité',
      evaluation: 'Évaluation',
      incentives: 'Incitatifs',
    } as Record<string, string>,
    genreNames: {
      empirical: 'Empirique',
      review: 'Synthèse',
      methods: 'Méthodes',
      commentary: 'Commentaire',
      editorial: 'Éditorial',
      protocol: 'Protocole',
      dataset: 'Jeu de données',
      software: 'Logiciel',
      other: 'Autre',
    } as Record<string, string>,
    exportTitle: 'Exporter',
    exportCsv: 'CSV',
    exportJson: 'JSON',
    exportNote: (cap: string) =>
      `La cohorte courante, diffusée en continu depuis la base de données : toutes les colonnes des travaux, les étiquettes machine, les scores provisoires et l'état de validation de chaque rangée. Les exportations sont plafonnées à ${cap} rangées.`,
    exportTruncated: (total: string, cap: string) =>
      `Cette cohorte compte ${total} travaux, plus que le plafond d'exportation de ${cap} rangées : le fichier contiendra les ${cap} premières, ordonnées par identifiant OpenAlex, et le déclare à sa dernière ligne. Resserrez la cohorte, paginez l'API, ou reconstruisez la base depuis le dépôt pour le reste.`,
    citeButton: 'Citer cette cohorte',
    citeWorking: 'création…',
    citeCopy: 'copier',
    citeCopied: 'copié',
    citeNote:
      'Crée un lien /q/ permanent pour cette requête exacte. Les mêmes filtres produisent toujours le même lien, qui que soit le demandeur.',
    apiLine: "Cette cohorte par l'API :",
    eyebrow: 'Constructeur de cohorte',
    titleTail: 'travaux, canadiens par l’une de quatre routes.',
    subA: 'Chaque état de filtre est une URL; l’URL est la requête; la requête est citable via',
    subB: '. La page, l’API et l’export analysent les mêmes paramètres.',
    exportCsvBtn: 'Exporter en CSV',
    exportJsonBtn: 'Exporter en JSON',
    copyPermalinkBtn: 'Copier le permalien /q/',
    apiQueryBtn: 'Requête API',
    searchTerm: 'Terme de recherche',
    authorTerm: 'Auteur ou autrice',
    authorPlaceholder: 'Nom de l’auteur',
    resultsWord: 'résultats',
    resultsByYear: 'Résultats par année',
    pubDate: 'Date de publication',
    dateLast5: '5 dernières années',
    dateLast10: '10 dernières années',
    dateSince2000: 'Depuis 2000',
    langEn: 'Anglais',
    langFr: 'Français',
    citations: 'Citations',
    cited10: '10 citations ou plus',
    cited100: '100 citations ou plus',
    categories: 'Catégories',
    sparseCov: 'Étiquettes machine · couverture clairsemée',
    evidence: 'Preuves',
    evAbs: 'Avec résumé',
    evUnanimous: 'Unanimes (inclus, 3/3)',
    evRetracted: 'Rétractés',
    evLabeled: 'Avec étiquettes directes',
    unlabeledNote:
      'Un travail non étiqueté est inconnu, pas un négatif. La couverture est rapportée à chaque requête.',
    matchTailQ: (q: string) => `travaux correspondent à « ${q} »`,
    matchAll: 'travaux dans la cohorte',
    ofTotal: (n: string) => `sur ${n}`,
    triAny: 'tous',
    triReq: 'req',
    triExcl: 'excl',
    rsAff: 'affiliation',
    rsFund: 'bailleur',
    rsVenue: 'revue',
    rsAbout: 'sujet',
  },

  landscape: {
    title: 'Panorama',
    sub: "À quoi ressemble le sous-ensemble étiqueté par machine : catégories, devis d'étude, années, langues. En dessous, la base décrite par elle-même.",
    bannerTitle: 'Lisez la couverture avant les comptes',
    banner: (labeled: string, frame: string, pct: string) =>
      `Les étiquettes couvrent ${labeled} des ${frame} travaux de la base (${pct}). Chaque compte de cette section porte sur ce seul sous-ensemble étiqueté; il dit à quoi ressemblent les travaux étiquetés, jamais quelle part de la base appartient à une catégorie. Ce sont des étiquettes directes de modèles, non validées, et un travail non étiqueté n'est PAS un négatif.`,
    tileLabeled: 'Travaux étiquetés',
    tileLabeledNote: "travaux portant au moins une étiquette de modèle",
    tileRows: "Rangées d'étiquettes",
    tileRowsNote: 'une par paire (travail, modèle)',
    tileModels: 'Modèles',
    tileModelsNote: "chaque travail est étiqueté par jusqu'à trois modèles",
    byCategoryTitle: 'Travaux étiquetés par catégorie',
    byCategoryNote:
      "Un travail compte sous une catégorie si au moins un modèle la lui a attribuée; le chiffre plus foncé exige que tous les modèles qui ont étiqueté le travail concordent. L'écart entre les deux colonnes, c'est le désaccord des modèles, et cet écart est un constat, pas du bruit.",
    byDesignTitle: "Travaux étiquetés par devis d'étude",
    byDesignNote:
      "Les deux mêmes lectures : au moins un modèle, puis tous les modèles en accord. Aucun devis ici n'est encore validé contre MEDLINE; quand cette validation arrivera, elle sera marquée explicitement.",
    byYearTitle: 'Travaux étiquetés par année',
    byYearNote:
      "Là où les rondes d'étiquetage se sont rendues jusqu'ici. C'est la couverture de la table des étiquettes, pas une propriété du domaine.",
    byLangTitle: 'Travaux étiquetés par langue',
    byLangNote: "Encore la couverture : les rondes échantillonnent la base, et la base est à 6 % francophone.",
    thCategory: 'Catégorie',
    thDesign: "Devis d'étude",
    thYear: 'Année',
    thLang: 'Langue',
    thAny: 'Au moins un modèle',
    thAll: 'Tous les modèles concordent',
    thLabeled: 'Travaux étiquetés',
    frameTitle: 'La base elle-même',
    frameSub: (n: string) =>
      `Tout ce qui suit porte sur les ${n} travaux, étiquetés ou non. Chaque chiffre est une requête sur la base de données, calculée à la demande et mise en cache une heure; rien ici n'est un nombre saisi à la main.`,
    eyebrow: 'Panorama',
    designTitle: 'La forme de la base',
    designBody:
      "Comptes et tendances sur la version gelée. Les intervalles fondés sur le plan d'échantillonnage arriveront avec l'audit humain; rien sur cette page n'estime la prévalence du champ.",
    yearTitle: 'Travaux par année de publication',
    yearMeta: (min: string, max: string) => `${min} à ${max}`,
    baselineL: (y: string) => `Référence ${y}`,
    peakL: (y: string) => `Sommet ${y}`,
    growthL: (y: string) => `Croissance depuis ${y}`,
    latestL: (y: string) => `Travaux en ${y}`,
    catsTitle: "Comptes d'étiquettes machine",
    catsMeta: (n: string) => `sur ${n} travaux étiquetés`,
    fieldsTitle: 'Principaux domaines',
    fieldsMeta: 'base entière · domaine primaire OpenAlex',
    langTitle: 'Répartition linguistique',
    langMeta: 'base entière',
    langEn: 'Anglais',
    langFr: 'Français',
    langOther: 'Autres langues',
  },

  recent: {
    eyebrow: 'Couche en direct',
    title: 'Publications récentes',
    body: (n: string) =>
      `Une couche mobile, visiblement séparée, des nouveaux travaux canadiens, mise à jour chaque jour depuis l'API OpenAlex. Ces enregistrements ne font pas partie de la version gelée de ${n} travaux et ne portent aucune catégorie de classifieur tant qu'un classifieur n'a pas passé la validation humaine.`,
    liveChip: 'couche en direct',
    statusA: 'Mise à jour quotidienne ·',
    statusB: (date: string) => `travaux ajoutés depuis le gel du ${date}`,
    lastSync: (ts: string) => `dernière synchro ${ts}`,
    lastSyncFailed: (ts: string) => `dernière tentative de synchronisation échouée (${ts})`,
    lastSyncNone: 'aucune synchronisation réussie pour l’instant',
    lexicon: (v: string) => `lexique ${v}`,
    empty:
      "La couche en direct ne contient aucun travail synchronisé pour l'instant. La synchronisation s'exécute chaque jour contre l'API OpenAlex; son dernier état est rapporté ci-dessus, et une couche vide est rapportée comme vide plutôt que comblée.",
  },

  qpage: {
    eyebrow: 'Une requête de cohorte citable',
    title: (hash: string) => `Cohorte q/${hash}`,
    sub: "Ce lien nomme une requête, pas une liste de résultats. Les filtres ci-dessous sont conservés; les comptes sont recalculés en direct contre l'instantané épinglé à chaque chargement, car réexécuter la requête est la façon honnête de reproduire un nombre.",
    filtersTitle: 'La requête',
    noFilters: 'Aucun filtre : cette cohorte est la base entière.',
    countsTitle: "Comptes, recalculés à l'instant",
    totalLabel: 'Travaux dans la cohorte',
    labeledLabel: 'Portent des étiquettes machine',
    labeledNote: 'étiquettes de modèles de pointe, non validées; les autres sont non étiquetés, non négatifs',
    snapshotTitle: 'Instantané',
    snapshotLine: (release: string, built: string) =>
      `Version épinglée d'OpenAlex du ${release} (les 482 partitions, années de publication 2000 à 2025); base construite le ${built}. L'instantané est identique à l'octet près pour toujours : cette requête renverra les mêmes travaux quel que soit le jour.`,
    authorLayerLine: (release: string) =>
      `Cette cohorte filtre sur les auteurs; elle lit donc aussi la couche des auteurs, moissonnée depuis la version OpenAlex du ${release}.`,
    authorLayerDrift: (current: string) =>
      `La couche des auteurs du site a depuis été rafraîchie (version ${current}); les décomptes actuels peuvent différer de ceux du moment où ce permalien a été créé.`,
    citeTitle: 'Citation suggérée',
    citation: (n: string, hash: string, date: string, release: string) =>
      `Sofi-Mahmudi A. MetaCan : la base de sondage de la recherche canadienne. Cohorte q/${hash} (${n} travaux; consultée le ${date}). https://metacan.xera.ac/q/${hash}. Données : instantané OpenAlex épinglé du ${release}.`,
    openBuilder: 'Ouvrir cette cohorte dans le constructeur →',
    apiLabel: "La même cohorte par l'API",
    exportLabel: 'Exporter',
  },

  filters: {
    searchPlaceholder: 'Rechercher dans les titres : plein texte sur 4 299 418 travaux',
    searchAria: 'Rechercher dans les titres',
    searchButton: 'Rechercher',
    route: 'Voie',
    field: 'Domaine',
    type: 'Type',
    language: 'Langue',
    yearRange: 'Période',
    from: 'de',
    to: 'à',
    yearFrom: 'Année de début',
    yearTo: 'Année de fin',
    consensus: 'Consensus du tri',
    sort: 'Ordre',
    flags: 'Indicateurs',
    retracted: 'Rétractés',
    noAbstract: 'Sans résumé',
    anyRoute: 'Toutes les voies',
    routeAff: 'Affiliation canadienne',
    routeFund: 'Organisme subventionnaire canadien',
    routeVenue: 'Revue canadienne',
    routeAbout: 'Porte sur le Canada',
    routeNoAff: 'SANS affiliation (invisible à la base habituelle)',
    anyField: 'Tous les domaines',
    anyType: 'Tous les types',
    anyLanguage: 'Toutes les langues',
    sortCited: 'Les plus cités',
    sortNewest: 'Les plus récents',
    sortOldest: 'Les plus anciens',
    consensusAny: 'Tous',
    consensus3: '3/3 : les trois modèles',
    consensus2: '2/3 : contesté',
    consensus1: '1/3 : un seul modèle',
    consensus0: '0/3 : les trois ont dit hors champ',
    active: (n: number) => `${n} filtre${n === 1 ? ' actif' : 's actifs'}`,
    clearAll: 'tout effacer',
  },

  workRow: {
    routeAffTitle: 'Admis par une affiliation canadienne',
    routeFundTitle: 'Admis par un organisme subventionnaire canadien',
    routeVenueTitle: 'Admis par une revue canadienne',
    routeAboutTitle: "Admis parce qu'il porte sur le Canada",
    noAffTitle:
      "Aucune affiliation canadienne. Une base fondée sur la seule affiliation n'aurait jamais vu ce travail.",
    caAuthorTitle: 'Affiliation institutionnelle canadienne sur ce travail.',
    moreAuthors: (n: number) => `+${n} autres`,
    noAbstractChip: 'sans résumé',
    noAbstractTitle:
      'Aucun résumé dans OpenAlex. Le tri repère moitié moins de métarecherche dans cette strate : un biais mesuré, et non un simple champ manquant.',
    consensusAll: '3/3 métarecherche',
    consensusN: (n: number) => `${n}/3 métarecherche`,
    consensusAllTitle: 'Les trois modèles ont qualifié ce travail de métarecherche.',
    consensusNTitle: (n: number) =>
      `Seulement ${n} modèle${n === 1 ? '' : 's'} sur 3 ${n === 1 ? 'a' : 'ont'} qualifié ce travail de métarecherche : un travail contesté, à la frontière empirique du domaine.`,
    retractionMissedTitle: (nature: string) =>
      `${nature} : consigné par Retraction Watch, NON signalé par OpenAlex.`,
    retractionMissedSuffix: ' · manqué par OpenAlex',
    labelsPrefix: 'étiquettes',
    labelChipTitle: (model: string, cats: string, design: string, conf: string) =>
      `Étiquette directe de modèle, non validée. ${model} a répondu : catégories [${cats || 'aucune'}], devis d'étude ${design || 'aucun'}, confiance ${conf || 'non précisée'}.`,
    labelNoCats: 'aucune catégorie',
    agreementAgree: 'modèles en accord',
    agreementAgreeTitle:
      "Tous les modèles qui ont étiqueté ce travail ont donné les mêmes catégories et le même devis d'étude.",
    agreementSplit: 'modèles en désaccord',
    agreementSplitTitle:
      "Les modèles qui ont étiqueté ce travail divergent sur ses catégories ou son devis d'étude. Le désaccord est livré comme donnée; il n'est pas moyenné.",
    agreementSingle: 'un seul modèle',
    agreementSingleTitle:
      "Un seul modèle a étiqueté ce travail jusqu'ici : personne avec qui concorder ou diverger.",
    unlabeled: 'non étiqueté',
    unlabelledTitle:
      "Aucun modèle n'a encore étiqueté ce travail. La table des étiquettes est clairsemée et s'enrichit au fil des rondes; l'absence d'étiquette n'est PAS une étiquette négative.",
    predictionPrefix: 'prédiction machine',
    predictionCandidate: 'candidate',
    predictionConsensus: 'consensus',
    predictionNone: 'aucune',
    predictionTitle: (
      version: string,
      disagreement: string,
      uncertainty: string,
      status: string,
    ) =>
      `Codex distillé et Gemma direct (titre seulement). Version ${version}. Score de désaccord ${disagreement}. Score d'incertitude au seuil ${uncertainty}. Statut ${status}. Il ne s'agit pas d'une étiquette validée par une personne.`,
  },

  scoreBanner: {
    text: "Scores de référence d'un modèle non mature (critères de maturité non atteints, 7 itérations). Un score ordonne; il n'affirme jamais une catégorie.",
  },

  workDetail: {
    back: '← tous les travaux',
    onOpenAlex: (id: string) => `${id} sur OpenAlex`,
    citations: (n: string) => `${n} citations`,
    routeAffName: 'Affiliation canadienne',
    routeAffWhy:
      "Une personne signataire a déclaré un établissement canadien. C'est la seule voie dont dispose la base habituelle.",
    routeFundName: 'Organisme subventionnaire canadien',
    routeFundWhy: "Un organisme canadien l'a financé. Le travail peut ne porter aucune affiliation canadienne.",
    routeVenueName: 'Revue canadienne',
    routeVenueWhy: 'Il a paru dans une revue canadienne.',
    routeAboutName: 'Porte sur le Canada',
    routeAboutWhy: 'Son objet est le Canada, où que soient ses auteurs.',
    clsTitle: 'Classification',
    clsBadge: 'machine, non validée',
    clsSubDirect: (n: number) =>
      n === 1
        ? 'Étiqueté directement par un modèle lisant le dossier complet.'
        : `Étiqueté directement par ${n} modèles lisant le dossier complet.`,
    clsSubConsensus: 'Prédiction automatique; l’étiquette directe de Gemma et le classifieur distillé Codex s’accordent sur ce qui est montré ici.',
    clsSubCandidate: 'Prédiction automatique; un appel candidat d’une seule source (Gemma direct ou Codex distillé), pas un consensus.',
    clsNoCats: 'Les modèles n’ont appliqué aucune catégorie : rien dans la taxonomie ne correspondait à ce travail.',
    clsSplitNote: 'Les modèles divergent sur des parties de cette classification; chaque voix est préservée dans la section en fin de page.',
    clsMethodsHint: 'Le détail, modèle par modèle et score par score, se trouve en fin de page sous « Comment cette classification a été obtenue ».',
    clsNone: 'Pas encore classifié. Aucun modèle n’a étiqueté ce travail et aucune prédiction ne le couvre; l’absence d’étiquette n’est pas une étiquette négative.',
    methodsTitle: 'Comment cette classification a été obtenue',
    methodsToggle: 'déplier',
    whyTitle: 'Pourquoi ce travail est dans la base',
    whySub:
      "Une base qui oublie comment elle a trouvé un travail ne peut pas être vérifiée. Voici les voies qui ont admis celui-ci.",
    noAffCallout: (
      <>
        <strong style={{ color: 'var(--mc-accent)' }}>Aucune affiliation canadienne.</strong> Une base fondée sur la
        seule affiliation (le devis habituel) n&apos;aurait jamais vu ce travail. C&apos;est l&apos;un des travaux
        qui justifient l&apos;inversion de la base.
      </>
    ),
    postPubTitle: 'Dossier post-publication',
    nature: 'Nature',
    reason: 'Motif',
    date: 'Date',
    flagged: 'Signalé par OpenAlex ?',
    flaggedYes: 'Oui',
    flaggedNo: 'Non : Retraction Watch le consigne, et OpenAlex ne le signale pas.',
    rwSource: (
      <>
        Source : Retraction Watch, jointe par DOI. OpenAlex consigne la rétractation dans{' '}
        <code className="font-mono text-xs">is_retracted</code>, un booléen sur un espace d&apos;états à au moins
        quatre valeurs ; il ne peut donc exprimer ni une expression de préoccupation, ni une correction, ni un
        rétablissement, et les rapporte comme <code className="font-mono text-xs">false</code>, ce qui se lit comme
        « rien à signaler ».
      </>
    ),
    openalexOnly:
      "OpenAlex signale ce travail comme rétracté, mais aucune notice correspondante de Retraction Watch ne figure dans cette base.",
    screenTitle: 'Le tri à trois modèles',
    screenAll: 'les 5 600 travaux triés →',
    consensus3: (
      <>
        <strong style={{ color: 'var(--in-scope)' }}>Les trois modèles</strong> ont qualifié ce travail de
        métarecherche. Il appartient au noyau consensuel du domaine.
      </>
    ),
    consensus0: (
      <>
        <strong style={{ color: 'var(--out)' }}>Les trois modèles</strong> l&apos;ont jugé hors champ.
      </>
    ),
    consensusN: (n: number) => (
      <>
        <strong style={{ color: 'var(--contested)' }}>
          {n} modèle{n === 1 ? '' : 's'} sur 3 {n === 1 ? 'a' : 'ont'} qualifié ce travail de métarecherche.
        </strong>{' '}
        Ce travail est <em>contesté</em> : il se situe à la frontière empirique du domaine, et son statut dépend du
        modèle interrogé. C&apos;est l&apos;un des 51 travaux du dossier des désaccords.
      </>
    ),
    stratumLine: (stratum: string, weight: string) =>
      `strate : ${stratum} · poids de sondage : ${weight} (l'échantillon est stratifié ; tout taux calculé sans le poids est faux)`,
    genre: (g: string) => `genre : ${g}`,
    aboutCanada: 'porte sur le Canada',
    confidence: 'confiance',
    tierAdjacent: 'T3 · adjacent, hors champ',
    labelsTitle: 'Étiquettes directes de modèles (non validées)',
    labelsSub:
      "Étiquettes de catégorie et de devis d'étude par modèle, issues des rondes d'étiquetage. C'est une sortie machine, non validée, et le désaccord entre modèles est livré comme donnée. Aucun devis ici n'est encore validé contre MEDLINE.",
    labelCategories: 'Catégories',
    labelDesign: "Devis d'étude",
    labelDomain: 'Domaine',
    labelGenre: 'Genre',
    labelAboutSystem: 'Porte sur le système de recherche canadien',
    labelAboutTopic: 'Porte sur un sujet canadien',
    predictionTitle: 'Prédiction machine sur la base complète',
    predictionSub:
      "Le volet Gemma est une étiquette directe du modèle pour chaque travail de la base, lue sur la notice réduite au titre. Le volet Codex est un classifieur appris des 10 348 étiquettes directes de Codex et calibré sur les taux pondérés de l'échantillon; les champs sans appui suffisant ne portent aucun appel Codex. Le mode candidate est l'union des deux volets; le consensus est leur intersection. Ces sorties portent le statut machine_predicted_unvalidated et ne sont pas des étiquettes humaines.",
    predictionCandidate: 'Catégories candidates',
    predictionConsensus: 'Catégories consensuelles',
    predictionCandidateValue: 'Signal candidat',
    predictionConsensusValue: 'Signal consensuel',
    predictionTeacherScores: 'Scores du classifieur distillé par catégorie (deux têtes)',
    predictionDisagreement: 'Score de désaccord entre enseignants',
    predictionUncertainty: "Score d'incertitude au seuil",
    scoresTitle: 'Scores machine (provisoires)',
    scoresSub:
      "Les deux têtes enseignantes du modèle étudiant, lues sur ce travail. Un score ordonne la base pour la relecture; il n'affirme jamais une catégorie, et le statut de validation accompagne chaque rangée tel quel.",
    scoreOpus: 'Tête enseignante Opus',
    scoreGpt: 'Tête enseignante GPT',
    scoreSpread: 'Écart entre enseignants',
    scoreSpreadNote: "la distance entre les deux têtes enseignantes sur ce seul travail",
    validationStatus: 'Statut de validation',
    validationStatusNote:
      "tel quel depuis la passe de notation : score_only signifie que le nombre peut ordonner les travaux, et qu'aucune étiquette de catégorie n'en découle",
    abstractTitle: 'Résumé',
    abstractStored: 'Conservé avec la notice de tri, où il sert de preuve aux étiquettes ci-dessus.',
    abstractFetched:
      "Récupéré en direct depuis OpenAlex et désinversé. Les résumés ne sont pas conservés dans cette base de données : les index inversés représentent 8,6 Go des 9,3 Go de texte de la base, et le serveur dispose de 13 Go libres.",
    abstractUnavailable:
      "OpenAlex consigne un résumé pour ce travail, mais il n'a pas pu être récupéré à l'instant.",
    abstractNone:
      "Aucun résumé. Ce n'est pas une lacune de cette base de données : OpenAlex n'en a pas non plus. 23,3 % de la base est dans cet état, et le tri y repère MOITIÉ moins de métarecherche ; l'absence est donc un biais mesuré, et non un champ manquant.",
    recordTitle: 'La notice',
    venue: 'Revue',
    topic: 'Thématique',
    field: 'Domaine',
    institutions: 'Établissements canadiens',
    funders: 'Organismes subventionnaires',
    keywords: 'Mots-clés',
    hasAbstract: 'Résumé présent dans OpenAlex',
    api: 'API',
    backCohort: 'Retour à la cohorte',
    record: 'Enregistrement',
    metaTitle: 'Notice bibliographique',
    absSrc: "récupéré en direct d'OpenAlex",
    absNoneShort: 'Aucun résumé dans les sources couvertes. Son absence est consignée, pas traitée comme un négatif.',
    colModel: 'Bras',
    colCats: 'Catégories',
    colDesign: "Devis d'étude",
    colConf: 'Confiance',
    agreeNote: "L'accord compare des ensembles de catégories et des devis identiques entre les bras.",
    predBadge: 'Imitation des enseignants',
    predNote: 'Ni prévalence calibrée, ni vérité terrain. Validation humaine à venir.',
    predScore: (model: string) => `score de la tête « metaresearch » (${model})`,
    predVersion: 'Version',
    quickStats: 'En bref',
    qsCites: 'Citations',
    qsYear: 'Publié',
    qsRoutes: "Routes d'admission",
    qsAbstract: 'Résumé présent',
    actJson: 'Télécharger la notice (JSON)',
    actPerma: 'Copier le permalien',
    actPermaCopied: 'Copié',
    actReport: 'Signaler un problème avec cette notice',
    explore: 'Explorer davantage',
    exVenueL: 'Même revue',
    exTopicL: 'Même sujet',
    exCatL: 'Catégorie',
    exFrL: 'Travaux en français',
    expAff: "Au moins un auteur déclare une institution canadienne dans l'instantané OpenAlex épinglé.",
    expFund: 'Un bailleur canadien est enregistré sur le travail.',
    expVenue: "Publié dans une revue dont le pays d'attache est le Canada.",
    expAbout: 'Le titre ou le résumé porte un signal canadien du lexique géographique.',
    expNoAff: 'Aucune affiliation canadienne : ce travail est invisible pour une base fondée sur la seule affiliation.',
  },

  screen: {
    scEyebrow: 'Sélection',
    eyebrow: (n: string) => `${n} travaux · Opus 4.8 · GPT-5.6 (high) · Grok 4.5 · une seule grille verrouillée`,
    h1: "La frontière du domaine n'est pas une ligne. C'est une région.",
    p1: (v: { n: string; anyIn: number; n3: number; pct3: string; n1: number; pct1: string }) => (
      <>
        Trois modèles de pointe ont trié les mêmes {v.n} travaux, tirés de la vraie base avec des probabilités de
        sélection connues, selon la même grille verrouillée sur sa charge utile complète de huit champs. Parmi les{' '}
        <strong style={{ color: 'var(--ink)' }}>{v.anyIn}</strong> travaux qu&apos;au moins <em>un</em> modèle a
        qualifiés de métarecherche, seulement <strong style={{ color: 'var(--in-scope)' }}>{v.n3}</strong> ({v.pct3})
        l&apos;ont été par les trois, et <strong style={{ color: 'var(--contested)' }}>{v.n1}</strong> ({v.pct1})
        reposent sur l&apos;avis d&apos;un seul modèle.
      </>
    ),
    p2: (
      <>
        Deux trieurs peuvent s&apos;accorder sur un <em>taux</em> tout en repérant des <em>travaux</em> presque
        entièrement différents. À un taux de base d&apos;environ 1 %, les rejets évidents offrent 98 %
        d&apos;accord gratuitement ; c&apos;est pourquoi une statistique d&apos;accord calculée sur tout
        l&apos;échantillon ne dit rien de la frontière, et pourquoi le livrable est le tableau ci-dessous, et non un
        pourcentage.
      </>
    ),
    statAnyLabel: 'Au moins un modèle a dit métarecherche',
    statAnyNote: 'le dossier des désaccords : la frontière empirique du domaine',
    statAllLabel: 'Les trois d’accord',
    statAllNote: (pct: string) => `${pct} du dossier : le noyau consensuel`,
    statTwoLabel: 'Deux sur trois',
    statTwoNote: 'contesté',
    statOneLabel: 'Un seul modèle',
    statOneNote: (pct: string) => `${pct} du dossier repose sur l'avis d'un seul modèle`,
    modelsTitle: 'Les trois modèles ne sont pas interchangeables',
    modelsSub: (v: { n: string; anyIn: number }) => (
      <>
        Combien des {v.n} travaux chaque modèle a qualifiés de métarecherche (niveau T1 ou T2), sur des données
        identiques. T3 est <em>adjacent</em> et ne compte pas comme dans le champ ; c&apos;est pourquoi le compte
        d&apos;un modèle ne peut jamais dépasser les {v.anyIn} travaux du dossier.
      </>
    ),
    modelsSpread: (
      <>
        Changez le modèle que vous appelez « le trieur » et la taille du domaine bouge. Cet écart, et non
        l&apos;intervalle de confiance binomial sur les étiquettes d&apos;un seul modèle, est l&apos;incertitude
        honnête sur la taille de la métarecherche canadienne.
      </>
    ),
    dossierTitle: 'Le dossier des désaccords',
    dossierSub:
      "Les trois verdicts, confiances et motifs côte à côte. Ce sont les travaux sur lesquels les critères d'inclusion doivent être rédigés, parce que ce sont ceux sur lesquels des trieurs raisonnables, devant la même grille et les mêmes preuves, divergent.",
    tabDossier: 'Le dossier (au moins un modèle a dit oui)',
    tab3: '3/3 : noyau consensuel',
    tab2: '2/3 : contestés',
    tab1: '1/3 : un seul modèle',
    tab0: '0/3 : rejets évidents',
    tabAll: 'Tous les travaux triés',
    workCount: (total: string, one: boolean) => `${total} ${one ? 'travail' : 'travaux'}`,
    thWork: 'Travail',
    thStratum: 'Strate',
    emptyView: 'Aucun travail dans cette vue.',
    tierT1: 'T1 : métarecherche centrale (compte comme DANS le champ)',
    tierT2: 'T2 : métarecherche (compte comme DANS le champ)',
    tierT3: 'T3 : adjacent. NE compte PAS comme dans le champ.',
    tierOut: 'hors champ',
    foundTitle: 'Ce que le tri a réellement trouvé',
    computed: (date: string) => `Calculé le ${date}`,
    allFindings: 'les 32 constats',
    dossierJson: 'ce dossier en JSON',
  },

  analytics: {
    title: 'Analytique',
    sub: (n: string) =>
      `La base, décrite par elle-même. Chaque chiffre est une requête sur les ${n} travaux, calculée à la demande et mise en cache une heure ; rien ici n'est un nombre saisi à la main.`,
    tileWorks: 'Travaux dans la base',
    tileNoAff: 'Sans affiliation canadienne',
    tileNoAbs: 'Sans résumé',
    tileNotices: 'Avis de rétractation',
    ofFrame: (pct: string) => `${pct} de la base`,
    joinedFromRW: 'joints depuis Retraction Watch',
    byYearTitle: 'Travaux par année',
    byYearNote: (pct: string, n: string) =>
      `La base au fil du temps, avec en dessous les travaux SANS affiliation canadienne. L'écart entre les deux courbes est ce qu'une base fondée sur la seule affiliation perd en silence : ${pct} de la base, soit ${n} travaux.`,
    byRouteTitle: 'Travaux par voie',
    byRouteNote: (sum: string, over: string, total: string) =>
      `Pourquoi chaque travail est dans la base. Les quatre voies SE RECOUPENT (un travail peut être admis par plusieurs) : ces barres totalisent donc ${sum}, soit ${over} de plus que les ${total} travaux de la base. Ce recoupement fait l'objet du graphique suivant.`,
    overlapTitle: 'Le recoupement : combinaisons exactes de voies',
    overlapNote:
      "Chaque travail est compté une seule fois, sous l'ensemble exact des voies qui l'ont admis. Les barres sarcelle sont les travaux admis par une SEULE voie : retirez cette voie du devis et ces travaux disparaissent entièrement de la base.",
    byFieldTitle: 'Travaux par domaine',
    byFieldNote: "Le domaine principal d'OpenAlex, tel que consigné.",
    byLangTitle: 'Travaux par langue',
    byLangNote:
      "Le français est mis en évidence. Il représente 6 % de la base, il est volontairement suréchantillonné dans le tri, et c'est la langue que la cascade de résumés récupère le plus mal (15,4 % de récupération contre 38,8 % pour l'anglais).",
    gapTitle: "L'écart des résumés est structurel, pas du bruit",
    gapNote: (pct: string) =>
      `Part des travaux SANS résumé, par type, du pire au meilleur. ${pct} de la base n'a aucun résumé, et le tri y repère MOITIÉ moins de métarecherche. Si l'écart était aléatoire, un meilleur index le corrigerait. Il ne l'est pas : il se concentre dans des types qui ne portent jamais de résumé ; « ne trier que les travaux qui ont un résumé » est donc une sélection sur une covariable qui prédit le résultat.`,
    retractionTitle: 'Le dossier post-publication a quatre états, et OpenAlex a un booléen',
    retractionNote: (notices: string, missed: string) =>
      `${notices} travaux de la base portent un avis Retraction Watch. La barre pleine est ce qu'OpenAlex signale ; la barre hachurée est ce qu'il rapporte comme « false » : ${missed} travaux dont OpenAlex ne porte pas l'avis, ce qu'un lecteur comprend comme « rien à signaler ». Une expression de préoccupation n'est pas une rétractation, et is_retracted n'a aucun moyen de le dire.`,
    thState: 'État',
    thWorks: 'Travaux',
    thFlagged: 'OpenAlex le signale',
    thMissed: 'OpenAlex rapporte false',
    venuesTitle: 'Principales revues',
    venuesNote: 'Selon le nombre de travaux dans la base.',
    fundersTitle: 'Principaux organismes subventionnaires',
    fundersNote:
      "Extraits de la chaîne d'organismes séparée par des points-virgules. La voie du financement admet des travaux qui ne portent aucune affiliation canadienne.",
    scoresTitle: "L'écart entre enseignants sur toute la base (référence provisoire)",
    scoresNote: (n: string) =>
      `Chacun des ${n} travaux porte deux scores provisoires de têtes enseignantes, et l'écart mesure la distance entre les deux têtes sur un même travail. Ces chiffres proviennent de pilot/results/frame_scores.json, le fichier qu'écrit la passe de notation; rien ici n'est saisi à la main.`,
    tileScored: 'Travaux notés',
    tileScoredNote: 'chaque travail de la base, par le tandem de têtes enseignantes',
    tileMeanSpread: 'Écart moyen entre enseignants',
    tileMeanSpreadNote: 'le désaccord moyen entre les deux têtes',
    tileP99Spread: 'Écart entre enseignants, 99e centile',
    tileP99SpreadNote: '99 % des travaux se situent sous cet écart',
    tileSplit: 'Travaux où les enseignants divergeraient',
    tileSplitNote: 'écart supérieur à 0,5',
    apiNote: (p: P) => (
      <>
        Chaque série est offerte en JSON :{' '}
        <Link href={p('/api-docs')} className="link">
          voir l&apos;API
        </Link>
        .
      </>
    ),
  },

  charts: {
    allWorks: 'Tous les travaux',
    noCaAff: 'Sans affiliation canadienne',
    works: 'Travaux',
    noAbstract: 'Sans résumé',
    flagged: 'OpenAlex le signale',
    missed: 'OpenAlex rapporte FALSE',
    routeAff: 'Affiliation canadienne',
    routeFund: 'Financement canadien',
    routeVenue: 'Revue canadienne',
    routeAbout: 'Porte sur le Canada',
  },

  findings: {
    title: 'Constats',
    designTitle: 'Ce que le pilote a mesuré.',
    lead: (n: number) => (
      <>
        Les {n} constats, rendus directement depuis{' '}
        <code className="font-mono text-xs">pilot/results/findings.json</code>, le fichier qu&apos;écrivent les
        scripts du pilote. Aucun nombre de cette page n&apos;a été saisi par un humain : c&apos;est la seule façon
        de garantir que le site et l&apos;analyse ne peuvent pas diverger.
      </>
    ),
    apiLink: "le même fichier par l'API →",
    computed: (key: string, date: string) => `${key} · calculé le ${date}`,
    originalLabel: 'Énoncé original (findings.json) :',
    sourceField: 'Champ source',
    titles: {
      affiliation_gap: "L'écart d'affiliation",
      topics: 'La voie thématique',
      erudit: 'Érudit est invisible pour OpenAlex',
      language_gap: "L'écart linguistique",
      polysemy: 'La polysémie met le lexique en échec',
      capture_recapture_fails: 'La capture-recapture est ici sans valeur',
      canadian_linkage: 'Le lien canadien',
      openalex_is_metered: "OpenAlex est facturé à l'usage",
      base_rate: 'Le taux de base',
      agreement: 'Changez de trieur, la réponse bouge',
      base_rate_robustness: 'La robustesse du taux de base',
      topic_route_recall: 'Le rappel de la voie thématique',
      screening_cost: 'Ce que coûte le tri',
      audit_power: "La puissance d'un audit humain",
      label_limits: 'Ce que les étiquettes ne peuvent pas dire',
      agent_variance: 'La variance des agents',
      retraction_record: 'Un booléen sur un espace à quatre états',
      funder_route_recall: 'Le rappel de la voie du financement',
      abstract_cascade: "L'écart des résumés est structurel",
      preprint_coverage: 'La couverture des prépublications',
      trial_linkage: 'Le lien aux essais cliniques',
      three_model_screen: 'Le tri à trois modèles',
    } as Record<string, string>,
  },

  about: {
    title: 'À propos de MétaCan',
    lead: "MétaCan est une carte de la métarecherche canadienne qui peut être vérifiée. Cette phrase travaille plus qu'il n'y paraît : presque aucune carte de la recherche ne le peut, et la raison tient à la structure, non à la négligence.",
    flipTitle: "L'inversion de la base",
    flipP1: (
      <>
        La façon habituelle de cartographier un domaine consiste à repérer ce qui <em>ressemble</em> au domaine
        (une liste de mots-clés, un classificateur thématique, un ensemble de revues), puis à demander lesquels des
        résultats sont canadiens. La frontière du domaine devient ainsi une propriété de votre requête. Et cela a
        une propriété fatale pour quiconque veut vérifier votre travail :{' '}
        <strong style={{ color: 'var(--ink)' }}>
          on ne peut pas mesurer le rappel d&apos;un lexique sur les travaux que le lexique ne vous a jamais montrés
        </strong>
        . Les manques sont invisibles par construction ; la carte ne peut donc pas rapporter sa propre erreur, et
        elle ne peut donc pas être vérifiée.
      </>
    ),
    flipP2: (
      <>
        Ce projet inverse donc la base. Il part de{' '}
        <strong style={{ color: 'var(--ink)' }}>toute la recherche canadienne</strong>, un critère externe et
        vérifiable, énumérable depuis un instantané OpenAlex épinglé, et fait de l&apos;appartenance au domaine une{' '}
        <em>classification sur un univers connu</em> plutôt qu&apos;un <em>repérage dans la littérature</em>. Une
        fois l&apos;univers énumérable, le rappel devient mesurable, un échantillon a des probabilités de sélection
        connues, et un désaccord entre trieurs devient un constat plutôt qu&apos;un embarras.
      </>
    ),
    flipP3: (p: P) => (
      <>
        Le prix à payer est que « canadien » doit lui-même être défini, et il l&apos;est : par{' '}
        <strong style={{ color: 'var(--ink)' }}>quatre voies</strong> (affiliation, organisme subventionnaire,
        revue et sujet), chacune consignée sur chaque travail. Une base qui oublie comment elle a trouvé un travail
        ne peut pas non plus être vérifiée ; chaque rangée de ce site porte donc sa provenance.{' '}
        <Link href={`${p('/works')}?route=no_aff`} className="link">
          Parcourez les travaux qu&apos;aucune base fondée sur la seule affiliation n&apos;aurait jamais vus
        </Link>
        .
      </>
    ),
    whyTitle: 'Pourquoi le livrable est un désaccord',
    whyP1: (
      <>
        Trois modèles de pointe ont trié les mêmes 5 600 travaux selon la même grille verrouillée. Ils ne se sont
        pas accordés. Parmi les travaux qu&apos;au moins <em>un</em> modèle a qualifiés de métarecherche, environ
        le tiers seulement l&apos;a été par les trois, et près de la moitié repose sur l&apos;avis d&apos;un seul
        modèle.
      </>
    ),
    whyP2: (p: P) => (
      <>
        La tentation est de moyenner tout cela et de publier un taux de base. Ce serait de la fausse précision, et
        pire : ce serait <em>cacher la seule chose intéressante que l&apos;expérience a trouvée</em>. Deux trieurs
        peuvent s&apos;accorder sur un <em>taux</em> tout en repérant des <em>travaux</em> presque entièrement
        différents : à un taux de base d&apos;environ 1 %, les rejets évidents offrent 98 % d&apos;accord
        gratuitement. Le livrable n&apos;est donc pas un nombre. C&apos;est le{' '}
        <Link href={p('/screen')} className="link">
          dossier des désaccords
        </Link>{' '}
        : les travaux qui marquent la frontière empirique du domaine, et sur lesquels les critères d&apos;inclusion
        doivent réellement être rédigés.
      </>
    ),
    limitsTitle: 'Ce que les données ne peuvent pas dire',
    limitsLead:
      "Trois limites sont mesurées plutôt qu'atténuées, parce qu'une limite mesurée est un constat et qu'une limite simplement reconnue est une excuse.",
    limitAbstract: "L'écart des résumés est structurel",
    limitRetraction: "La rétractation n'est pas un booléen",
    limitAgreement: 'Changez de trieur, la réponse bouge',
    limitsAll: 'Les 32 constats, rendus depuis la sortie de la chaîne de traitement →',
    errorsTitle: 'Les erreurs',
    errorsP1: (
      <>
        Ce projet consigne ses propres erreurs.{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md">
          DEVIATIONS.md
        </a>{' '}
        les recense : des écarts au protocole, des défauts du dispositif de tri, un estimateur qu&apos;il a fallu
        supprimer plutôt que maquiller en borne inférieure, une voie de secours bâtie autour d&apos;une source qui,
        au bout du compte, ne dépose pas les données. Elles ont été consignées au moment où elles survenaient et
        avant le dépôt de la proposition, non reconstruites après coup.
      </>
    ),
    errorsP2: (
      <>
        Ce n&apos;est pas de l&apos;humilité pour elle-même. Tout l&apos;argument de MétaCan est qu&apos;une carte
        incapable de rapporter sa propre erreur n&apos;est pas une carte digne de confiance. Un projet qui
        soutiendrait cela tout en polissant discrètement son propre dossier se réfuterait en publiant. Donc :
        l&apos;estimateur de capture-recapture impliquait que le Canada produit 59 % de la métarecherche mondiale,
        ce qui est absurde, et il a été <strong style={{ color: 'var(--ink)' }}>supprimé</strong>, non adouci. La
        cascade de résumés avait été bâtie autour de Crossref comme voie de secours indépendante des disciplines, et
        Crossref a récupéré 2 résumés contre 180 pour PubMed : cette voie de secours{' '}
        <strong style={{ color: 'var(--ink)' }}>n&apos;existe pas</strong>, et l&apos;écart est structurel. GPT-5.6
        a enfreint le schéma de sortie verrouillé sur 18 notices pendant la première étape de 1 000 travaux ; le validateur de manifeste l&apos;a
        détecté, et l&apos;incident est consigné plutôt que réparé en silence.
      </>
    ),
    methodTitle: 'La méthode, en bref',
    methodFrameK: 'Base de sondage',
    methodFrame:
      "Chaque travail canadien d'un instantané OpenAlex épinglé (les 482 partitions), chacun compté exactement une fois, admis par une ou plusieurs des quatre voies : affiliation canadienne, organisme subventionnaire canadien, revue canadienne, ou sujet portant sur le Canada.",
    methodScreenK: 'Tri',
    methodScreen:
      "5 600 travaux tirés avec des probabilités de sélection connues dans sept strates exhaustives, avec le français suréchantillonné, puis triés par Claude Opus 4.8, GPT-5.6 (high) et Grok 4.5 selon une seule grille verrouillée sur sa charge utile complète de huit champs. Les lots ont été randomisés et consignés au manifeste avant l'exécution de tout modèle, et c'est le dispositif qui écrit les fichiers d'étiquettes, jamais le modèle.",
    methodWeightsK: 'Poids',
    methodWeights:
      "L'échantillon est stratifié : chaque taux est donc pondéré par le plan de sondage. Un taux calculé sur l'échantillon brut sans le poids est faux, et le poids accompagne chaque notice triée dans l'API.",
    methodAbstractsK: 'Résumés',
    methodAbstracts: (
      <>
        Non conservés. Les index inversés représentent 8,6 Go des 9,3 Go de texte de la base et le serveur dispose
        de 13 Go libres ; la page de détail récupère donc le résumé en direct depuis OpenAlex. Le fait qu&apos;un
        travail en <em>ait</em> un est conservé, car c&apos;est en soi un constat.
      </>
    ),
    methodRetractionK: 'Rétractation',
    methodRetraction: (
      <>
        Jointe à Retraction Watch par DOI, et conservée dans sa propre table à quatre états, parce que le champ{' '}
        <code className="font-mono text-xs">is_retracted</code> d&apos;OpenAlex est un booléen sur un espace
        d&apos;états qui compte au moins quatre valeurs.
      </>
    ),
    methodReproK: 'Reproductibilité',
    methodRepro: (
      <>
        Chaque nombre de ce site est produit par un script du dépôt et lu depuis{' '}
        <code className="font-mono text-xs">findings.json</code>. Rien n&apos;est saisi à la main : le site et
        l&apos;analyse ne peuvent donc pas diverger.
      </>
    ),
    sourcesTitle: 'Sources, licence, contact',
    sourcesBody:
      'Données : OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT, données CC BY 4.0. Réalisé par Ahmad Sofi-Mahmudi pour le Défi de données en métarecherche canadienne (Réseau canadien de la reproductibilité).',
    repoLink: 'Le dépôt',
    apiLink: "l'API publique",
    intro1: (n: string) =>
      `MétaCan est une carte de la métarecherche canadienne à provenance tracée : une base gelée de ${n} travaux, canadiens par l'une de quatre routes de métadonnées vérifiables, avec les preuves de dépistage machine, un classifieur distillé et chaque désaccord consigné. Elle existe pour qu'une méta-chercheuse puisse définir une cohorte, la compter exactement, l'exporter et la citer.`,
    intro2:
      "Elle est maintenue par une seule personne, travaille en anglais, et le dit. La base est bornée par l'instantané OpenAlex épinglé et les routes de métadonnées canadiennes enregistrées; aucune identité sensible n'est inférée, et les étiquettes dérivées impliquant des données sous gouvernance autochtone ne sont pas publiées sans gouvernance appropriée.",
    role: 'Chercheur indépendant',
    citeTitle: 'Citer cette version',
    licence:
      "Code MIT · Données et documentation CC BY 4.0 · Aucun enregistrement OSF, archive Zenodo, DOI ni validation humaine achevée n'est revendiqué à ce stade.",
  },

  apiDocs: {
    aTitle: 'La même requête, en point d’accès.',
    aBody:
      "Chaque écran consomme des points d'accès publics. La page, l'API et l'export analysent les mêmes paramètres avec la même fonction : aucune surface ne peut répondre à une question différente d'une autre.",
    colMethod: 'Méthode',
    colEndpoint: 'Point d’accès',
    colDesc: 'Description',
    overview: [
      { path: '/api/v1/cohort', d: 'Compter et paginer une cohorte pour tout ensemble de filtres' },
      { path: '/api/v1/works/{id}', d: 'Une notice : routes, étiquettes, prédictions, provenance' },
      { path: '/api/v1/facets/{facet}', d: "Valeurs d'autocomplétion : revue, sujet" },
      { path: '/api/v1/permalink', d: 'Créer un permalien citable /q/ vers une requête épinglée' },
      { path: '/api/v1/cohort/export', d: 'Export CSV ou JSON de la cohorte courante, plafonné' },
      { path: '/api/v1/recent', d: 'La couche en direct, synchronisée chaque jour' },
      { path: '/api/v1/screened', d: 'Le tri à trois modèles, avec verdicts et poids de sondage' },
      { path: '/api/v1/stats/…', d: 'Agrégats de la base : sommaire, années, routes, domaines, étiquettes' },
      { path: '/api/v1/findings', d: 'Le fichier des constats écrit par les scripts du pilote, tel quel' },
    ] as Array<{ path: string; d: string }>,
    sampleStatus: '200',
    title: "L'API publique",
    lead: (p: P) => (
      <>
        Lecture seule, JSON, CORS ouvert, sans clé. Chaque point d&apos;accès s&apos;appuie sur les mêmes fonctions
        que les pages : <code className="font-mono text-xs">searchWorks()</code> sert à la fois{' '}
        <Link href={p('/works')} className="link">
          /works
        </Link>{' '}
        et <code className="font-mono text-xs">/api/v1/works</code>, de sorte que l&apos;API ne peut pas répondre à
        une autre question que la page au-dessus d&apos;elle.
      </>
    ),
    baseUrl: 'URL de base :',
    thParam: 'Paramètre',
    thType: 'Type',
    thMeaning: 'Signification',
    summaryDesc:
      "La base en un seul objet : le total des travaux, les comptes sans affiliation et sans résumé, les marginales des quatre voies, et l'histogramme de consensus du tri.",
    worksDesc:
      'Parcourir et chercher toute la base. Plein texte sur les titres, tous les filtres de la page de consultation, paginé.',
    worksNote: (
      <>
        <strong>Le compte est plafonné à 10 000.</strong> Compter exactement 4,3 M de rangées coûte des secondes et
        personne ne lit le nombre ; <code className="font-mono text-xs">total_is_capped: true</code> signifie donc
        « au moins 10 000 », et non « exactement 10 000 ». Paginez s&apos;il vous en faut davantage.
      </>
    ),
    worksParams: {
      q: 'Recherche plein texte sur les titres (tsvector Postgres ; les termes sont liés par ET).',
      author:
        'Recherche par nom d’auteur sur la couche des auteurs (mêmes sémantiques websearch que q). Un nom est un filet large : il peut correspondre à plusieurs identités OpenAlex ; author_id est la forme précise.',
      authorId: 'Identifiant OpenAlex exact de l’auteur (A...), l’identité désambiguïsée. Le filtre citable.',
      year: 'Bornes inclusives sur l’année de publication.',
      citedMin: 'Nombre minimal de citations (cited_by >= N).',
      lang: 'Code de langue, p. ex. en, fr.',
      type: 'Type de travail, p. ex. article, preprint, dissertation.',
      field: "Domaine principal OpenAlex, p. ex. 'Medicine'.",
      route:
        "Provenance par voie : pourquoi le travail est dans la base. no_aff renvoie les travaux SANS affiliation canadienne, ceux qu'une base fondée sur la seule affiliation ne voit jamais.",
      retracted: "Seulement les travaux qu'OpenAlex signale comme rétractés.",
      noAbstract: 'Seulement les travaux sans résumé. Le tri y repère moitié moins de métarecherche.',
      nIn: 'Consensus du tri : combien des trois modèles ont qualifié le travail de métarecherche.',
      sort: 'Par défaut : cited.',
      page: 'per_page : 100 au maximum, 25 par défaut.',
    },
    worksExample: (base: string) =>
      `# Les travaux qu'une base fondée sur la seule affiliation n'aurait jamais vus,\n# les plus cités d'abord :\ncurl -sS "${base}/api/v1/works?route=no_aff&sort=cited&per_page=5" | jq '.results[] | {id, title, cited_by, routes}'\n\n# Travaux en français, sans résumé, parus depuis 2015 :\ncurl -sS "${base}/api/v1/works?lang=fr&no_abstract=1&year_from=2015&per_page=5" | jq\n\n# Recherche plein texte :\ncurl -sS "${base}/api/v1/works?q=reproducibility+crisis&per_page=3" | jq '.results[].title'`,
    workDesc:
      "Un travail avec tous les champs de la base, la provenance des voies, l'état Retraction Watch, les étiquettes directes de modèles et la prédiction sur toute la base avec les scores des modèles enseignants et les champs d'incertitude.",
    workAbstractParam:
      "Récupérer le résumé en direct depuis OpenAlex et le désinverser. Désactivé par défaut : les résumés ne sont pas dans cette base de données, en demander un coûte donc un aller-retour vers l'amont.",
    workExample: (base: string) =>
      `# Un travail, avec sa provenance :\ncurl -sS ${base}/api/v1/works/W2342586781 | jq '{id, title, routes}'\n\n# Avec le résumé récupéré en direct depuis OpenAlex :\ncurl -sS "${base}/api/v1/works/W2342586781?abstract=1" | jq '.abstract'`,
    screenedDesc:
      'Les 5 600 travaux triés, avec les niveaux, genres, confiances et motifs des trois modèles, plus le poids de sondage.',
    screenedNote: (
      <>
        <strong>L&apos;échantillon est stratifié.</strong> Chaque notice porte un{' '}
        <code className="font-mono text-xs">weight</code> (l&apos;inverse de la probabilité de sélection). Tout taux
        calculé sur ces rangées sans appliquer le poids est faux.
      </>
    ),
    screenedParams: {
      contestedOnly:
        "LE DOSSIER DES DÉSACCORDS : chaque travail qu'au moins un modèle a qualifié de métarecherche. Ce sous-ensemble, et non le taux de base, est le livrable du projet.",
      nIn: 'Compte de consensus exact.',
      stratum: 'p. ex. aff_core, about_only, french, venue_new, fund_new.',
      page: 'per_page : 100 au maximum.',
    },
    screenedExample: (base: string) =>
      `# Le dossier des désaccords : les travaux qui marquent la frontière du domaine.\ncurl -sS "${base}/api/v1/screened?contested_only=1" | jq '.meta.summary'\n\n# Les travaux qu'un SEUL modèle a qualifiés de métarecherche :\ncurl -sS "${base}/api/v1/screened?n_in=1" \\\n  | jq '.results[] | {title, opus: .opus.tier, gpt: .gpt.tier, grok: .grok.tier}'`,
    byRouteDesc: 'Les quatre voies : marginales, et combinaisons exactes de voies.',
    byRouteNote: (
      <>
        Les voies <strong>se recoupent</strong> (un travail peut être admis par plusieurs) :{' '}
        <code className="font-mono text-xs">marginals</code> totalise donc plus que la base.{' '}
        <code className="font-mono text-xs">combinations</code> compte chaque travail une seule fois et totalise le
        total exact.
      </>
    ),
    byYearDesc:
      "Les travaux par année, avec en regard les comptes sans affiliation et sans résumé, parce que les deux écarts évoluent dans le temps.",
    byFieldDesc:
      "La répartition par domaine, plus les langues, l'écart des résumés par type, les principales revues, les principaux organismes subventionnaires et le dossier de rétractation à quatre états : tout ce que dessine la page Analytique, en un seul appel.",
    findingsDesc:
      "Les 32 constats, servis tels quels depuis le fichier qu'écrivent les scripts du pilote. Chaque nombre du pilote cité sur ce site vient d'ici.",
    predictionsDesc:
      "Le sommaire des prédictions sur toute la base et le rapport d'évaluation du modèle, servis directement depuis les artefacts produits par le pilote. Ils comprennent les empreintes de la source et du modèle, la version, les comptes par catégorie, les règles, les résultats de validation croisée et les limites. Chaque score mesure la fidélité aux modèles enseignants, non l'exactitude humaine, et chaque prédiction est produite par machine et non validée.",
    cohortDesc: (p: P) => (
      <>
        La requête du constructeur de cohortes lui-même. Même analyseur, même fonction que{' '}
        <Link href={p('/')} className="link">
          la page d&apos;accueil
        </Link>
        , de sorte que l&apos;API ne peut pas répondre à une autre question que la page au-dessus d&apos;elle.
        Accepte tous les paramètres de /api/v1/works, plus les facettes ci-dessous.
      </>
    ),
    cohortNote: (
      <>
        <strong>Le compte est exact, et la couverture des étiquettes l&apos;accompagne.</strong>{' '}
        <code className="font-mono text-xs">meta.total</code> est le vrai N (une cohorte se cite par son N), et{' '}
        <code className="font-mono text-xs">meta.direct_labels_cover</code> indique la couverture des étiquettes
        directes, tandis que <code className="font-mono text-xs">meta.predictions_cover</code> indique celle des
        prédictions. Un tableau <code className="font-mono text-xs">labels</code> vide signifie{' '}
        <em>non étiqueté</em>, jamais « hors de la catégorie ».
      </>
    ),
    cohortParams: {
      topic: 'Sujet principal OpenAlex exact. Les valeurs viennent de la saisie semi-automatique : /api/v1/facets/topic?q=…',
      venue: 'Nom de revue exact. Les valeurs viennent de /api/v1/facets/venue?q=…',
      routesTri:
        "Facettes de voies à trois états : 1 exige la voie, 0 l'exclut, absent signifie « toutes ». Elles se composent (route_fund=1&route_aff=0 donne la strate financée-seulement), ce que le seul paramètre route ne peut pas exprimer.",
      retracted: '1 = rétractés seulement; 0 = exclure les rétractés; absent = tous.',
      abstract: 'has = seulement les travaux avec résumé; none = seulement ceux sans résumé.',
      category:
        "Facette de catégorie. Sa source de preuve est choisie par label_source. Les étiquettes directes et les prédictions ne sont pas validées.",
      design:
        "Facette de devis d'étude. Sa source de preuve est choisie par label_source. Aucun devis n'est encore validé contre MEDLINE.",
      labelSource:
        "direct utilise les sorties directes et clairsemées des modèles. predicted utilise les sorties de distillation sur toute la base. Aucune n'est validée par des humains.",
      predictionMode:
        "candidate utilise l'union des têtes Codex et Gemma seuillées. consensus utilise leur intersection.",
      agreement:
        "Pour les étiquettes directes seulement. any signifie qu'un modèle suffit; all signifie que chaque modèle ayant étiqueté le travail concorde sur la valeur filtrée.",
      labeled:
        "Pour les étiquettes directes seulement. 1 exige une rangée d'étiquette directe; 0 exige son absence.",
    },
    cohortExample: (base: string) =>
      `# Travaux de métarecherche étiquetés directement, avec couverture exacte :\ncurl -sS "${base}/api/v1/cohort?label_source=direct&category=metaresearch" \\\n  | jq '{total: .meta.total, direct: .meta.direct_labels_cover}'\n\n# Prédictions de consensus pour la métarecherche :\ncurl -sS "${base}/api/v1/cohort?label_source=predicted&prediction_mode=consensus&category=metaresearch" \\\n  | jq '{total: .meta.total, predicted: .meta.predictions_cover, first: .results[0].prediction}'`,
    exportDesc:
      "La cohorte entière en un fichier, diffusé depuis la base de données : toutes les colonnes des travaux, les étiquettes directes, les données complètes de prédiction, les anciens scores provisoires et les champs d'état par rangée.",
    exportNote: (
      <>
        <strong>Plafonné à 100 000 rangées.</strong> La troncature n&apos;est jamais silencieuse : elle est déclarée
        dans <code className="font-mono text-xs">meta.truncated</code> (JSON), dans une ligne de commentaire finale
        (CSV) et dans l&apos;en-tête <code className="font-mono text-xs">X-Export-Truncated</code>. Au-delà du
        plafond, resserrez la cohorte ou reconstruisez la base depuis le dépôt.
      </>
    ),
    exportParams: {
      format: 'csv (défaut) ou json. Tout le reste suit le même vocabulaire de filtres que /api/v1/cohort.',
    },
    exportExample: (base: string) =>
      `# Une cohorte étiquetée en CSV :\ncurl -sSL "${base}/api/v1/cohort/export?category=metaresearch&format=csv" -o cohort.csv\n\n# En JSON, métadonnées d'abord :\ncurl -sS "${base}/api/v1/cohort/export?design=systematic_review&year_from=2020&format=json" | jq '.meta'`,
    permalinkDesc:
      "Créer le permalien citable /q/<hash> d'un état de filtres. Idempotent : le hachage est une fonction des filtres canoniques, la même cohorte reçoit donc toujours la même URL, qui que soit le demandeur et quel que soit le moment.",
    permalinkExample: (base: string) =>
      `curl -sS -X POST "${base}/api/v1/permalink?label_source=predicted&prediction_mode=consensus&category=metaresearch" \\\n  | jq '{url, total, direct_labels_cover, predictions_cover}'`,
    labelsStatsDesc:
      "Le panorama des étiquettes : couverture, catégories, devis d'étude, années et langues sur le sous-ensemble étiqueté par machine. La même fonction que rend la page Panorama, de sorte que les deux ne peuvent pas diverger.",
    facetsDesc:
      'Saisie semi-automatique sur les ~85 000 revues distinctes et ~4 500 sujets distincts, avec les comptes sur toute la base. Deux caractères au minimum.',
    facetsExample: (base: string) =>
      `curl -sS "${base}/api/v1/facets/venue?q=canadian+journal" | jq '.results[:3]'\ncurl -sS "${base}/api/v1/facets/topic?q=peer+review" | jq '.results[:3]'`,
    facetAuthorDesc:
      'Saisie semi-automatique sur les personnes ayant une signature affiliée au Canada, classées par production canadienne. Retourne l’identifiant OpenAlex désambiguïsé (A...) à côté de chaque nom ; c’est cet identifiant que consomment ?author_id= et le point d’accès du réseau. Deux caractères au minimum.',
    networkDesc:
      'Le réseau de collaboration intra-Canada. Sans paramètre : le graphe d’ensemble des liens les plus forts. Avec author_id : le voisinage de cette personne. Le bloc meta énonce les règles de construction (nœuds, liens, pondération fractionnaire, garde de densité) dans chaque réponse, car un graphe dont les règles ne sont pas dans la réponse n’est pas citable.',
    networkParams: {
      authorId: 'Identifiant OpenAlex de l’auteur (A...). Omettre pour le graphe d’ensemble.',
    },
    notesTitle: 'Remarques',
    noteCors: (
      <>
        <strong>CORS</strong> est ouvert (<code className="font-mono text-xs">*</code>). C&apos;est un jeu de
        données de recherche public sous CC-BY ; l&apos;intérêt de le publier est que vous puissiez l&apos;interroger
        depuis votre propre page sans serveur mandataire.
      </>
    ),
    noteCache: (
      <>
        <strong>Cache.</strong> Les réponses portent <code className="font-mono text-xs">s-maxage=3600</code>. La
        base est un instantané épinglé : elle ne change pas entre les déploiements, un agrégat un peu vieux
        n&apos;est donc pas un risque, alors que rebalayer 4,3 M de rangées à chaque requête en serait un.
      </>
    ),
    noteLimit: (
      <>
        <strong>Sans clé, sans limite de débit</strong>, mais c&apos;est un seul petit serveur. Restez raisonnable,
        et s&apos;il vous faut toute la base, prenez{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge">
          le dépôt
        </a>{' '}
        et reconstruisez-la localement plutôt que d&apos;en paginer quatre millions de rangées hors de cette
        machine.
      </>
    ),
    noteLicense: (
      <>
        <strong>Licence.</strong> Données CC BY 4.0, code MIT. Citez OpenAlex et Retraction Watch comme sources
        amont.
      </>
    ),
  },
}

export const dictionaries: Record<Lang, Dictionary> = { en, fr }

export function getDict(lang: Lang): Dictionary {
  return dictionaries[lang]
}

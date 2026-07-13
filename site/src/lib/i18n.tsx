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
    titleDefault: 'MétaCan — the Canadian research frame',
    titleTemplate: '%s · MétaCan',
    description:
      '4,299,418 Canadian works from a pinned OpenAlex snapshot. Every record shows why it was found and why it counts as Canadian.',
    works: 'Works',
    workNotFound: 'Work not found',
    screen: 'The three-model screen',
    analytics: 'Analytics',
    findings: 'Findings',
    api: 'API',
    about: 'About',
  },

  nav: {
    works: 'Works',
    screen: 'The screen',
    analytics: 'Analytics',
    findings: 'Findings',
    api: 'API',
    about: 'About',
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
    toggleTheme: 'Toggle theme',
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
  },

  home: {
    eyebrow: 'A pinned OpenAlex snapshot · all 482 partitions · 2000–2025',
    h1: 'Don’t search for metaresearch. Search for Canada, then screen.',
    lead: (
      <>
        The usual design retrieves what <em>looks</em> like metaresearch, then asks whether it is Canadian. That
        makes the field boundary a property of your keyword list, and it is why such maps cannot be audited: you
        cannot measure what a lexicon never showed you. This frame is inverted. It is{' '}
        <strong style={{ color: 'var(--ink)' }}>all Canadian research</strong> — an external, checkable criterion —
        so field membership becomes a classification over an enumerable universe, not a retrieval over the
        literature.
      </>
    ),
    statFrameLabel: 'Works in the frame',
    statFrameNote: 'every Canadian work in the snapshot, each exactly once',
    statNoAffLabel: 'Invisible to affiliation alone',
    statNoAffNote: (pct: string) => `${pct} — an affiliation-only frame silently loses these`,
    statNoAbsLabel: 'Carry no abstract',
    statNoAbsNote: (pct: string) => `${pct} — the screen finds half as much metaresearch here`,
    statScreenedLabel: 'Screened by three models',
    statScreenedNote: 'Opus 4.8 · GPT-5.6 · Grok 4.5, one locked rubric',
    card1Title: 'The boundary is not a line. It is a region.',
    card1P1: (
      <>
        Three frontier models screened the same 1,000 works against the same locked rubric, on the full eight-field
        payload the rubric always specified. Of the works <em>any</em> model called metaresearch, only{' '}
        <strong style={{ color: 'var(--ink)' }}>37% were called metaresearch by all three</strong>, and 47% rest on
        a single model&apos;s opinion. Two screeners can agree on a <em>rate</em> while finding almost entirely
        different <em>works</em>: at a ~1% base rate, the settled rejects buy 98% agreement for free.
      </>
    ),
    card1P2: (p: P) => (
      <>
        So the deliverable is not a base rate. It is the{' '}
        <Link href={p('/screen')} className="link">
          disagreement dossier
        </Link>
        : the works that mark the empirical boundary of the field, and against which the inclusion criteria have to
        be written.
      </>
    ),
    card2Title: 'A boolean over a four-state space',
    card2Body: (retr: string, eoc: string) => (
      <>
        OpenAlex records retraction as <code className="font-mono text-xs">is_retracted</code>, a boolean. The
        post-publication record has at least four states. Joined to Retraction Watch, this frame carries{' '}
        <strong style={{ color: 'var(--ink)' }}>{retr}</strong> works with a recorded notice, of which{' '}
        <strong style={{ color: 'var(--concern)' }}>{eoc}</strong> are <em>expressions of concern</em> — a state
        OpenAlex has no field for at all, and silently reports as{' '}
        <code className="font-mono text-xs">false</code>, which reads as &ldquo;fine&rdquo;.
      </>
    ),
    card2Link: 'Browse the retraction record →',
  },

  works: {
    title: 'Works',
    sub: 'Every work in the frame. Each row carries the routes that admitted it, because a frame that forgets how it found something cannot be audited.',
    countCapped: '10,000+',
    countWorks: (n: string) => `${n} works`,
    matching: (q: string) => ` matching “${q}”`,
    empty: 'No works match these filters.',
  },

  filters: {
    searchPlaceholder: 'Search titles — full-text over 4,299,418 works',
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
    consensus3: '3/3 — all three models',
    consensus2: '2/3 — contested',
    consensus1: '1/3 — one model only',
    consensus0: '0/3 — all three said out',
    active: (n: number) => `${n} filter${n === 1 ? '' : 's'} active`,
    clearAll: 'clear all',
  },

  workRow: {
    routeAffTitle: 'Admitted by a Canadian affiliation',
    routeFundTitle: 'Admitted by a Canadian funder',
    routeVenueTitle: 'Admitted by a Canadian venue',
    routeAboutTitle: 'Admitted by being about Canada',
    noAffTitle: 'No Canadian affiliation. An affiliation-only frame would never have seen this work.',
    noAbstractChip: 'no abstract',
    noAbstractTitle:
      'No abstract in OpenAlex. The screen finds half as much metaresearch in this stratum, so this is a measured bias, not a missing field.',
    consensusAll: '3/3 metaresearch',
    consensusN: (n: number) => `${n}/3 metaresearch`,
    consensusAllTitle: 'All three models called this metaresearch.',
    consensusNTitle: (n: number) =>
      `Only ${n} of 3 models called this metaresearch: a contested work, on the field's empirical boundary.`,
    retractionMissedTitle: (nature: string) =>
      `${nature} — recorded by Retraction Watch, NOT flagged by OpenAlex.`,
    retractionMissedSuffix: ' · OpenAlex missed it',
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
    whyTitle: 'Why is this work in the frame?',
    whySub: 'A frame that forgets how it found something cannot be audited. These are the routes that admitted this work.',
    noAffCallout: (
      <>
        <strong style={{ color: 'var(--mc-accent)' }}>No Canadian affiliation.</strong> An affiliation-only frame —
        the usual design — would never have seen this work. It is one of the works that make the case for inverting
        the frame.
      </>
    ),
    postPubTitle: 'Post-publication record',
    nature: 'Nature',
    reason: 'Reason',
    date: 'Date',
    flagged: 'Flagged by OpenAlex?',
    flaggedYes: 'Yes',
    flaggedNo: 'No — Retraction Watch records this, and OpenAlex does not flag it.',
    rwSource: (
      <>
        Source: Retraction Watch, joined by DOI. OpenAlex records retraction as{' '}
        <code className="font-mono text-xs">is_retracted</code>, a boolean over a state space with at least four
        values, so it cannot express an expression of concern, a correction or a reinstatement — it reports them as{' '}
        <code className="font-mono text-xs">false</code>, which reads as &ldquo;fine&rdquo;.
      </>
    ),
    openalexOnly: 'OpenAlex flags this work as retracted, but it carries no matching Retraction Watch record in this frame.',
    screenTitle: 'The three-model screen',
    screenAll: 'all 1,000 screened works →',
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
      'No abstract. This is not a gap in this database — OpenAlex has none either. 23.3% of the frame is in this state, and the screen finds HALF as much metaresearch here, so the absence is a measured bias rather than a missing field.',
    recordTitle: 'The record',
    venue: 'Venue',
    topic: 'Topic',
    field: 'Field',
    institutions: 'Canadian institutions',
    funders: 'Funders',
    keywords: 'Keywords',
    hasAbstract: 'Has abstract in OpenAlex',
    api: 'API',
  },

  screen: {
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
        base rate, the settled rejects buy 98% agreement for free — which is why an agreement statistic computed
        over the whole sample tells you nothing about the boundary, and why the table below, not a percentage, is
        the deliverable.
      </>
    ),
    statAnyLabel: 'Any model said metaresearch',
    statAnyNote: "the disagreement dossier: the field's empirical boundary",
    statAllLabel: 'All three agreed',
    statAllNote: (pct: string) => `${pct} of the dossier — the settled core`,
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
        Swap which model you call &ldquo;the screener&rdquo; and the size of the field moves. That spread — not the
        binomial confidence interval on any one model&apos;s labels — is the honest uncertainty on how big Canadian
        metaresearch is.
      </>
    ),
    dossierTitle: 'The disagreement dossier',
    dossierSub:
      'All three verdicts, confidences and reasons side by side. These are the works against which the inclusion criteria have to be written — because these are the works on which reasonable screeners, given the same rubric and the same evidence, disagree.',
    tabDossier: 'The dossier (any model said in)',
    tab3: '3/3 — settled core',
    tab2: '2/3 — contested',
    tab1: '1/3 — one model only',
    tab0: '0/3 — settled rejects',
    tabAll: 'All 1,000',
    workCount: (total: string, one: boolean) => `${total} work${one ? '' : 's'}`,
    thWork: 'Work',
    thStratum: 'Stratum',
    emptyView: 'No works in this view.',
    tierT1: 'T1 — core metaresearch (counts as IN)',
    tierT2: 'T2 — metaresearch (counts as IN)',
    tierT3: 'T3 — adjacent. Does NOT count as in scope.',
    tierOut: 'out of scope',
    foundTitle: 'What the screen actually found',
    computed: (date: string) => `Computed ${date}`,
    allFindings: 'all 22 findings',
    dossierJson: 'this dossier as JSON',
  },

  analytics: {
    title: 'Analytics',
    sub: (n: string) =>
      `The frame, described by itself. Every figure is a query against the ${n} works, computed at request time and cached for an hour — nothing here is a number someone typed.`,
    tileWorks: 'Works in the frame',
    tileNoAff: 'No Canadian affiliation',
    tileNoAbs: 'No abstract',
    tileNotices: 'Retraction notices',
    ofFrame: (pct: string) => `${pct} of the frame`,
    joinedFromRW: 'joined from Retraction Watch',
    byYearTitle: 'Works by year',
    byYearNote: (pct: string, n: string) =>
      `The frame over time, with the works that carry NO Canadian affiliation drawn underneath. The gap between the two lines is what an affiliation-only frame silently loses — ${pct} of the frame, ${n} works.`,
    byRouteTitle: 'Works by route',
    byRouteNote: (sum: string, over: string, total: string) =>
      `Why each work is in the frame. The four routes OVERLAP — a work can be admitted by several — so these bars sum to ${sum}, which is ${over} more than the ${total} works in the frame. That overlap is the next chart.`,
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
      `Share of works with NO abstract, by type, worst first. ${pct} of the frame has no abstract, and the screen finds HALF as much metaresearch there. If the gap were random, a better index would fix it. It is not random: it is concentrated in types that never carry an abstract at all — so "just screen the works that have abstracts" is a selection on a covariate that predicts the outcome.`,
    retractionTitle: 'The post-publication record has four states, and OpenAlex has a boolean',
    retractionNote: (notices: string, missed: string) =>
      `${notices} works in the frame carry a Retraction Watch notice. The solid bar is what OpenAlex flags; the hatched bar is what it reports as “false” — ${missed} works whose notice OpenAlex does not carry, which a reader takes to mean “fine”. An expression of concern is not a retraction, and \`is_retracted\` has no way to say so.`,
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
    lead: (n: number) => (
      <>
        All {n} findings, rendered directly from{' '}
        <code className="font-mono text-xs">pilot/results/findings.json</code> — the file the pilot scripts write.
        No number on this page was typed by a human, which is the only way to guarantee the site and the analysis
        cannot drift apart.
      </>
    ),
    apiLink: 'the same file over the API →',
    computed: (key: string, date: string) => `${key} · computed ${date}`,
    originalLabel: '',
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
        The usual way to map a field is to retrieve what <em>looks</em> like the field — a keyword list, a topic
        classifier, a journal set — and then ask which of the results are Canadian. This makes the field&apos;s
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
        <strong style={{ color: 'var(--ink)' }}>all Canadian research</strong> — an external, checkable criterion,
        enumerable from a pinned OpenAlex snapshot — and makes field membership a{' '}
        <em>classification over a known universe</em> rather than a <em>retrieval over the literature</em>. Once the
        universe is enumerable, recall becomes measurable, a sample has known selection probabilities, and a
        disagreement between screeners becomes a finding instead of an embarrassment.
      </>
    ),
    flipP3: (p: P) => (
      <>
        The cost is that &ldquo;Canadian&rdquo; must itself be defined, and it is: by{' '}
        <strong style={{ color: 'var(--ink)' }}>four routes</strong> — affiliation, funder, venue, and subject —
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
        Three frontier models screened the same 1,000 works against the same locked rubric. They did not agree. Of
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
    limitsAll: 'All 22 findings, rendered from the pipeline’s own output →',
    errorsTitle: 'The errors',
    errorsP1: (
      <>
        This project records its own mistakes.{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge/blob/main/DEVIATIONS.md">
          DEVIATIONS.md
        </a>{' '}
        lists them — deviations from the protocol, defects in the screening harness, an estimator that had to be cut
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
        Crossref as the discipline-agnostic rescue, and Crossref recovered 2 abstracts against PubMed&apos;s 180 —
        so that rescue <strong style={{ color: 'var(--ink)' }}>does not exist</strong>, and the gap is structural.
        GPT-5.6 violated the locked output schema on 18 of 1,000 records; the manifest validator caught it, and it
        is recorded rather than silently repaired.
      </>
    ),
    methodTitle: 'Method, in short',
    methodFrameK: 'Frame',
    methodFrame:
      'Every Canadian work in a pinned OpenAlex snapshot (all 482 partitions), each work exactly once, admitted by one or more of four routes: Canadian affiliation, Canadian funder, Canadian venue, or subject-about-Canada.',
    methodScreenK: 'Screen',
    methodScreen:
      '1,000 works drawn with known selection probabilities, stratified (French oversampled), screened by Claude Opus 4.8, GPT-5.6 (high) and Grok 4.5 against one locked rubric on its full eight-field payload. Chunks were randomized and manifest-logged before any model ran, and the harness writes the label files — never the model.',
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
    sourcesTitle: 'Sources, licence, contact',
    sourcesBody:
      'Data: OpenAlex (CC0), Retraction Watch (CC-BY), ClinicalTrials.gov. Code MIT, data CC-BY-4.0. Built by Ahmad Sofi-Mahmudi for the Canadian Metaresearch Data Challenge (Canadian Reproducibility Network).',
    repoLink: 'The repository',
    apiLink: 'the public API',
  },

  apiDocs: {
    title: 'The public API',
    lead: (p: P) => (
      <>
        Read-only, JSON, CORS-enabled, no key. Every endpoint is backed by the same functions the pages call —{' '}
        <code className="font-mono text-xs">searchWorks()</code> serves both{' '}
        <Link href={p('/works')} className="link">
          /works
        </Link>{' '}
        and <code className="font-mono text-xs">/api/v1/works</code> — so the API cannot answer a different question
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
      year: 'Inclusive publication-year bounds.',
      lang: 'Language code, e.g. en, fr.',
      type: 'Work type, e.g. article, preprint, dissertation.',
      field: "OpenAlex primary field, e.g. 'Medicine'.",
      route:
        'Route provenance: why the work is in the frame. no_aff returns the works with NO Canadian affiliation — the ones an affiliation-only frame never sees.',
      retracted: 'Only works OpenAlex flags as retracted.',
      noAbstract: 'Only works with no abstract. The screen finds half as much metaresearch here.',
      nIn: 'Screening consensus: how many of the three models called it metaresearch.',
      sort: 'Default: cited.',
      page: 'per_page max 100, default 25.',
    },
    worksExample: (base: string) =>
      `# The works an affiliation-only frame would never have seen,\n# most-cited first:\ncurl -sS "${base}/api/v1/works?route=no_aff&sort=cited&per_page=5" | jq '.results[] | {id, title, cited_by, routes}'\n\n# French-language works with no abstract, published since 2015:\ncurl -sS "${base}/api/v1/works?lang=fr&no_abstract=1&year_from=2015&per_page=5" | jq\n\n# Full-text search:\ncurl -sS "${base}/api/v1/works?q=reproducibility+crisis&per_page=3" | jq '.results[].title'`,
    workDesc:
      "One work, every field, the routes that admitted it, its Retraction Watch state if any, and all three models' labels and reasons if it was screened.",
    workAbstractParam:
      'Fetch the abstract live from OpenAlex and de-invert it. Off by default: abstracts are not in this database, so asking for one costs an upstream round-trip.',
    workExample: (base: string) =>
      `# A work, with its provenance:\ncurl -sS ${base}/api/v1/works/W2342586781 | jq '{id, title, routes}'\n\n# With the abstract fetched live from OpenAlex:\ncurl -sS "${base}/api/v1/works/W2342586781?abstract=1" | jq '.abstract'`,
    screenedDesc:
      "The 1,000 screened works with all three models' tiers, genres, confidences and reasons, plus the design weight.",
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
        The routes <strong>overlap</strong> — a work can be admitted by several — so{' '}
        <code className="font-mono text-xs">marginals</code> sums to more than the frame.{' '}
        <code className="font-mono text-xs">combinations</code> counts each work once and sums to the total.
      </>
    ),
    byYearDesc: 'Works per year, with the no-affiliation and no-abstract counts alongside, because both gaps move over time.',
    byFieldDesc:
      'The field breakdown, plus languages, the abstract gap by type, top venues, top funders, and the four-state retraction record — everything the analytics page draws, in one call.',
    findingsDesc:
      'All 22 findings, served verbatim from the file the pilot scripts write. Every number quoted anywhere on this site comes from here.',
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
        <strong>No key, no rate limit</strong> — but it is one small server. Be reasonable, and if you need the
        whole frame, take{' '}
        <a className="link" href="https://github.com/choxos/CaRN-data-challenge">
          the repository
        </a>{' '}
        and rebuild it locally rather than paginating four million rows out of this box.
      </>
    ),
    noteLicense: (
      <>
        <strong>Licence.</strong> Data CC-BY-4.0, code MIT. Cite OpenAlex and Retraction Watch as the upstream
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
    findings: 'Constats',
    api: 'API',
    about: 'À propos',
  },

  nav: {
    works: 'Travaux',
    screen: 'Le tri',
    analytics: 'Analytique',
    findings: 'Constats',
    api: 'API',
    about: 'À propos',
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
    toggleTheme: 'Changer de thème',
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
  },

  home: {
    eyebrow: 'Un instantané OpenAlex épinglé · les 482 partitions · 2000 à 2025',
    h1: 'Ne cherchez pas la métarecherche. Cherchez le Canada, puis triez.',
    lead: (
      <>
        Le devis habituel repère ce qui <em>ressemble</em> à de la métarecherche, puis demande si c&apos;est
        canadien. La frontière du domaine devient ainsi une propriété de votre liste de mots-clés, et c&apos;est
        pourquoi de telles cartes ne peuvent pas être vérifiées : on ne peut pas mesurer ce qu&apos;un lexique ne
        vous a jamais montré. Cette base est inversée. Elle contient{' '}
        <strong style={{ color: 'var(--ink)' }}>toute la recherche canadienne</strong>, un critère externe et
        vérifiable, de sorte que l&apos;appartenance au domaine devient une classification sur un univers
        énumérable, et non un repérage dans la littérature.
      </>
    ),
    statFrameLabel: 'Travaux dans la base',
    statFrameNote: "chaque travail canadien de l'instantané, compté exactement une fois",
    statNoAffLabel: 'Invisibles à la seule affiliation',
    statNoAffNote: (pct: string) => `${pct} : une base fondée sur la seule affiliation les perd en silence`,
    statNoAbsLabel: 'Sans résumé',
    statNoAbsNote: (pct: string) => `${pct} : le tri y repère moitié moins de métarecherche`,
    statScreenedLabel: 'Triés par trois modèles',
    statScreenedNote: 'Opus 4.8 · GPT-5.6 · Grok 4.5, une seule grille verrouillée',
    card1Title: "La frontière n'est pas une ligne. C'est une région.",
    card1P1: (
      <>
        Trois modèles de pointe ont trié les mêmes 1 000 travaux selon la même grille verrouillée, sur la charge
        utile complète de huit champs que la grille a toujours prescrite. Parmi les travaux qu&apos;au moins{' '}
        <em>un</em> modèle a qualifiés de métarecherche, seulement{' '}
        <strong style={{ color: 'var(--ink)' }}>37 % l&apos;ont été par les trois</strong>, et 47 % reposent sur
        l&apos;avis d&apos;un seul modèle. Deux trieurs peuvent s&apos;accorder sur un <em>taux</em> tout en
        repérant des <em>travaux</em> presque entièrement différents : à un taux de base d&apos;environ 1 %, les
        rejets évidents offrent 98 % d&apos;accord gratuitement.
      </>
    ),
    card1P2: (p: P) => (
      <>
        Le livrable n&apos;est donc pas un taux de base. C&apos;est le{' '}
        <Link href={p('/screen')} className="link">
          dossier des désaccords
        </Link>{' '}
        : les travaux qui marquent la frontière empirique du domaine, et sur lesquels les critères d&apos;inclusion
        doivent être rédigés.
      </>
    ),
    card2Title: 'Un booléen sur un espace à quatre états',
    card2Body: (retr: string, eoc: string) => (
      <>
        OpenAlex consigne la rétractation dans <code className="font-mono text-xs">is_retracted</code>, un booléen.
        Le dossier post-publication compte au moins quatre états. Jointe à Retraction Watch, cette base porte{' '}
        <strong style={{ color: 'var(--ink)' }}>{retr}</strong> travaux munis d&apos;un avis consigné, dont{' '}
        <strong style={{ color: 'var(--concern)' }}>{eoc}</strong> sont des{' '}
        <em>expressions de préoccupation</em> : un état pour lequel OpenAlex n&apos;a aucun champ, et qu&apos;il
        rapporte silencieusement comme <code className="font-mono text-xs">false</code>, ce qui se lit comme
        « rien à signaler ».
      </>
    ),
    card2Link: 'Parcourir le dossier des rétractations →',
  },

  works: {
    title: 'Travaux',
    sub: "Tous les travaux de la base. Chaque rangée indique les voies par lesquelles le travail a été admis, car une base qui oublie comment elle a trouvé un travail ne peut pas être vérifiée.",
    countCapped: '10 000+',
    countWorks: (n: string) => `${n} travaux`,
    matching: (q: string) => ` correspondant à « ${q} »`,
    empty: 'Aucun travail ne correspond à ces filtres.',
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
    whyTitle: 'Pourquoi ce travail est-il dans la base ?',
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
    screenAll: 'les 1 000 travaux triés →',
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
  },

  screen: {
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
    tabAll: 'Les 1 000',
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
    allFindings: 'les 22 constats',
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
        Trois modèles de pointe ont trié les mêmes 1 000 travaux selon la même grille verrouillée. Ils ne se sont
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
    limitsAll: 'Les 22 constats, rendus depuis la sortie de la chaîne de traitement →',
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
        a enfreint le schéma de sortie verrouillé sur 18 des 1 000 notices ; le validateur de manifeste l&apos;a
        détecté, et l&apos;incident est consigné plutôt que réparé en silence.
      </>
    ),
    methodTitle: 'La méthode, en bref',
    methodFrameK: 'Base de sondage',
    methodFrame:
      "Chaque travail canadien d'un instantané OpenAlex épinglé (les 482 partitions), chacun compté exactement une fois, admis par une ou plusieurs des quatre voies : affiliation canadienne, organisme subventionnaire canadien, revue canadienne, ou sujet portant sur le Canada.",
    methodScreenK: 'Tri',
    methodScreen:
      "1 000 travaux tirés avec des probabilités de sélection connues, stratifiés (français suréchantillonné), triés par Claude Opus 4.8, GPT-5.6 (high) et Grok 4.5 selon une seule grille verrouillée sur sa charge utile complète de huit champs. Les lots ont été randomisés et consignés au manifeste avant l'exécution de tout modèle, et c'est le dispositif qui écrit les fichiers d'étiquettes, jamais le modèle.",
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
  },

  apiDocs: {
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
      year: 'Bornes inclusives sur l’année de publication.',
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
      "Un travail, tous ses champs, les voies qui l'ont admis, son état Retraction Watch le cas échéant, et les étiquettes et motifs des trois modèles s'il a été trié.",
    workAbstractParam:
      "Récupérer le résumé en direct depuis OpenAlex et le désinverser. Désactivé par défaut : les résumés ne sont pas dans cette base de données, en demander un coûte donc un aller-retour vers l'amont.",
    workExample: (base: string) =>
      `# Un travail, avec sa provenance :\ncurl -sS ${base}/api/v1/works/W2342586781 | jq '{id, title, routes}'\n\n# Avec le résumé récupéré en direct depuis OpenAlex :\ncurl -sS "${base}/api/v1/works/W2342586781?abstract=1" | jq '.abstract'`,
    screenedDesc:
      'Les 1 000 travaux triés, avec les niveaux, genres, confiances et motifs des trois modèles, plus le poids de sondage.',
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
      'Les 22 constats, servis tels quels depuis le fichier qu’écrivent les scripts du pilote. Chaque nombre cité où que ce soit sur ce site vient d’ici.',
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

# MétaCan design contract

## Product character

MétaCan is an evidence browser for Canadian metaresearch. It should feel archival, precise, and calm. The interface favours dense, legible information over decorative treatment. Every visual distinction must correspond to a real difference in the data.

## Visual foundation

The warm paper palette remains the foundation in light mode. Dark mode uses ink and slate surfaces. Maple red is the brand and action colour. Teal identifies measured in-scope evidence. Amber communicates disagreement, provisional status, or caution.

Typography is compact and editorial. Sans serif text supports controls and dense records. Serif headings may introduce explanatory sections. Numeric values use tabular figures whenever alignment aids comparison.

Surfaces use restrained borders, small corner radii, and minimal shadow. Chips are reserved for compact categorical facts. Controls remain recognizable as controls without excessive decoration.

## Identity

The MétaCan mark combines an uppercase M with an open scholarly book. A small abstract maple form identifies the Canadian context without turning the mark into a flag or institutional crest. The geometry stays flat and legible at favicon size.

The wordmark uses a scholarly serif face. Maple red carries the Canadian reference; teal carries the measured evidence theme. The horizontal logo is stored at `public/metacan-logo.svg`, and the standalone mark is stored at `public/metacan-mark.svg`.

## Information hierarchy

The main navigation, cohort builder, landscape, API, and explanatory pages retain their hierarchy. Search and filter controls appear before results. Result rows keep the title as the primary element, bibliographic facts as secondary information, and evidence markers as tertiary information.

Direct screening labels and classifier predictions are different evidence sources. They must never share a badge, heading, or count that implies equivalence.

## Classifier presentation

Classifier output is described as teacher imitation. It is not described as calibrated prevalence or ground truth.

Classifier filters expose four concepts:

1. Source chooses direct screening or classifier output.
2. Mode chooses candidate union or consensus intersection.
3. Coverage chooses classified or unclassified works.
4. Version identifies the immutable classifier release.

Candidate union is the inclusive view. Consensus intersection is the conservative view. The selected mode and version remain visible near filtered results and are retained in permanent links.

Work rows show only the prediction facts needed for scanning. Work detail may show the selected targets, teacher head scores, decision mode, version, and coverage warning. A prediction panel uses distinct language and spacing from the direct label panel.

## Interaction behaviour

Existing URLs retain their behaviour when classifier parameters are absent. Contradictory direct label and classifier parameters produce a clear validation response. A classifier request resolves one active version for the entire request. Permanent links pin the resolved version so their meaning does not drift.

Empty, loading, unavailable, and partial coverage states use explicit text. A missing prediction is unknown, not a negative classification. Controls remain usable by keyboard and have visible focus treatment.

Bibliographic values with exact search filters are links. Year, type, language, venue, topic, field, abstract availability, Canadian institution, funder, and keyword values open the complete matching result set. Array membership indexes support the three semicolon-delimited record facets without weakening exact matching.

On desktop, the evidence and abstract remain in the primary reading column while the compact bibliographic record sits in a sticky right rail. The layout returns to one column on smaller screens so the reading order remains linear.

## Abstract presentation

Abstract text is resolved on demand and kept in a bounded memory cache. The source preference is PubMed, Europe PMC, then OpenAlex. PMID and PMCID are shown as linked record identifiers when an upstream record supplies them. PubMed section labels and Europe PMC headings are preserved as separate background, objective, methods, results, conclusion, and other supplied sections. Unstructured abstracts retain their supplied paragraph structure. A one paragraph source remains one paragraph, and the interface never invents scientific headings.

## Rolling OpenAlex layer

Recent publications use a visibly separate live layer. Its navigation label, status card, and record badge make clear that these records are updated daily and are not part of the frozen 4,299,418 work release. Recent detail pages retain the same route-first reading order, readable abstract treatment, clickable record facets, Canadian author affiliations, and desktop right rail. No classifier category appears until a classifier passes human validation.

Long abstracts begin with a compact preview. Expanding the abstract grows the page naturally across the full card width. The abstract itself never uses an internal scrollbar.

## Responsive behaviour

Desktop layouts may use dense filter grids and side by side evidence panels. Tablet layouts reduce columns while preserving labels above controls. Mobile layouts stack controls, keep result metadata readable, and avoid horizontal page scrolling. Mobile screening evidence uses stacked work cards instead of requiring a 1,100 pixel table. API parameters also become labelled cards on mobile. The mobile header presents one menu button; its expanded panel contains every primary and explanatory route, the language control, and the theme control. Wide plots and remaining data tables scroll within their own bounded surface with a visible scrollbar. Interactive controls provide a minimum 44 pixel touch target on mobile.

## Accessibility and language

English and French receive equivalent controls, warnings, and evidence descriptions. Original machine rationales remain verbatim evidence and are explicitly identified as English on the French screening page. Colour is never the only carrier of meaning. Text and interactive elements meet WCAG AA contrast. Motion respects reduced motion preferences. Charts provide nearby text summaries and accessible labels.

## Implementation boundaries

Use the existing tokens in `src/styles/globals.css`. Add tokens only when a new semantic state cannot be expressed with the current system. Prefer reusable, narrowly scoped components. Keep query, API parsing, permalink, and presentation concerns separate so each surface can be tested independently.

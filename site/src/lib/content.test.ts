import assert from "node:assert/strict";
import test from "node:test";
import { abstractFromPubMedXml } from "@/lib/abstracts";
import { csvCell } from "@/lib/csv";
import { displayText } from "@/lib/display-text";
import { structureAbstract } from "@/lib/structured-abstract";

test("retains every explicit structured heading including results", () => {
  const sections = structureAbstract(
    "BACKGROUND: Context. METHODS: Procedure. RESULTS: Findings. CONCLUSIONS: Meaning.",
  );
  assert.deepEqual(
    sections.map((section) => section.label),
    ["BACKGROUND", "METHODS", "RESULTS", "CONCLUSIONS"],
  );
});

test("keeps a one-paragraph acronym lead unstructured", () => {
  const source =
    "COVID-19: This study examines a clinical cohort and reports its findings without supplied section headings.";
  assert.deepEqual(structureAbstract(source), [
    { label: null, body: source },
  ]);
});

test("preserves a single unstructured paragraph", () => {
  const source = "One original paragraph remains one readable paragraph.";
  assert.deepEqual(structureAbstract(source), [
    { label: null, body: source },
  ]);
});

test("preserves supplied paragraph boundaries without inventing headings", () => {
  assert.deepEqual(structureAbstract("First paragraph.\n\nSecond paragraph."), [
    { label: null, body: "First paragraph." },
    { label: null, body: "Second paragraph." },
  ]);
});

test("suppresses PubMed unassigned labels and retains real labels", () => {
  const xml =
    '<Abstract><AbstractText NlmCategory="UNASSIGNED">Opening text.</AbstractText><AbstractText Label="RESULTS">Observed result.</AbstractText></Abstract>';
  assert.equal(
    abstractFromPubMedXml(xml),
    "Opening text.\n\nRESULTS: Observed result.",
  );
});

test("decodes named and numeric HTML entities", () => {
  assert.equal(
    displayText("A&amp;B &ndash; &hellip; &alpha; &eacute; &#x3B2; &#169;"),
    "A&B – … α é β ©",
  );
});

test("neutralizes spreadsheet formulas in CSV cells", () => {
  assert.equal(
    csvCell('=HYPERLINK("https://example.test")'),
    '"\'=HYPERLINK(""https://example.test"")"',
  );
  assert.equal(csvCell("  +SUM(1,2)"), '"\'  +SUM(1,2)"');
  assert.equal(csvCell("@command"), "'@command");
  assert.equal(csvCell("-2+3"), "'-2+3");
  assert.equal(csvCell("ordinary text"), "ordinary text");
});

import test from "node:test";
import assert from "node:assert/strict";
import { contributorNames, contributorIdentityKey, formatContributorNames } from "./contributorCharts.js";

test("uses only the requested credit role and deduplicates names", () => {
  const release = { artist: "Singer", songwriters: "Writer, Other & writer", producers: ["Producer", "producer"] };
  assert.deepEqual(contributorNames(release, "songwriters"), ["Writer", "Other"]);
  assert.deepEqual(contributorNames(release, "producers"), ["Producer"]);
});

test("preserves structured names and omits missing credits", () => {
  assert.deepEqual(contributorNames({ producers: [{ name: "A & B" }, "—"] }, "producers"), ["A", "B"]);
  assert.deepEqual(contributorNames({ artist: "Singer" }, "songwriters"), []);
});

test("breaks bundled contributor names across legacy and tag formats", () => {
  assert.equal(formatContributorNames('["A & B", "C; D"]'), "A & B & C & D");
  assert.deepEqual(contributorNames({ songwriters: [{ display_name: "E/F" }] }, "songwriters"), ["E", "F"]);
});

test("merges conservative spelling and formatting variants for analysis", () => {
  assert.equal(contributorIdentityKey("Beyoncé  Knowles"), "beyonceknowles");
  assert.deepEqual(
    contributorNames({ producers: "beyonce knowles, Beyoncé-Knowles, BEYONCE KNOWLES" }, "producers"),
    ["Beyoncé-Knowles"]
  );
});

test("excludes executive producer credits from producer analysis and details", () => {
  assert.deepEqual(
    contributorNames({ producers: "Executive Producer, Exec. Producer, Main Producer" }, "producers"),
    ["Main Producer"]
  );
  assert.equal(formatContributorNames("Executive Producer", "producers"), "");
});

import test from "node:test";
import assert from "node:assert/strict";
import { contributorNames } from "./contributorCharts.js";

test("uses only the requested credit role and deduplicates names", () => {
  const release = { artist: "Singer", songwriters: "Writer, Other & writer", producers: ["Producer", "producer"] };
  assert.deepEqual(contributorNames(release, "songwriters"), ["Writer", "Other"]);
  assert.deepEqual(contributorNames(release, "producers"), ["Producer"]);
});

test("preserves structured names and omits missing credits", () => {
  assert.deepEqual(contributorNames({ producers: [{ name: "A & B" }, "—"] }, "producers"), ["A & B"]);
  assert.deepEqual(contributorNames({ artist: "Singer" }, "songwriters"), []);
});

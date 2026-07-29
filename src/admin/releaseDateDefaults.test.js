import test from "node:test";
import assert from "node:assert/strict";
import { applyReleaseDateDefaults, releaseYearFromDate } from "./releaseDateDefaults.js";

test("releaseYearFromDate reads the year from a valid release date", () => {
  assert.equal(releaseYearFromDate("2026-07-29"), 2026);
  assert.equal(releaseYearFromDate("2026-07-29T12:30:00Z"), 2026);
});

test("releaseYearFromDate rejects invalid date strings", () => {
  assert.equal(releaseYearFromDate("2026-02-31"), null);
  assert.equal(releaseYearFromDate("July 2026"), null);
});

test("applyReleaseDateDefaults keeps release year authoritative from release date", () => {
  assert.deepEqual(
    applyReleaseDateDefaults({ release_date: "2025-12-05", release_year: 2024 }),
    { release_date: "2025-12-05", release_year: 2025 }
  );
});

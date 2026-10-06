import assert from "node:assert/strict";
import test from "node:test";
import { enrichPosterRecord, formatPosterRank } from "./posterData.js";

const payload = {
  months: ["June 2026", "July 2026", "August 2026"],
  full: { singles: { combined: {
    "June 2026": [{ release_id: 7, r: 4, p: 100, t: "Song", a: "Artist" }],
    "July 2026": [{ release_id: 7, r: 2, p: 200, t: "Song", a: "Artist", cover_image: "/cover.jpg" }],
    "August 2026": [],
  } } },
};

test("missing CMS aggregates fall back to published history, including the latest available rank", () => {
  const result = enrichPosterRecord("songs", { id: 7, title: "Song", current_rank: "" }, payload);
  assert.equal(result.current_rank, 2);
  assert.equal(result.peak_rank, 2);
  assert.equal(result.total_points, 300);
  assert.equal(result.months_on_chart, 2);
  assert.equal(result.cover_image, "/cover.jpg");
});

test("valid CMS stats and zero counts are preserved", () => {
  const result = enrichPosterRecord("songs", { id: 7, current_rank: 1, total_points: 0, months_on_chart: 0 }, payload);
  assert.equal(result.current_rank, 1);
  assert.equal(result.total_points, 0);
  assert.equal(result.months_on_chart, 0);
});

test("same-title releases with different IDs cannot borrow stats", () => {
  const result = enrichPosterRecord("songs", { id: 8, title: "Song", artist: "Artist" }, payload);
  assert.equal(result.current_rank, null);
  assert.equal(result.total_points, null);
});

test("rank formatting skips empty and invalid aliases", () => {
  assert.equal(formatPosterRank("", 0, "bad", "3"), "#3");
  assert.equal(formatPosterRank(null), "—");
});

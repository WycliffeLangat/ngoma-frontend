import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAutomaticCertifications,
  mergeCertifications,
} from "./automaticPublicContent.js";

const levels = [
  { level: "diamond", label: "Diamond", pts: 600 },
  { level: "platinum", label: "Platinum", pts: 400 },
  { level: "gold", label: "Gold", pts: 200 },
];

test("automatic certifications are built from cumulative points", () => {
  const rows = buildAutomaticCertifications({
    singles: [
      { t: "Hit One", a: "Artist A", totalPts: 620, best: 1 },
      { t: "Almost", a: "Artist B", totalPts: 199, best: 4 },
    ],
    albums: [
      { t: "Long Play", a: "Artist C", totalPts: 410, best: 2 },
    ],
  }, levels);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].level, "diamond");
  assert.equal(rows[0].is_official, true);
  assert.equal(rows[1].chart_type, "albums");
  assert.equal(rows[1].level, "platinum");
});

test("automatic certification points win over stale live CMS rows", () => {
  const automatic = buildAutomaticCertifications({
    singles: [{ t: "Hit One", a: "Artist A", totalPts: 620, best: 1 }],
  }, levels);
  const merged = mergeCertifications(automatic, [
    { id: 7, t: "Hit One", a: "Artist A", chart_type: "singles", level: "gold", totalPts: 210 },
  ], levels);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 7);
  assert.equal(merged[0].level, "diamond");
  assert.equal(merged[0].totalPts, 620);
  assert.equal(merged[0].is_official, true);
});

test("live CMS certifications below threshold are not published", () => {
  const merged = mergeCertifications([], [
    { id: 7, t: "Almost", a: "Artist B", chart_type: "singles", level: "gold", totalPts: 199 },
  ], levels);

  assert.equal(merged.length, 0);
});

test("stale live CMS certification levels are capped by current points", () => {
  const automatic = buildAutomaticCertifications({
    singles: [{ t: "Steady Hit", a: "Artist C", totalPts: 410, best: 2 }],
  }, levels);
  const merged = mergeCertifications(automatic, [
    { id: 8, t: "Steady Hit", a: "Artist C", chart_type: "singles", level: "diamond", totalPts: 610 },
  ], levels);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 8);
  assert.equal(merged[0].level, "platinum");
  assert.equal(merged[0].totalPts, 410);
});

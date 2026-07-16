import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAutomaticCertifications,
  buildAutomaticNews,
  mergeCertifications,
  mergeNews,
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

test("automatic news includes chart recaps and certification stories", () => {
  const news = buildAutomaticNews({
    latestMonth: "July 2026",
    singlesRows: [
      { title: "Hit One", artist: "Artist A", rank: 1, pts: 50 },
      { title: "Second Song", artist: "Artist B", rank: 2, pts: 49 },
    ],
    albumsRows: [{ title: "Long Play", artist: "Artist C", rank: 1, pts: 50 }],
    certifications: [{ t: "Hit One", a: "Artist A", chart_type: "singles", level: "diamond", totalPts: 620 }],
    levels,
    generatedAt: "2026-07-16T00:00:00Z",
  });

  assert.equal(news.length, 3);
  assert.equal(news[0].status, "published");
  assert.match(news[0].body, /generated automatically/i);
  assert.equal(news.some((item) => item.category === "certifications"), true);
});

test("live news overrides generated rows with the same slug", () => {
  const merged = mergeNews(
    [{ id: 1, slug: "auto-singles-july-2026", title: "Human headline", published_at: "2026-07-17T00:00:00Z" }],
    [{ id: "auto", slug: "auto-singles-july-2026", title: "Generated headline", published_at: "2026-07-16T00:00:00Z" }],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].title, "Human headline");
});

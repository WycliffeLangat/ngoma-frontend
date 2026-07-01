import assert from "node:assert/strict";
import test from "node:test";

import { buildArtistMonthMirror } from "./publicChartMirror.js";

const MONTH = "July 2026";
const profile = (id, name) => ({ id, name, public_name: name });
const bien = profile(1, "Bien");
const alikiba = profile(2, "Alikiba");
const scar = profile(3, "Scar");

function payload(full) {
  return {
    months: [MONTH],
    artists: [bien, alikiba, scar],
    full,
  };
}

test("Combined Artist Chart uses only Combined Singles and Albums Top 50", () => {
  const data = payload({
    singles: {
      combined: {
        [MONTH]: [
          { r: 1, p: 50, t: "Song B", release_id: 2, primary_artists: [alikiba] },
        ],
      },
      platforms: {
        "APPLE MUSIC": {
          [MONTH]: [
            { r: 1, p: 50, t: "Song A", release_id: 1, primary_artists: [bien] },
          ],
        },
      },
    },
    albums: { combined: { [MONTH]: [] }, platforms: {} },
  });

  const chart = buildArtistMonthMirror(data, MONTH, "Combined");
  assert.deepEqual(chart.map((row) => row.name), ["Alikiba"]);
  assert.equal(chart[0].points, 50);
});

test("every collaboration member receives full backend public points", () => {
  const data = payload({
    singles: {
      combined: {
        [MONTH]: [
          {
            r: 1,
            p: 50,
            t: "Finale",
            release_id: 10,
            primary_artists: [bien, alikiba],
          },
          {
            r: 10,
            p: 41,
            t: "Lifestyle",
            release_id: 11,
            primary_artists: [bien],
            featured_artist_profiles: [scar],
          },
        ],
      },
      platforms: {},
    },
    albums: { combined: { [MONTH]: [] }, platforms: {} },
  });

  const byName = new Map(
    buildArtistMonthMirror(data, MONTH, "Combined")
      .map((row) => [row.name, row.points]),
  );
  assert.equal(byName.get("Bien"), 91);
  assert.equal(byName.get("Alikiba"), 50);
  assert.equal(byName.get("Scar"), 41);
});

test("platform artist chart combines that platform's supported singles and albums", () => {
  const data = payload({
    singles: {
      combined: { [MONTH]: [] },
      platforms: {
        "APPLE MUSIC": {
          [MONTH]: [
            { r: 2, p: 49, t: "Single A", release_id: 20, primary_artists: [bien] },
            { r: 20, p: 31, t: "Single B", release_id: 21, primary_artists: [bien, alikiba] },
          ],
        },
      },
    },
    albums: {
      combined: { [MONTH]: [] },
      platforms: {
        "APPLE MUSIC": {
          [MONTH]: [
            { r: 4, p: 47, t: "Album A", release_id: 22, primary_artists: [bien] },
          ],
        },
      },
    },
  });

  const byName = new Map(
    buildArtistMonthMirror(data, MONTH, "APPLE MUSIC")
      .map((row) => [row.name, row.points]),
  );
  assert.equal(byName.get("Bien"), 127);
  assert.equal(byName.get("Alikiba"), 31);
});

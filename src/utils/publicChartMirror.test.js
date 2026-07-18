import assert from "node:assert/strict";
import test from "node:test";

import { buildArtistMonthMirror, buildYearEndMirror } from "./publicChartMirror.js";

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

test("registered duo points come only from allowed group releases", () => {
  const vestine = profile(4, "Vestine");
  const dorcas = profile(5, "Dorcas");
  const vestineDorcas = {
    id: 6,
    name: "Vestine & Dorcas",
    public_name: "Vestine & Dorcas",
    artist_type: "duo",
  };
  const data = {
    months: [MONTH],
    artists: [vestine, dorcas, vestineDorcas],
    full: {
      singles: {
        combined: {
          [MONTH]: [
            { r: 1, p: 50, t: "Emmanuel", release_id: 30, artist_credit: "Vestine & Dorcas" },
            { r: 2, p: 49, t: "Yebo (Nitawale)", release_id: 31, primary_artists: [vestineDorcas] },
          ],
        },
        platforms: {},
      },
      albums: { combined: { [MONTH]: [] }, platforms: {} },
    },
  };

  const byName = new Map(
    buildArtistMonthMirror(data, MONTH, "Combined")
      .map((row) => [row.name, row.points]),
  );
  assert.equal(byName.get("Vestine & Dorcas"), 99);
  assert.equal(byName.has("Vestine"), false);
  assert.equal(byName.has("Dorcas"), false);
});

test("unlinked text-only feature credits do not create image-less artist rows", () => {
  const clipse = { ...profile(7, "Clipse"), image: "/media/artists/clipse.jpg" };
  const pusha = { ...profile(8, "Pusha T"), image: "/media/artists/pusha-t.jpg" };
  const data = {
    months: [MONTH],
    artists: [clipse],
    full: {
      singles: { combined: { [MONTH]: [] }, platforms: {} },
      albums: {
        combined: {
          [MONTH]: [
            {
              r: 3,
              p: 48,
              t: "Let God Sort Em Out",
              release_id: 40,
              primary_artists: [clipse],
              featured_artists: "Malice & Pusha T",
              artist_credit: "Clipse ft. Malice & Pusha T",
            },
          ],
        },
        platforms: {},
      },
    },
  };

  const chartNames = buildArtistMonthMirror(data, MONTH, "Combined").map((row) => row.name);
  assert.deepEqual(chartNames, ["Clipse"]);

  const yearEndNames = buildYearEndMirror(data, "artists").map((row) => row.name);
  assert.deepEqual(yearEndNames, ["Clipse"]);

  data.artists.push(pusha);
  const namesWithProfile = buildArtistMonthMirror(data, MONTH, "Combined").map((row) => row.name);
  assert.equal(namesWithProfile.includes("Pusha T"), true);
  assert.equal(namesWithProfile.includes("Malice"), false);
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

test("Kenyan Artist Chart ranks from all regional candidates, not regional release Top 50", () => {
  const bienKe = { ...bien, country: "Kenya", country_code: "KE" };
  const scarKe = { ...scar, country: "Kenya", country_code: "KE" };
  const data = payload({
    artists: {
      regions: {
        KE: {
          [MONTH]: [
            { r: 1, p: 50, rp: 500, t: "Scar", artist_id: 3, entries_count: 1, primary_artists: [scarKe] },
            { r: 2, p: 49, rp: 100, t: "Bien", artist_id: 1, entries_count: 1, primary_artists: [bienKe] },
          ],
        },
      },
    },
    singles: {
      combined: { [MONTH]: [] },
      platforms: {},
      regions: {
        KE: {
          [MONTH]: [
            { r: 1, p: 50, rp: 100, t: "Public Song", release_id: 30, primary_artists: [bienKe] },
          ],
        },
      },
    },
    albums: { combined: { [MONTH]: [] }, platforms: {}, regions: {} },
  });
  data.artists = [bienKe, scarKe];

  const chart = buildArtistMonthMirror(data, MONTH, "Kenyan");
  assert.deepEqual(chart.map((row) => row.name), ["Scar", "Bien"]);
  assert.equal(chart[0].points, 50);
  assert.equal(chart[0].raw_points, 500);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { contributorNames, isPeopleChart } from "./contributorCharts.js";

// Exercise the production aggregators with deterministic published chart data.
const source = readFileSync(new URL("../NgomaCharts.jsx", import.meta.url), "utf8");
function section(start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
}
function chartHarness() {
  const months = ["January 2026", "February 2026"];
  const rows = {
    "January 2026": [{ title: "First", artist: "Singer", rank: 1, pts: 100, songwriters: ["Writer A"], producers: ["Producer B"], sourceChartType: "singles" }],
    "February 2026": [
      { title: "First", artist: "Singer", rank: 2, pts: 50, songwriters: ["Writer A"], producers: ["Producer B"], sourceChartType: "singles" },
      { title: "Album", artist: "Singer", rank: 1, pts: 200, songwriters: ["Writer C"], producers: ["Producer B"], sourceChartType: "albums" },
    ],
  };
  const context = vm.createContext({
    MONTHS: months, ARTIST_PLATS: ["Spotify"],
    artistChartCache: new Map(), combinedArtistsCache: new Map(),
    latestPublishedMonthLabel: () => months[1], monthIndex: (m) => months.indexOf(m),
    getArtistPlatformSource: (_p, m) => rows[m], getCombined: (_t, m) => rows[m],
    chartCreditMembers: (entry, role) => role === "artists" ? [entry.artist] : contributorNames(entry, role),
    artistTop50Points: (entry) => entry.pts, entryKey: (entry) => entry.title,
    isPeopleChart, countryCodeForRegionalScope: () => "", isAfricaRegionChart: () => false,
    isRegionalChartScope: () => false, getArtistCountry: () => ({ code: "KE", country: "Kenya" }),
    getArtistPlatformHits: () => ["Spotify"], publicArtistForName: () => null,
    embeddedArtistProfileForName: () => null, getArtistImageUrl: () => "",
    platformLabelForScope: (p) => p,
  });
  vm.runInContext([
    section("const getArtistSourceCombined =", "const defaultComparisonKey ="),
    section("const buildYearEndArtistRows =", "const combinedArtistsCache ="),
    section("const buildCombinedArtists =", "const ARTIST_PLATS ="),
    section("const aggregateArtistsForMonth =", "const buildArtistYearEndRows ="),
    "globalThis.chart = buildArtistChart; globalThis.yearEnd = buildYearEndArtistRows; globalThis.cumulative = buildCombinedArtists;",
  ].join("\n"), context);
  return { context, months };
}

test("monthly role charts keep rankings, history, and caches separate", () => {
  const { context: c, months } = chartHarness();
  const writers = c.chart(months[1], "Combined", "songwriters");
  const producers = c.chart(months[1], "Combined", "producers");
  assert.equal(writers[0].title, "Writer C");
  assert.equal(writers[0].is_new, true);
  assert.equal(writers[1].prev, 1);
  assert.equal(writers[1].months_on_chart, 2);
  assert.equal(producers.length, 1);
  assert.equal(producers[0].title, "Producer B");
  assert.equal(producers[0].pts, 250);
  assert.equal(c.chart(months[1], "Combined", "artists")[0].title, "Singer");
});

test("all-time and cumulative totals use the selected contributor credits", () => {
  const { context: c, months } = chartHarness();
  assert.equal(c.yearEnd(months, "Combined", "producers")[0].totalPts, 350);
  assert.equal(c.yearEnd([months[1]], "Combined", "songwriters")[0].t, "Writer C");
  assert.equal(c.cumulative("producers", months[1])[0].n, "Producer B");
  assert.equal(c.cumulative("producers", months[1])[0].p, 350);
  assert.equal(c.cumulative("songwriters", months[1])[0].n, "Writer C");
});

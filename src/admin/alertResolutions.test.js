import test from "node:test";
import assert from "node:assert/strict";
import { clearCmsCache } from "./api.js";
import { buildAlertCaseReview, alertResolutionInternals } from "./alertResolutions.js";

const originalFetch = globalThis.fetch;

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

function installFetch(routes, calls = []) {
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url).replace(/^\/cms/, "");
    calls.push({ path, options });
    const route = routes[path];
    if (!route) return jsonResponse({ detail: `No route for ${path}` }, 404);
    if (typeof route === "function") return route(options);
    return jsonResponse(route);
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
  clearCmsCache();
}

test("case review suggests linking a registered compound artist", async () => {
  try {
    installFetch({
      "/releases/20/": {
        id: 20,
        title: "Test Hit",
        chart_type: "singles",
        artist_display: "Vestine & Dorcas",
        primary_artist_ids: [],
        featured_artist_ids: [],
      },
    });

    const review = await buildAlertCaseReview({
      alert: { id: "audit-song-compound-artist-unlinked", title: "Songs may split a registered duo/group act" },
      detail: {
        id: 20,
        label: "Test Hit - Vestine & Dorcas",
        problem: '"Vestine & Dorcas" matches artist record "Vestine & Dorcas" (id 10)',
      },
      page: "songs",
      canApply: true,
    });

    assert.deepEqual(
      review.solutions.map((solution) => solution.id),
      ["link-compound-artist-10", "open-entry"]
    );
    assert.equal(review.solutions[0].label, "Link Vestine & Dorcas");
  } finally {
    restoreFetch();
  }
});

test("case review can apply a safe URL scheme fix", async () => {
  const calls = [];
  try {
    installFetch({
      "/artists/10/": (options) => {
        if (options.method === "PATCH") return jsonResponse({ id: 10, spotify_url: "https://spotify.com/artist" });
        return jsonResponse({ id: 10, name: "Lead Artist", spotify_url: "http://spotify.com/artist" });
      },
    }, calls);

    const review = await buildAlertCaseReview({
      alert: { id: "audit-artist-invalid-url", title: "Artist profile URLs need cleanup" },
      detail: { id: 10, label: "Lead Artist", problem: "Spotify: uses insecure http" },
      page: "artists",
      canApply: true,
    });
    const fix = review.solutions.find((solution) => solution.id === "url-https-spotify_url");
    assert.ok(fix, "expected HTTPS solution");

    const message = await fix.run();
    const patchCall = calls.find((call) => call.options.method === "PATCH");
    assert.deepEqual(JSON.parse(patchCall.options.body), {
      spotify_url: "https://spotify.com/artist",
    });
    assert.match(message, /Artists entry updated/);
  } finally {
    restoreFetch();
  }
});

test("case review can sync release year from release date", async () => {
  const calls = [];
  try {
    installFetch({
      "/releases/20/": (options) => {
        if (options.method === "PATCH") return jsonResponse({ id: 20, release_date: "2026-07-29", release_year: 2026 });
        return jsonResponse({ id: 20, title: "Test Hit", release_date: "2026-07-29", release_year: 2025 });
      },
      "/chart-entries/?release=20&page_size=500": [],
    }, calls);

    const review = await buildAlertCaseReview({
      alert: { id: "audit-song-date-questionable", title: "Song release dates need review" },
      detail: { id: 20, label: "Test Hit", problem: "Release year 2025 does not match date 2026" },
      page: "songs",
      canApply: true,
    });
    const fix = review.solutions.find((solution) => solution.id === "sync-release-year-from-date");
    assert.ok(fix, "expected release year sync solution");

    await fix.run();
    const patchCall = calls.find((call) => call.options.method === "PATCH");
    assert.deepEqual(JSON.parse(patchCall.options.body), { release_year: 2026 });
  } finally {
    restoreFetch();
  }
});

test("case review can fill country settings from country name", async () => {
  const calls = [];
  try {
    installFetch({
      "/countries/3/": (options) => {
        if (options.method === "PATCH") {
          return jsonResponse({ id: 3, name: "Angola", ...JSON.parse(options.body) });
        }
        return jsonResponse({ id: 3, name: "Angola", code: "", region: "", flag: "", display_order: null });
      },
      "/countries/?page_size=500": [],
    }, calls);

    const review = await buildAlertCaseReview({
      alert: { id: "audit-country-details-incomplete", title: "Country settings incomplete" },
      detail: { id: 3, label: "Angola", problem: "Missing: country code, region, flag/initial, display order" },
      page: "countries",
      canApply: true,
    });
    const fix = review.solutions.find((solution) => solution.id === "normalize-country");
    assert.ok(fix, "expected country normalization solution");

    await fix.run();
    const patchCall = calls.find((call) => call.options.method === "PATCH");
    assert.deepEqual(JSON.parse(patchCall.options.body), {
      code: "AO",
      region: "Africa",
      flag: "AO",
      display_order: 7,
    });
  } finally {
    restoreFetch();
  }
});

test("case review can hide a certification that no longer meets threshold", async () => {
  const calls = [];
  try {
    installFetch({
      "/certifications/7/": (options) => {
        if (options.method === "PATCH") return jsonResponse({ id: 7, is_hidden: true });
        return jsonResponse({ id: 7, level: "gold", total_points: 199, is_hidden: false });
      },
      "/certification-rules/?page_size=500": [],
    }, calls);

    const review = await buildAlertCaseReview({
      alert: { id: "audit-certification-below-threshold", title: "Certifications below threshold" },
      detail: { id: 7, label: "Almost - Artist B", problem: "199 points is below gold threshold 200" },
      page: "certifications",
      canApply: true,
    });
    const fix = review.solutions.find((solution) => solution.id === "certification-hide");
    assert.ok(fix, "expected hide certification solution");

    await fix.run();
    const patchCall = calls.find((call) => call.options.method === "PATCH");
    assert.deepEqual(JSON.parse(patchCall.options.body), { is_hidden: true });
  } finally {
    restoreFetch();
  }
});

test("case review always includes a guided solution when no automatic fix is safe", async () => {
  try {
    installFetch({
      "/artists/10/": { id: 10, name: "Lead Artist", country: "", country_code: "" },
    });

    const review = await buildAlertCaseReview({
      alert: { id: "audit-artist-details-incomplete", title: "Artist detail sections incomplete" },
      detail: { id: 10, label: "Lead Artist", problem: "Missing: country, country code, biography" },
      page: "artists",
      canApply: true,
    });
    const guided = review.solutions.find((solution) => solution.kind === "guidance");

    assert.ok(guided, "expected a guided resolution");
    assert.equal(guided.label, "Correct country fields");
    assert.deepEqual(guided.fields, ["country", "country_code", "biography"]);
    assert.ok(review.solutions.some((solution) => solution.id === "open-entry"));
  } finally {
    restoreFetch();
  }
});

test("compound artist problem parser extracts all registered artist matches", () => {
  const matches = alertResolutionInternals.compoundArtistMatches(
    '"A & B" matches artist record "A & B" (id 1); "C & D" matches artist record "C & D" (id 2)'
  );
  assert.deepEqual(matches, [
    { name: "A & B", id: 1 },
    { name: "C & D", id: 2 },
  ]);
});

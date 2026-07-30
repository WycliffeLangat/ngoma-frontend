import test from "node:test";
import assert from "node:assert/strict";
import { auditCmsRecords, mergeDashboardAudit, sanitizeDashboardAttention } from "./dataQualityAudit.js";

function alertMap(result) {
  return new Map(result.alerts.map((alert) => [alert.id, alert]));
}

function publicPayload(rows, type = "singles") {
  return {
    months: ["July 2026"],
    month_options: [{ label: "July 2026", year: 2026, month: 7 }],
    full: {
      singles: { combined: { "July 2026": type === "singles" ? rows : [] }, platforms: {}, regions: {} },
      albums: { combined: { "July 2026": type === "albums" ? rows : [] }, platforms: {}, regions: {} },
    },
  };
}

test("deep CMS audit catches media and country issues without URL alerts", () => {
  const result = auditCmsRecords({
    countries: [
      { id: 1, name: "Kenya", code: "KE", region: "East Africa", flag: "KE", display_order: 1, active: true },
      { id: 2, name: "Uganda", code: "UG", region: "East Africa", flag: "UG", display_order: 2, active: true },
    ],
    artists: [{
      id: 10,
      name: "Lead Artist",
      display_name: "Lead Artist",
      slug: "lead-artist",
      country: "Kenya",
      country_code: "KE",
      city_region: "Nairobi",
      genre: "Afropop",
      artist_type: "solo",
      biography: "Known for clean test fixtures.",
      status: "active",
      verified: true,
      spotify_url: "https://example.com/lead",
    }],
    songs: [{
      id: 20,
      title: "Test Hit",
      canonical_title: "Test Hit",
      chart_type: "singles",
      primary_artist_ids: [10],
      artist_display: "Lead Artist",
      country: "Uganda",
      country_code: "UG",
      genre: "Afropop",
      label: "Label",
      distributor: "Distributor",
      release_year: 2026,
      release_date: "2026-05-01",
      isrc: "USABC1234567",
      songwriters: "Writer",
      producers: "Producer",
      status: "active",
    }],
    albums: [],
    charts: [],
    chartUploads: [],
    weeklyUploads: [],
    certifications: [],
    certificationRules: [
      { id: 1, level: "gold", threshold: 1000, active: true },
      { id: 2, level: "platinum", threshold: 2000, active: true },
      { id: 3, level: "diamond", threshold: 3000, active: true },
    ],
    news: [],
    pageContent: [],
    media: [],
    reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, { now: "2026-07-13T00:00:00Z" });

  const alerts = alertMap(result);
  assert.ok(alerts.has("audit-artist-image-missing"));
  assert.ok(alerts.has("audit-song-cover-missing"));
  assert.ok(!alerts.has("audit-artist-invalid-url"));
  assert.match(alerts.get("audit-song-country-questionable").details[0].problem, /does not match lead artist/);
  assert.equal(result.cards.invalid_urls_detected, undefined);
  assert.equal(result.cards.missing_media_assets, 2);
});

test("deep CMS audit keeps catalogue codes and links out of dashboard alerts", () => {
  const result = auditCmsRecords({
    countries: [],
    artists: [{ id: 10, name: "Lead Artist", display_name: "Lead Artist", status: "active", spotify_url: "not-a-url" }],
    songs: [{
      id: 20,
      title: "Code Missing",
      canonical_title: "Code Missing",
      chart_type: "singles",
      primary_artist_ids: [10],
      artist_display: "Lead Artist",
      country: "Kenya",
      country_code: "KE",
      genre: "Afropop",
      label: "Label",
      distributor: "Distributor",
      release_year: 2026,
      release_date: "2026-05-01",
      isrc: "",
      spotify_url: "not-a-url",
      songwriters: "Writer",
      producers: "Producer",
      status: "active",
    }],
    albums: [{
      id: 30,
      title: "Album Code Missing",
      canonical_title: "Album Code Missing",
      chart_type: "albums",
      primary_artist_ids: [10],
      artist_display: "Lead Artist",
      country: "Kenya",
      country_code: "KE",
      genre: "Afropop",
      label: "Label",
      distributor: "Distributor",
      release_year: 2026,
      release_date: "2026-05-01",
      upc: "",
      number_of_tracks: 10,
      status: "active",
    }],
    charts: [], chartUploads: [], weeklyUploads: [], certifications: [], certificationRules: [],
    news: [{ id: 40, title: "Linked", status: "draft", source_links: '[{"url":"not-a-url"}]', gallery: '["not-a-url"]' }],
    pageContent: [], media: [{ id: 50, title: "Asset", file: "not-a-url", folder: "covers", alt_text: "Cover", usage_notes: "CMS" }],
    reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, { now: "2026-07-13T00:00:00Z" });

  const alerts = alertMap(result);
  assert.ok(!alerts.has("audit-artist-invalid-url"));
  assert.ok(!alerts.has("audit-song-invalid-url"));
  assert.ok(!alerts.has("audit-song-codes-questionable"));
  assert.ok(!alerts.has("audit-album-codes-questionable"));
  assert.ok(!alerts.has("audit-news-invalid-url"));
  assert.ok(!alerts.has("audit-news-gallery-invalid-url"));
  assert.ok(!alerts.has("audit-media-url-invalid"));
  assert.equal(result.cards.invalid_urls_detected, undefined);
});

test("dashboard attention sanitizer removes backend link and catalogue-code alerts", () => {
  const sanitized = sanitizeDashboardAttention({
    cards: { invalid_urls_detected: 3, incomplete_metadata: 2 },
    alerts: [
      {
        id: "release-metadata-completeness",
        title: "Release metadata incomplete",
        message: "Some releases need attention.",
        details: [
          { id: 1, label: "Song A", problem: "Missing: ISRC" },
          { id: 2, label: "Song B", problem: "Missing: genre" },
        ],
      },
      {
        id: "artist-invalid-url",
        title: "Artist URLs need cleanup",
        message: "Profile links are invalid.",
        details: [{ id: 3, label: "Artist", problem: "Spotify: missing https" }],
      },
    ],
  });

  assert.equal(sanitized.cards.invalid_urls_detected, undefined);
  assert.equal(sanitized.cards.incomplete_metadata, 2);
  assert.equal(sanitized.alerts.length, 1);
  assert.equal(sanitized.alerts[0].details.length, 1);
  assert.equal(sanitized.alerts[0].details[0].problem, "Missing: genre");
});

test("deep CMS audit scopes release and credited artist alerts to public Top 50 releases", () => {
  const baseArtist = {
    display_name: "",
    slug: "",
    country: "Kenya",
    country_code: "KE",
    city_region: "",
    genre: "",
    artist_type: "",
    biography: "",
    status: "active",
  };
  const baseRelease = {
    canonical_title: "",
    chart_type: "singles",
    country: "",
    country_code: "",
    genre: "",
    label: "",
    distributor: "",
    release_year: 2026,
    status: "active",
  };
  const result = auditCmsRecords({
    countries: [{ id: 1, name: "Kenya", code: "KE", region: "East Africa", flag: "KE", display_order: 1, active: true }],
    artists: [
      { ...baseArtist, id: 10, name: "Charted Artist" },
      { ...baseArtist, id: 11, name: "Uncharted Artist" },
    ],
    songs: [
      { ...baseRelease, id: 20, title: "Public Hit", primary_artist_ids: [10], artist_display: "Charted Artist" },
      { ...baseRelease, id: 21, title: "Catalogue Cut", primary_artist_ids: [11], artist_display: "Uncharted Artist" },
    ],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [], certifications: [],
    certificationRules: [
      { id: 1, level: "gold", threshold: 1000, active: true },
      { id: 2, level: "platinum", threshold: 2000, active: true },
      { id: 3, level: "diamond", threshold: 3000, active: true },
    ],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, {
    now: "2026-07-13T00:00:00Z",
    publicReleasesOnly: true,
    publicPayload: publicPayload([{ r: 1, t: "Public Hit", a: "Charted Artist", release_id: 20 }]),
  });

  const alerts = alertMap(result);
  assert.equal(alerts.get("audit-song-cover-missing").total, 1);
  assert.equal(alerts.get("audit-song-cover-missing").details[0].id, 20);
  assert.equal(alerts.get("audit-artist-image-missing").total, 1);
  assert.equal(alerts.get("audit-artist-image-missing").details[0].id, 10);
  assert.ok(!alerts.get("audit-song-details-incomplete").details.some((detail) => detail.id === 21));
  assert.equal(result.coverage.releaseAuditScope, "public-top-50");
  assert.equal(result.coverage.publicTop50Releases, 1);
});

test("duplicate audit scans the full catalogue even when release metadata is Top 50 scoped", () => {
  const result = auditCmsRecords({
    countries: [],
    artists: [],
    songs: [
      { id: 20, title: "Nimeweza", chart_type: "singles", artist_display: "Artist A", status: "active" },
      { id: 21, title: "Nimewezza", chart_type: "singles", artist_display: "Artist A", status: "active" },
    ],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [], certifications: [], certificationRules: [],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, {
    now: "2026-07-13T00:00:00Z",
    publicReleasesOnly: true,
    publicPayload: publicPayload([{ r: 1, t: "Public Hit", a: "Charted Artist", release_id: 999 }]),
  });

  const alerts = alertMap(result);
  const duplicateAlert = alerts.get("audit-song-duplicate-title");
  assert.equal(duplicateAlert.page, "duplicate-review");
  assert.equal(duplicateAlert.total, 1);
  assert.match(duplicateAlert.details[0].problem, /near title spelling/i);
  assert.ok(!alerts.has("audit-song-cover-missing"), "non-Top-50 release metadata should remain scoped out");
});

test("duplicate audit catches full-catalog artist aliases beyond public charted artists", () => {
  const result = auditCmsRecords({
    countries: [],
    artists: [
      { id: 10, name: "Fik Fameica", display_name: "Fik Fameica", aliases: ["Fresh Bwoy"], status: "active" },
      { id: 11, name: "Fresh Bwoy", display_name: "Fresh Bwoy", status: "active" },
    ],
    songs: [],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [], certifications: [], certificationRules: [],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, {
    now: "2026-07-13T00:00:00Z",
    publicReleasesOnly: true,
    publicPayload: publicPayload([{ r: 1, t: "Public Hit", a: "Charted Artist", release_id: 999 }]),
  });

  const duplicateAlert = alertMap(result).get("audit-artist-duplicate-name");
  assert.equal(duplicateAlert.page, "duplicate-review");
  assert.equal(duplicateAlert.total, 1);
  assert.match(duplicateAlert.details[0].problem, /alias|artist name/i);
});

test("deep CMS audit can match public Top 50 releases by title and artist when release id is absent", () => {
  const result = auditCmsRecords({
    countries: [{ id: 1, name: "Kenya", code: "KE", region: "East Africa", flag: "KE", display_order: 1, active: true }],
    artists: [],
    songs: [{
      id: 20,
      title: "Legacy Hit",
      chart_type: "singles",
      artist_display: "Legacy Artist",
      status: "active",
    }],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [], certifications: [], certificationRules: [],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, {
    now: "2026-07-13T00:00:00Z",
    publicReleasesOnly: true,
    publicPayload: publicPayload([{ r: 7, t: "Legacy Hit", a: "Legacy Artist" }]),
  });

  const alert = alertMap(result).get("audit-song-cover-missing");
  assert.equal(alert.total, 1);
  assert.equal(alert.details[0].id, 20);
});

test("dashboard merge filters backend release alerts to public Top 50 releases", () => {
  const audit = auditCmsRecords({
    countries: [], artists: [],
    songs: [
      { id: 20, title: "Public Hit", chart_type: "singles", artist_display: "Charted Artist", status: "active" },
      { id: 21, title: "Catalogue Cut", chart_type: "singles", artist_display: "Uncharted Artist", status: "active" },
    ],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [], certifications: [], certificationRules: [],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, {
    now: "2026-07-13T00:00:00Z",
    publicReleasesOnly: true,
    publicPayload: publicPayload([{ r: 1, t: "Public Hit", a: "Charted Artist", release_id: 20 }]),
  });

  const merged = mergeDashboardAudit({
    cards: {},
    alerts: [{
      id: "releases-missing-country",
      module: "releases",
      level: "warning",
      title: "Release countries missing",
      details: [
        { id: 20, label: "Public Hit", problem: "Missing country" },
        { id: 21, label: "Catalogue Cut", problem: "Missing country" },
      ],
    }],
  }, audit);

  const releaseAlert = merged.alerts.find((alert) => alert.id === "releases-missing-country");
  assert.equal(releaseAlert.total, 1);
  assert.equal(releaseAlert.details[0].id, 20);
});

test("deep CMS audit flags a registered duo credited as unlinked free text", () => {
  const baseArtist = {
    id: 10,
    name: "Vestine & Dorcas",
    display_name: "Vestine & Dorcas",
    slug: "vestine-and-dorcas",
    country: "Rwanda",
    country_code: "RW",
    city_region: "Kigali",
    genre: "Gospel",
    artist_type: "group",
    biography: "Duo act.",
    status: "active",
    verified: true,
  };
  const result = auditCmsRecords({
    countries: [{ id: 1, name: "Rwanda", code: "RW", region: "East Africa", flag: "RW", display_order: 1, active: true }],
    artists: [baseArtist],
    songs: [{
      id: 20,
      title: "Test Hit",
      canonical_title: "Test Hit",
      chart_type: "singles",
      // No primary_artist_ids: the duo's name was typed as free text instead
      // of linking the single "Vestine & Dorcas" artist record above.
      artist_display: "Vestine & Dorcas",
      country: "Rwanda",
      country_code: "RW",
      genre: "Gospel",
      label: "Label",
      distributor: "Distributor",
      release_year: 2026,
      release_date: "2026-05-01",
      isrc: "USABC1234567",
      songwriters: "Writer",
      producers: "Producer",
      status: "active",
    }],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [], certifications: [], certificationRules: [],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, { now: "2026-07-13T00:00:00Z" });

  const alert = alertMap(result).get("audit-song-compound-artist-unlinked");
  assert.ok(alert, "expected the compound-artist alert to fire");
  assert.match(alert.details[0].problem, /Vestine & Dorcas.*matches artist record "Vestine & Dorcas".*id 10/);
});

test("deep CMS audit does not flag a genuine two-artist collab", () => {
  const result = auditCmsRecords({
    countries: [],
    artists: [
      { id: 10, name: "Solo Artist One", display_name: "Solo Artist One", status: "active" },
      { id: 11, name: "Solo Artist Two", display_name: "Solo Artist Two", status: "active" },
    ],
    songs: [{
      id: 20,
      title: "Collab Hit",
      canonical_title: "Collab Hit",
      chart_type: "singles",
      primary_artist_ids: [10],
      featured_artist_ids: [11],
      artist_display: "Solo Artist One & Solo Artist Two",
      status: "active",
    }],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [], certifications: [], certificationRules: [],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, { now: "2026-07-13T00:00:00Z" });

  assert.ok(!alertMap(result).has("audit-song-compound-artist-unlinked"));
});

test("deep CMS audit ignores hidden certifications below threshold", () => {
  const baseRecords = {
    countries: [],
    artists: [],
    songs: [{ id: 20, title: "Almost", chart_type: "singles", artist_display: "Artist B", status: "active" }],
    albums: [],
    charts: [],
    chartUploads: [],
    weeklyUploads: [],
    certificationRules: [{ id: 1, level: "gold", threshold: 200, active: true }],
    news: [],
    pageContent: [],
    media: [],
    reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  };

  const visible = auditCmsRecords({
    ...baseRecords,
    certifications: [{ id: 1, release: 20, release_id: 20, level: "gold", total_points: 199, is_hidden: false }],
  }, { now: "2026-07-13T00:00:00Z" });
  const hidden = auditCmsRecords({
    ...baseRecords,
    certifications: [{ id: 1, release: 20, release_id: 20, level: "gold", total_points: 199, is_hidden: true }],
  }, { now: "2026-07-13T00:00:00Z" });

  assert.ok(alertMap(visible).has("audit-certification-below-threshold"));
  assert.ok(!alertMap(hidden).has("audit-certification-below-threshold"));
});

test("dashboard merge removes stale backend certification threshold alert when audit finds no visible issue", () => {
  const audit = auditCmsRecords({
    countries: [],
    artists: [],
    songs: [{ id: 20, title: "Almost", chart_type: "singles", artist_display: "Artist B", status: "active" }],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [],
    certifications: [{ id: 1, release: 20, release_id: 20, level: "gold", total_points: 199, is_hidden: true }],
    certificationRules: [{ id: 1, level: "gold", threshold: 200, active: true }],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, { now: "2026-07-13T00:00:00Z" });

  const merged = mergeDashboardAudit({
    cards: {},
    alerts: [{
      id: "certifications-below-threshold",
      title: "Certifications fall below their threshold",
      module: "certifications",
      page: "certifications",
      level: "error",
      details: [{ id: 1, label: "Almost", problem: "199 points" }],
    }],
  }, { ...audit, loadWarnings: [] });

  const alerts = alertMap(merged);
  assert.ok(!alerts.has("certifications-below-threshold"));
  assert.ok(!alerts.has("audit-certification-below-threshold"));
});

test("dashboard merge replaces backend certification threshold alert with actionable audit alert", () => {
  const audit = auditCmsRecords({
    countries: [],
    artists: [],
    songs: [{ id: 20, title: "Almost", chart_type: "singles", artist_display: "Artist B", status: "active" }],
    albums: [],
    charts: [], chartUploads: [], weeklyUploads: [],
    certifications: [{ id: 1, release: 20, release_id: 20, level: "gold", total_points: 199, is_hidden: false }],
    certificationRules: [{ id: 1, level: "gold", threshold: 200, active: true }],
    news: [], pageContent: [], media: [], reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, { now: "2026-07-13T00:00:00Z" });

  const merged = mergeDashboardAudit({
    cards: {},
    alerts: [{
      id: "certifications-below-threshold",
      title: "Certifications fall below their threshold",
      module: "certifications",
      page: "certifications",
      level: "error",
      details: [{ id: 1, label: "Almost", problem: "199 points" }],
    }],
  }, { ...audit, loadWarnings: [] });

  const alerts = alertMap(merged);
  assert.ok(!alerts.has("certifications-below-threshold"));
  assert.ok(alerts.has("audit-certification-below-threshold"));
});

test("deep CMS audit flags expected monthly chart uploads", () => {
  const result = auditCmsRecords({
    charts: [],
    chartUploads: [],
    countries: [],
    artists: [],
    songs: [],
    albums: [],
    weeklyUploads: [],
    certifications: [],
    certificationRules: [
      { id: 1, level: "gold", threshold: 1000, active: true },
      { id: 2, level: "platinum", threshold: 2000, active: true },
      { id: 3, level: "diamond", threshold: 3000, active: true },
    ],
    news: [],
    pageContent: [],
    media: [],
    reports: [],
    backups: [{ id: 1, status: "success", file: "backup.zip", created_at: "2026-07-12T00:00:00Z" }],
  }, { now: "2026-07-13T00:00:00Z" });

  const uploadAlert = alertMap(result).get("audit-chart-upload-needed");
  assert.equal(uploadAlert.total, 2);
  assert.match(uploadAlert.message, /June 2026/);
  assert.equal(result.cards.chart_uploads_needed, 2);
});

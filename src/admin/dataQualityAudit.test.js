import test from "node:test";
import assert from "node:assert/strict";
import { auditCmsRecords } from "./dataQualityAudit.js";

function alertMap(result) {
  return new Map(result.alerts.map((alert) => [alert.id, alert]));
}

test("deep CMS audit catches media, URL, and country issues", () => {
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
  assert.ok(alerts.has("audit-artist-invalid-url"));
  assert.match(alerts.get("audit-song-country-questionable").details[0].problem, /does not match lead artist/);
  assert.equal(result.cards.invalid_urls_detected, 1);
  assert.equal(result.cards.missing_media_assets, 2);
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

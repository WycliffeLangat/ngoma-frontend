import test from "node:test";
import assert from "node:assert/strict";
import {
  bestDetailUrl,
  detailLinkEntries,
  normalizeDetailUrl,
  urlMatchesPlatform,
} from "./detailLinks.js";

test("normalizes valid public detail URLs", () => {
  assert.equal(normalizeDetailUrl("http://open.spotify.com/artist/123"), "https://open.spotify.com/artist/123");
  assert.equal(normalizeDetailUrl("music.apple.com/ke/album/test/123"), "https://music.apple.com/ke/album/test/123");
  assert.equal(normalizeDetailUrl("Spotify: https://open.spotify.com/track/abc."), "https://open.spotify.com/track/abc");
});

test("rejects placeholders and wrong-platform links", () => {
  assert.equal(normalizeDetailUrl("N/A"), "");
  assert.equal(urlMatchesPlatform("https://youtube.com/watch?v=1", "spotify"), false);
  assert.equal(bestDetailUrl({ spotify_url: "https://youtube.com/watch?v=1" }, "spotify"), "");
});

test("recovers correct platform links from alternate link fields", () => {
  const links = {
    spotify_url: "https://youtube.com/watch?v=video",
    youtube_url: "https://open.spotify.com/track/song",
    social_links: {
      youtube: "https://music.youtube.com/watch?v=video",
    },
  };

  assert.equal(bestDetailUrl(links, "spotify"), "https://open.spotify.com/track/song");
  assert.equal(bestDetailUrl(links, "youtube"), "https://music.youtube.com/watch?v=video");
});

test("uses canonical release links when row snapshots are bad", () => {
  const links = {
    spotify_url: "not-a-url",
    canonical_release: {
      spotify_url: "https://open.spotify.com/album/canonical",
    },
  };

  assert.equal(bestDetailUrl(links, "spotify"), "https://open.spotify.com/album/canonical");
});

test("detail link entries only include clean platform links once", () => {
  const entries = detailLinkEntries({
    spotify_url: "open.spotify.com/artist/abc",
    apple_music_url: "none",
    youtube_url: "https://example.com/watch",
    website_url: "https://artist.example",
  });

  assert.deepEqual(entries.map((entry) => [entry.label, entry.url]), [
    ["Spotify", "https://open.spotify.com/artist/abc"],
    ["Website", "https://artist.example/"],
  ]);
});

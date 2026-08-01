import assert from "node:assert/strict";
import test from "node:test";

import { getNewsMedia } from "./newsMedia.js";

const artists = [
  { id: 1, name: "Linked Artist", image: "/media/artists/linked-artist.jpg" },
  { id: 2, name: "Other Artist", image: "/media/artists/other-artist.jpg" },
];

test("news media ignores source images that are not explicitly linked to the article", () => {
  const media = getNewsMedia({
    title: "Linked Song leads the chart",
    excerpt: "The story mentions Other Song and Other Artist in passing.",
    related_release: 7,
    related_release_title: "Linked Song",
    related_artist: 1,
    media: [
      { kind: "release_cover", entity_id: 7, title: "Linked Song", url: "/media/covers/linked-song.jpg" },
      { kind: "release_cover", entity_id: 8, title: "Other Song", url: "/media/covers/other-song.jpg" },
      { kind: "artist_image", entity_id: 2, title: "Other Artist", url: "/media/artists/other-artist.jpg" },
      { kind: "gallery", url: "/media/news/context.jpg", caption: "Context image" },
    ],
  }, artists);

  const urls = media.map((item) => item.url);
  assert.ok(urls.includes("/media/covers/linked-song.jpg"));
  assert.ok(urls.includes("/media/artists/linked-artist.jpg"));
  assert.ok(urls.includes("/media/news/context.jpg"));
  assert.ok(!urls.includes("/media/covers/other-song.jpg"));
  assert.ok(!urls.includes("/media/artists/other-artist.jpg"));
});

test("news media does not invent fallback images from text mentions", () => {
  const media = getNewsMedia({
    title: "Other Artist returns to the conversation",
    excerpt: "This article has no linked artist, release, article cover, or gallery.",
  }, artists);

  assert.equal(media.length, 0);
});

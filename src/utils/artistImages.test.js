import assert from "node:assert/strict";
import test from "node:test";

import { artistAliasValues, getArtistImageUrl } from "./artistImages.js";

test("artist image resolver honors direct image files on artist entries", () => {
  const url = getArtistImageUrl(
    {
      title: "Malice",
      type: "artist",
      is_artist_entry: true,
      release_id: 42,
      image: "/media/artists/malice.jpg",
    },
    { name: "Malice", isArtist: true }
  );

  assert.equal(url, "/media/artists/malice.jpg");
});

test("artist image resolver still rejects release artwork as artist image", () => {
  const url = getArtistImageUrl(
    {
      title: "Song Title",
      artist: "Artist Name",
      release_id: 42,
      cover_image: "/media/releases/song.jpg",
    },
    { name: "Artist Name" }
  );

  assert.equal(url, "");
});

test("artistAliasValues parses JSON and pipe-delimited aliases", () => {
  assert.deepEqual(artistAliasValues('["Pusha T","King Push"]'), ["Pusha T", "King Push"]);
  assert.deepEqual(artistAliasValues("Malice|No Malice"), ["Malice", "No Malice"]);
});

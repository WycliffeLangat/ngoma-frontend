import test from "node:test";
import assert from "node:assert/strict";
import { enrichBiographyForArtist, fallbackBiographyForArtist } from "./artistMetadataFallbacks.js";

test("fallback artist biography uses available profile metadata", () => {
  const bio = fallbackBiographyForArtist({
    name: "Test Artist",
    country: "Kenya",
    cityRegion: "Nairobi",
    genre: "Afropop",
    artistType: "solo",
    aliases: ["Alias One", "Alias Two"],
    verified: true,
    releaseTitles: ["First Song", "Second Song"],
  });

  assert.match(bio, /Test Artist is a solo artist from Nairobi, Kenya working in Afropop\./);
  assert.match(bio, /They are also credited as Alias One and Alias Two\./);
  assert.match(bio, /releases including First Song and Second Song\./);
  assert.match(bio, /verified artist profile\./);
  assert.doesNotMatch(bio, /Top-?50|placements across|monthly platform/i);
});

test("existing artist biography is enriched without replacing it", () => {
  const bio = enrichBiographyForArtist("Known for clean melodies.", {
    name: "Clean Artist",
    genre: "Bongo Flava",
    releaseTitles: ["Bright Song"],
  });

  assert.ok(bio.startsWith("Known for clean melodies."));
  assert.match(bio, /Bright Song/);
});

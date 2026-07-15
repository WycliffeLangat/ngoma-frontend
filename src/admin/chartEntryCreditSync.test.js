import assert from "node:assert/strict";
import test from "node:test";
import {
  creditTextMentions,
  releaseFeaturedArtistsText,
  rewriteCreditText,
} from "./chartEntryCreditSync.js";

test("releaseFeaturedArtistsText prefers structured artist links over free text", () => {
  const release = {
    featured_artist_profiles: [{ name: "JAZZWRLD" }],
    featured_artists: "Jazzworx",
  };
  assert.equal(releaseFeaturedArtistsText(release), "JAZZWRLD");
});

test("releaseFeaturedArtistsText falls back to free text when unlinked", () => {
  const release = { featured_artist_profiles: [], featured_artists: "Jazzworx" };
  assert.equal(releaseFeaturedArtistsText(release), "Jazzworx");
});

test("releaseFeaturedArtistsText joins multiple structured names with commas and &", () => {
  const release = {
    featured_artist_profiles: [{ name: "A" }, { name: "B" }, { name: "C" }],
  };
  assert.equal(releaseFeaturedArtistsText(release), "A, B & C");
});

test("creditTextMentions finds a name regardless of separator style", () => {
  assert.equal(creditTextMentions("Jazzworx & Nyashinski", ["Jazzworx"]), true);
  assert.equal(creditTextMentions("Nyashinski ft. Jazzworx", ["Jazzworx"]), true);
  assert.equal(creditTextMentions("Nyashinski, Bien", ["Jazzworx"]), false);
});

test("rewriteCreditText removes a merged/deleted artist while preserving co-features", () => {
  // The exact bug report: Jazzworx removed from "Isaka (6am)" after being
  // merged into JAZZWRLD — the other featured artist must stay intact.
  assert.equal(rewriteCreditText("Jazzworx & Nyashinski", ["Jazzworx"], null), "Nyashinski");
  assert.equal(rewriteCreditText("Jazzworx", ["Jazzworx"], null), "");
});

test("rewriteCreditText swaps a merged artist's name for the keeper's", () => {
  assert.equal(rewriteCreditText("Jazzworx & Nyashinski", ["Jazzworx"], "JAZZWRLD"), "JAZZWRLD & Nyashinski");
});

test("rewriteCreditText de-duplicates when the keeper is already credited", () => {
  assert.equal(rewriteCreditText("Jazzworx & JAZZWRLD", ["Jazzworx"], "JAZZWRLD"), "JAZZWRLD");
});

test("rewriteCreditText matches any known name variant", () => {
  assert.equal(rewriteCreditText("Jazz Worx, Bien", ["Jazzworx", "Jazz Worx"], null), "Bien");
});

test("rewriteCreditText leaves unrelated credit text untouched", () => {
  assert.equal(rewriteCreditText("Nyashinski & Bien", ["Jazzworx"], null), "Nyashinski & Bien");
});

// Regression: deleting/merging an unrelated artist ("Dorcas", solo) whose
// name happens to be a word inside a registered duo's own name ("Vestine &
// Dorcas") must never touch the duo's credit — otherwise the duo's name
// gets torn apart and its other half gets replaced/dropped on every release
// where the unrelated solo artist is genuinely credited, which is exactly
// how "Vestine & Dorcas" ended up wrongly attached to unrelated releases.
test("creditTextMentions does not match inside a registered duo's own name", () => {
  const registeredKeys = new Set(["vestine & dorcas"]);
  assert.equal(creditTextMentions("Vestine & Dorcas", ["Dorcas"], registeredKeys), false);
  // Without the registered-name guard this would incorrectly match "Dorcas".
  assert.equal(creditTextMentions("Vestine & Dorcas", ["Dorcas"]), true);
});

test("rewriteCreditText leaves a registered duo's credit fully intact", () => {
  const registeredKeys = new Set(["vestine & dorcas"]);
  assert.equal(rewriteCreditText("Vestine & Dorcas", ["Dorcas"], "Some Keeper", registeredKeys), "Vestine & Dorcas");
  assert.equal(rewriteCreditText("Vestine & Dorcas", ["Dorcas"], null, registeredKeys), "Vestine & Dorcas");
});

test("rewriteCreditText still fixes a genuine mention of the registered duo itself, even alongside another feature", () => {
  const registeredKeys = new Set(["vestine & dorcas"]);
  assert.equal(rewriteCreditText("Vestine & Dorcas, Bien", ["Vestine & Dorcas"], "New Duo Name", registeredKeys), "New Duo Name & Bien");
});

test("rewriteCreditText protects a registered duo even when listed alongside another feature", () => {
  // The duo is one of two credited entries here — the unrelated "Dorcas"
  // deletion must still leave "Vestine & Dorcas" completely untouched.
  const registeredKeys = new Set(["vestine & dorcas"]);
  assert.equal(rewriteCreditText("Vestine & Dorcas, Bien", ["Dorcas"], null, registeredKeys), "Vestine & Dorcas & Bien");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  artistNameVariants,
  clearDeletedArtistNames,
  isDeletedArtistName,
  recordDeletedArtistNames,
} from "./deletedArtistNames.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test("a deleted artist name is tombstoned and stays tombstoned", () => {
  const storage = new MemoryStorage();
  recordDeletedArtistNames(["Dorcas"], storage);
  assert.equal(isDeletedArtistName("Dorcas", storage), true);
  assert.equal(isDeletedArtistName(" dorcas ", storage), true, "lookup is case/whitespace insensitive");
  assert.equal(isDeletedArtistName("Vestine", storage), false);
});

test("creating a genuinely new artist record clears its tombstone", () => {
  const storage = new MemoryStorage();
  recordDeletedArtistNames(["Dorcas"], storage);
  assert.equal(isDeletedArtistName("Dorcas", storage), true);

  clearDeletedArtistNames(["Dorcas"], storage);
  assert.equal(isDeletedArtistName("Dorcas", storage), false);
});

test("artistNameVariants collects name, display_name, public_name, and aliases", () => {
  const artist = {
    name: "Dorcas",
    display_name: "Dorcas M.",
    aliases: ["DeeDee", "D-Cas"],
  };
  assert.deepEqual(artistNameVariants(artist), ["Dorcas", "Dorcas M.", "DeeDee", "D-Cas"]);
});

test("artistNameVariants parses JSON-string aliases", () => {
  const artist = { name: "Dorcas", aliases: '["DeeDee"]' };
  assert.deepEqual(artistNameVariants(artist), ["Dorcas", "DeeDee"]);
});

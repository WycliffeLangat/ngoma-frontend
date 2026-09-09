import test from "node:test";
import assert from "node:assert/strict";
import { fuzzyMatchScore } from "./search.js";
test("search ranks exact names ahead of prefixes and metadata", () => {
  assert.ok(fuzzyMatchScore("Sauti Sol", "sauti sol") > fuzzyMatchScore("Sauti Sol Kenya Afro pop", "sauti sol"));
});
test("search handles accents, punctuation and mixed case", () => {
  assert.equal(fuzzyMatchScore("Beyoncé — Halo", "BEYONCE halo"), 200);
});
test("search tolerates a typo but requires every query term", () => {
  assert.ok(fuzzyMatchScore("Sauti Sol", "sauti soll") > 0);
  assert.equal(fuzzyMatchScore("Sauti Sol", "sauti completelyunrelated"), 0);
});
test("empty and punctuation-only queries never match", () => {
  assert.equal(fuzzyMatchScore("Sauti Sol", "!!!"), 0);
  assert.equal(fuzzyMatchScore("", "sauti"), 0);
});

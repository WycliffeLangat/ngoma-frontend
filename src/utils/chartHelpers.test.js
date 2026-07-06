import assert from "node:assert/strict";
import test from "node:test";

import { mv, resolveMovementFromHistory } from "./chartHelpers.js";

test("published month history overrides stale backend re-entry values", () => {
  const resolved = resolveMovementFromHistory({
    historyAvailable: true,
    appearedBefore: true,
    appearedPreviousMonth: true,
    previousRank: 1,
    backendPrevRank: null,
    backendLastMonth: "—",
    backendMovement: "re-entry",
  });

  assert.equal(resolved.prev, 1);
  assert.equal(resolved.lastMonth, 1);
  assert.equal(resolved.isNew, false);
  assert.equal(resolved.reentry, false);
  assert.equal(resolved.movement, undefined);
  assert.deepEqual(mv({ rank: 3, ...resolved }), { t: "down", v: 2 });
});

test("history distinguishes re-entries from genuinely new releases", () => {
  const reentry = resolveMovementFromHistory({
    historyAvailable: true,
    appearedBefore: true,
    appearedPreviousMonth: false,
  });
  const newEntry = resolveMovementFromHistory({
    historyAvailable: true,
    appearedBefore: false,
    appearedPreviousMonth: false,
  });

  assert.deepEqual(
    {
      prev: reentry.prev,
      isNew: reentry.isNew,
      reentry: reentry.reentry,
      movement: reentry.movement,
    },
    { prev: null, isNew: false, reentry: true, movement: "reentry" },
  );
  assert.deepEqual(
    {
      prev: newEntry.prev,
      isNew: newEntry.isNew,
      reentry: newEntry.reentry,
      movement: newEntry.movement,
    },
    { prev: null, isNew: true, reentry: false, movement: "new" },
  );
});

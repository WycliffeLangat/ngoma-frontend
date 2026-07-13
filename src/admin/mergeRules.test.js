import assert from "node:assert/strict";
import test from "node:test";
import {
  findStoredMergeRulePlan,
  loadMergeRules,
  rememberMergeRules,
} from "./mergeRules.js";

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

test("stored release merge rule matches future typo variant", () => {
  const storage = new MemoryStorage();
  const keeper = {
    id: 10,
    _type: "release",
    _chartType: "singles",
    title: "Kisasi",
    artist_display: "Amani",
  };
  const duplicate = {
    id: 11,
    _type: "release",
    _chartType: "singles",
    title: "Kisassi",
    artist_display: "Amani",
  };

  rememberMergeRules({
    kind: "release",
    chartType: "singles",
    keeper,
    duplicates: [duplicate],
  }, storage);

  const rules = loadMergeRules(storage);
  const futureKeeper = { ...keeper, id: 210 };
  const futureDuplicate = { ...duplicate, id: 211 };
  const plan = findStoredMergeRulePlan([futureDuplicate, futureKeeper], rules);

  assert.equal(plan.keeper.id, 210);
  assert.deepEqual(plan.duplicates.map((row) => row.id), [211]);
});

test("exact-key release rule needs original keeper id to avoid guessing", () => {
  const storage = new MemoryStorage();
  const keeper = {
    id: 10,
    _type: "release",
    _chartType: "singles",
    title: "Nairobi",
    artist_display: "Amani",
  };
  const duplicate = {
    id: 11,
    _type: "release",
    _chartType: "singles",
    title: "Nairobi",
    artist_display: "Amani",
  };

  rememberMergeRules({
    kind: "release",
    chartType: "singles",
    keeper,
    duplicates: [duplicate],
  }, storage);

  const rules = loadMergeRules(storage);
  const unresolved = findStoredMergeRulePlan([
    { ...keeper, id: 210 },
    { ...duplicate, id: 211 },
  ], rules);
  assert.equal(unresolved, null);

  const resolved = findStoredMergeRulePlan([
    keeper,
    { ...duplicate, id: 211 },
  ], rules);
  assert.equal(resolved.keeper.id, 10);
  assert.deepEqual(resolved.duplicates.map((row) => row.id), [211]);
});

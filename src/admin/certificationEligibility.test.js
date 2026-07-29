import assert from "node:assert/strict";
import test from "node:test";

import {
  certificationLevelForPoints,
  enforceCertificationEligibility,
  normalizeCertificationRules,
} from "./certificationEligibility.js";

const rules = [
  { level: "diamond", threshold: 600, active: true },
  { level: "platinum", threshold: 400, active: true },
  { level: "gold", threshold: 200, active: true },
];

test("certification level is the highest active threshold reached by points", () => {
  assert.equal(certificationLevelForPoints(620, rules), "diamond");
  assert.equal(certificationLevelForPoints(410, rules), "platinum");
  assert.equal(certificationLevelForPoints(200, rules), "gold");
  assert.equal(certificationLevelForPoints(199, rules), null);
});

test("below-threshold certifications are forced hidden", () => {
  const result = enforceCertificationEligibility({
    level: "gold",
    total_points: 199,
    is_hidden: false,
  }, rules);

  assert.equal(result.eligibleLevel, null);
  assert.equal(result.record.is_hidden, true);
  assert.equal(result.changed, true);
});

test("eligible certifications are downgraded to the points-qualified level", () => {
  const result = enforceCertificationEligibility({
    level: "diamond",
    total_points: 410,
    is_hidden: false,
  }, rules);

  assert.equal(result.eligibleLevel, "platinum");
  assert.equal(result.record.level, "platinum");
  assert.equal(result.record.is_hidden, false);
});

test("inactive rules are ignored when normalizing certification thresholds", () => {
  const normalized = normalizeCertificationRules([
    { level: "diamond", threshold: 600, active: false },
    { level: "gold", threshold: 250, active: true },
  ]);

  assert.deepEqual(normalized, [{ level: "gold", threshold: 250, active: true }]);
});

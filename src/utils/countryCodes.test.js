import assert from "node:assert/strict";
import test from "node:test";

import { buildCountryCodeIndex, countryCodeForName, normalizeCountryName } from "./countryCodes.js";

test("country code lookup resolves standard country names and aliases", () => {
  assert.equal(countryCodeForName("Kenya"), "KE");
  assert.equal(countryCodeForName("Uganda"), "UG");
  assert.equal(countryCodeForName("United States"), "US");
  assert.equal(countryCodeForName("USA"), "US");
  assert.equal(countryCodeForName("UK"), "GB");
  assert.equal(countryCodeForName("Cote d'Ivoire"), "CI");
});

test("country code lookup includes configured CMS countries", () => {
  const index = buildCountryCodeIndex([
    { name: "Testland", code: "TL" },
    { country: "Example Republic", country_code: "ER" },
  ]);

  assert.equal(index.codeForCountry("Testland"), "TL");
  assert.equal(index.codeForCountry("example republic"), "ER");
});

test("country profile lookup fills consistent country defaults", () => {
  const index = buildCountryCodeIndex();
  assert.deepEqual(index.profileForCountry("Angola"), {
    name: "Angola",
    code: "AO",
    region: "Africa",
    flag: "AO",
    display_order: 7,
  });
});

test("country name normalization ignores accents and punctuation", () => {
  assert.equal(normalizeCountryName("Cote d'Ivoire"), normalizeCountryName("Cote d Ivoire"));
});

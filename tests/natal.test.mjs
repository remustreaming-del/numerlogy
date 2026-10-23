import test from "node:test";
import assert from "node:assert/strict";
import { birthToUtc, calculateAngles, calculateHouses, planetaryPositionsAt } from "../lib/astrology.ts";

// Golden vectors: NASA/JPL Horizons DE441, geocentric observer, apparent
// IAU76/80 ecliptic-of-date longitude (observer quantity 31). Refresh with:
// node scripts/fetch-jpl-reference.mjs
const REFERENCE_CHARTS = [
  { utc: "1960-09-12T14:35:00.000Z", positions: { sun:169.8124302,moon:76.2552859,mercury:180.5753415,venus:192.049411,mars:85.425482,jupiter:264.5872103,saturn:281.82956,uranus:143.1925427,neptune:217.1818797,pluto:156.3663643 } },
  { utc: "1970-06-04T03:00:00.000Z", positions: { sun:73.0898152,moon:73.409756,mercury:49.1634263,venus:105.0172964,mars:91.2174042,jupiter:206.6240236,saturn:46.1595969,uranus:184.6856879,neptune:239.1462216,pluto:174.6779907 } },
  { utc: "1974-08-02T18:00:00.000Z", positions: { sun:130.0553422,moon:305.5412786,mercury:114.9204632,venus:105.1347386,mars:153.8633729,jupiter:346.7836261,saturn:102.550051,uranus:204.0951233,neptune:246.9168989,pluto:184.7096931 } },
  { utc: "1992-12-08T23:35:00.000Z", positions: { sun:257.151194,moon:64.4664935,mercury:236.4028306,venus:300.281713,mars:116.9278951,jupiter:190.8820665,saturn:314.1714355,uranus:286.3572384,neptune:287.525823,pluto:233.8125781 } },
  { utc: "2000-01-01T12:00:00.000Z", positions: { sun:280.3689092,moon:223.323786,mercury:271.8892699,venus:241.5657794,mars:327.9632921,jupiter:25.2530685,saturn:40.3956366,uranus:314.809168,neptune:303.1930007,pluto:251.4547644 } },
];

const angularDifference = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

for (const reference of REFERENCE_CHARTS) {
  test(`NASA/JPL reference chart ${reference.utc} matches within 0.1°`, () => {
    const actual = Object.fromEntries(planetaryPositionsAt(new Date(reference.utc)).map((planet) => [planet.id, planet.longitude]));
    for (const [body, expected] of Object.entries(reference.positions)) assert.ok(angularDifference(actual[body], expected) <= 0.1, `${body}: expected ${expected}, received ${actual[body]}`);
  });
}

test("Ascendant and MC reproduce the independent Bangkok reference", () => {
  const angles = calculateAngles(new Date("1972-08-02T07:30:00.000Z"), 13.75, 100.5);
  assert.ok(angularDifference(angles.ascendant, 249.99) < 0.1);
  assert.ok(angularDifference(angles.mc, 162.65) < 0.1);
});

test("Placidus switches to Whole Sign above the polar circle", () => {
  const houses = calculateHouses(new Date("2000-01-01T12:00:00.000Z"), 78.22, 15.65);
  assert.equal(houses.system, "whole-sign");
  houses.cusps.forEach((cusp) => assert.equal(cusp % 30, 0));
});

test("Mongolia historical DST and western-zone offsets come from IANA data", () => {
  const utc = (birthDate, cityId) => birthToUtc({ name: "Тест", birthDate, birthTime: "12:00", cityId, unknownTime: false }).date.toISOString();
  assert.equal(utc("1982-07-01", "ulaanbaatar"), "1982-07-01T04:00:00.000Z");
  assert.equal(utc("1983-07-01", "ulaanbaatar"), "1983-07-01T03:00:00.000Z");
  assert.equal(utc("2015-07-01", "ulaanbaatar"), "2015-07-01T03:00:00.000Z");
  assert.equal(utc("2017-07-01", "ulaanbaatar"), "2017-07-01T04:00:00.000Z");
  assert.equal(utc("1990-07-01", "hovd"), "1990-07-01T04:00:00.000Z");
});

import test from "node:test";
import assert from "node:assert/strict";
import { birthToUtc, calculateAngles, calculateHouses, calculateNatalChart, planetaryPositionsAt, trueNodeLongitude, validateNatalInput } from "../lib/astrology.ts";

const angularDifference = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

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

for (const reference of REFERENCE_CHARTS) {
  test(`NASA/JPL reference chart ${reference.utc} matches within 0.1°`, () => {
    const actual = Object.fromEntries(planetaryPositionsAt(new Date(reference.utc)).map((planet) => [planet.id, planet.longitude]));
    for (const [body, expected] of Object.entries(reference.positions)) assert.ok(angularDifference(actual[body], expected) <= 0.1, `${body}: expected ${expected}, received ${actual[body]}`);
  });
}

// Swiss Ephemeris 2.10 (swe_houses "P", SE_TRUE_NODE), generated once offline and
// embedded here; Swiss Ephemeris itself is not a dependency of the site.
const HOUSE_REFERENCES = [{"label":"Ulaanbaatar 1990 DST","utc":"1990-06-30T23:30:00Z","lat":47.9185,"lon":106.9177,"asc":127.4208,"mc":19.7011,"cusps":[127.4208,145.7534,168.9158,199.7011,238.2559,276.5706,307.4208,325.7534,348.9158,19.7011,58.2559,96.5706],"node":307.6796},{"label":"Hovd 1985","utc":"1985-03-14T09:10:00Z","lat":48.0056,"lon":91.6419,"asc":144.1849,"mc":43.5285,"cusps":[144.1849,164.4137,190.3859,223.5285,261.2973,295.8836,324.1849,344.4137,10.3859,43.5285,81.2973,115.8836],"node":49.9717},{"label":"Seoul 1975","utc":"1975-11-02T21:45:00Z","lat":37.5665,"lon":126.978,"asc":216.3387,"mc":132.3045,"cusps":[216.3387,245.1541,277.6655,312.3045,345.099,13.1482,36.3387,65.1541,97.6655,132.3045,165.099,193.1482],"node":231.7721},{"label":"Sydney 2001","utc":"2001-02-17T03:20:00Z","lat":-33.8688,"lon":151.2093,"asc":65.2418,"mc":347.3701,"cusps":[65.2418,96.6079,131.9204,167.3701,198.1898,223.4948,245.2418,276.6079,311.9204,347.3701,18.1898,43.4948],"node":104.7427},{"label":"New York 1969","utc":"1969-07-20T20:17:00Z","lat":40.7128,"lon":-74.006,"asc":241.9463,"mc":167.6863,"cusps":[241.9463,273.7683,310.9781,347.6863,18.035,41.9579,61.9463,93.7683,130.9781,167.6863,198.035,221.9579],"node":352.476},{"label":"Stockholm 1962","utc":"1962-12-24T16:05:00Z","lat":59.3293,"lon":18.0686,"asc":118.7554,"mc":351.312,"cusps":[118.7554,130.9535,147.1118,171.312,211.0581,263.6108,298.7554,310.9535,327.1118,351.312,31.0581,83.6108],"node":119.8732}];

for (const reference of HOUSE_REFERENCES) {
  test(`Swiss Ephemeris houses and true node: ${reference.label}`, () => {
    const date = new Date(reference.utc);
    const houses = calculateHouses(date, reference.lat, reference.lon);
    assert.equal(houses.system, "placidus");
    assert.ok(angularDifference(houses.ascendant, reference.asc) < 0.03, `ASC ${houses.ascendant} vs ${reference.asc}`);
    assert.ok(angularDifference(houses.mc, reference.mc) < 0.03, `MC ${houses.mc} vs ${reference.mc}`);
    houses.cusps.forEach((cusp, index) => assert.ok(angularDifference(cusp, reference.cusps[index]) < 0.03, `cusp ${index + 1}: ${cusp} vs ${reference.cusps[index]}`));
    assert.ok(angularDifference(trueNodeLongitude(date), reference.node) < 0.05, `node ${trueNodeLongitude(date)} vs ${reference.node}`);
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

const utc = (birthDate, cityId, birthTime = "12:00") => birthToUtc({ name: "Тест", birthDate, birthTime, cityId, unknownTime: false }).date.toISOString();

test("Mongolia historical DST and western-zone offsets come from IANA data", () => {
  assert.equal(utc("1982-07-01", "ulaanbaatar"), "1982-07-01T04:00:00.000Z");
  assert.equal(utc("1983-07-01", "ulaanbaatar"), "1983-07-01T03:00:00.000Z");
  assert.equal(utc("2004-07-01", "ulaanbaatar"), "2004-07-01T03:00:00.000Z");
  assert.equal(utc("2010-07-01", "ulaanbaatar"), "2010-07-01T04:00:00.000Z");
  assert.equal(utc("2015-07-01", "ulaanbaatar"), "2015-07-01T03:00:00.000Z");
  assert.equal(utc("2017-07-01", "ulaanbaatar"), "2017-07-01T04:00:00.000Z");
  assert.equal(utc("1990-07-01", "hovd"), "1990-07-01T04:00:00.000Z");
  assert.equal(utc("1990-07-01", "uliastai"), "1990-07-01T04:00:00.000Z");
  assert.equal(utc("1995-01-15", "seoul"), "1995-01-15T03:00:00.000Z");
});

test("A skipped spring-forward time is moved forward and flagged; a repeated time takes summer time", () => {
  const gap = birthToUtc({ name: "Тест", birthDate: "2015-03-28", birthTime: "02:30", cityId: "ulaanbaatar", unknownTime: false });
  assert.equal(gap.gap, true);
  assert.equal(gap.date.toISOString(), "2015-03-27T18:30:00.000Z");
  const overlap = birthToUtc({ name: "Тест", birthDate: "2015-09-25", birthTime: "23:30", cityId: "ulaanbaatar", unknownTime: false });
  assert.equal(overlap.overlap, true);
  assert.equal(overlap.date.toISOString(), "2015-09-25T14:30:00.000Z");
  const chart = calculateNatalChart({ name: "Тест", birthDate: "2015-03-28", birthTime: "02:30", cityId: "ulaanbaatar", unknownTime: false });
  assert.ok(chart.notices.some((notice) => notice.kind === "dst-gap"));
});

test("Degrees are truncated so a planet at 29°59.9′ never displays as the next sign's 0°", () => {
  // Scan an hour of Moon motion for a sample that sits just before a sign boundary.
  const base = new Date("2000-01-01T00:00:00Z").getTime();
  for (let minute = 0; minute < 60 * 24 * 30; minute += 7) {
    const moon = planetaryPositionsAt(new Date(base + minute * 60000))[1];
    assert.ok(moon.minute >= 0 && moon.minute <= 59);
    assert.equal(Math.floor(moon.longitude / 30), moon.signIndex);
    assert.equal(moon.degree, Math.floor(moon.longitude % 30));
  }
});

test("Custom coordinates validate range and IANA zone, and feed the chart", () => {
  const base = { name: "Тест", birthDate: "1988-05-05", birthTime: "06:15", cityId: "custom", unknownTime: false };
  assert.throws(() => validateNatalInput({ ...base, place: { label: "", latitude: 95, longitude: 100, timezone: "Asia/Ulaanbaatar" } }), /Өргөрөг/);
  assert.throws(() => validateNatalInput({ ...base, place: { label: "", latitude: 47, longitude: 200, timezone: "Asia/Ulaanbaatar" } }), /Уртраг/);
  assert.throws(() => validateNatalInput({ ...base, place: { label: "", latitude: 47, longitude: 100, timezone: "Mars/Olympus" } }), /Цагийн бүс/);
  assert.throws(() => validateNatalInput({ ...base, place: { label: "<script>", latitude: 47, longitude: 100, timezone: "Asia/Ulaanbaatar" } }), /Газрын нэр/);
  const chart = calculateNatalChart({ ...base, place: { label: "Хархорин", latitude: 47.1975, longitude: 102.8238, timezone: "Asia/Ulaanbaatar" } });
  assert.equal(chart.city.id, "custom");
  assert.equal(chart.city.name, "Хархорин");
  const listed = calculateNatalChart({ ...base, cityId: "kharkhorin" });
  assert.ok(angularDifference(chart.ascendant.longitude, listed.ascendant.longitude) < 0.001);
});

test("Unknown birth time hides angles and houses and reports a Moon sign change", () => {
  // Scan February 2000 for a day on which the Moon changes sign in Ulaanbaatar.
  let found = null;
  for (let day = 1; day <= 28 && !found; day++) {
    const chart = calculateNatalChart({ name: "Тест", birthDate: `2000-02-${String(day).padStart(2, "0")}`, birthTime: "", cityId: "ulaanbaatar", unknownTime: true });
    assert.equal(chart.houses, null); assert.equal(chart.ascendant, null); assert.equal(chart.midheaven, null); assert.equal(chart.houseSystem, "none");
    assert.ok(chart.planets.every((planet) => planet.house === undefined));
    if (chart.moonRange.start !== chart.moonRange.end) found = chart;
  }
  assert.ok(found, "a sign change day exists in February 2000");
  assert.ok(found.notices.some((notice) => notice.kind === "moon-sign-change"));
});

test("High latitude birth uses Whole Sign houses and says so", () => {
  const chart = calculateNatalChart({ name: "Тест", birthDate: "1995-06-21", birthTime: "12:00", cityId: "custom", unknownTime: false, place: { label: "Тромсё", latitude: 69.6496, longitude: 18.956, timezone: "Europe/Oslo" } });
  assert.equal(chart.houseSystem, "whole-sign");
  assert.ok(chart.notices.some((notice) => notice.kind === "whole-sign"));
});

test("Aspects use wider orbs for the luminaries and never pair a planet with itself", () => {
  const chart = calculateNatalChart({ name: "Тест", birthDate: "1990-07-01", birthTime: "08:30", cityId: "ulaanbaatar", unknownTime: false });
  for (const aspect of chart.aspects) {
    assert.notEqual(aspect.a, aspect.b);
    assert.ok(aspect.orb <= aspect.maxOrb);
    const luminary = [aspect.a, aspect.b].includes("sun") || [aspect.a, aspect.b].includes("moon");
    assert.equal(aspect.maxOrb, { conjunction: 8, opposition: 8, square: 7, trine: 7, sextile: 5 }[aspect.type] + (luminary ? 2 : 0));
  }
});

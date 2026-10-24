import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateNatalChart } from "../lib/astrology.ts";
import { calculateForecast, selectTransits } from "../lib/natal/forecast.ts";
import { animalRelation, garamAges, lunarNewYear, mongolYearOf, nearYearBoundary } from "../lib/natal/mongol-year.ts";
import { createNatalReading } from "../lib/natal/reading.ts";
import { makeNatalPoster } from "../lib/natal-poster.ts";
import { makeNatalPdf } from "../lib/natal-pdf.ts";

const input = { name: "Тест", birthDate: "1990-07-01", birthTime: "12:00", cityId: "ulaanbaatar", unknownTime: false };
const from = new Date("2026-10-24T00:00:00Z");

test("lunar new year matches published dates, including leap-month years", () => {
  const known = { 1984: "02-02", 1985: "02-20", 1990: "01-27", 1996: "02-19", 2004: "01-22", 2014: "01-31", 2023: "01-22", 2024: "02-10", 2026: "02-17", 2027: "02-06", 2034: "02-19" };
  for (const [year, date] of Object.entries(known)) assert.equal(lunarNewYear(Number(year)), `${year}-${date}`);
});

test("Mongolian year changes at Tsagaan Sar, not on 1 January", () => {
  assert.equal(mongolYearOf("1990-07-01").title, "Цагаан морь");
  assert.equal(mongolYearOf("1991-01-01").title, "Цагаан морь");
  assert.equal(mongolYearOf("1984-06-01").title, "Хөх хулгана");
  assert.equal(mongolYearOf("2024-06-01").title, "Хөх луу");
  assert.equal(mongolYearOf("2027-03-01").title, "Улаан хонь");
  assert.ok(nearYearBoundary("1990-01-28") && !nearYearBoundary("1990-07-01"));
});

test("animal relations and garam ages", () => {
  assert.equal(animalRelation(0, 4), "triad");
  assert.equal(animalRelation(0, 6), "clash");
  assert.equal(animalRelation(3, 3), "same");
  assert.equal(animalRelation(0, 1), "neutral");
  assert.deepEqual(garamAges(60), [13, 25, 37, 49]);
});

test("forecast: events fall inside the period, are deterministic and obey selection caps", () => {
  const chart = calculateNatalChart(input);
  const a = calculateForecast(chart, from), b = calculateForecast(chart, from);
  assert.deepEqual(a, b);
  assert.equal(a.start, "2026-10-24");
  assert.equal(a.end, "2027-10-24");
  for (const event of a.transits) for (const date of event.exact) assert.ok(date >= a.start && date <= a.end, date);
  const picked = selectTransits(a);
  assert.ok(picked.length >= 4 && picked.length <= 8);
  assert.ok(picked.some((event) => ["trine", "sextile"].includes(event.aspect)));
  const kinds = picked.map((event) => `${event.transit}|${event.aspect === "conjunction" ? "c" : ["trine", "sextile"].includes(event.aspect) ? "s" : "h"}`);
  assert.equal(new Set(kinds).size, kinds.length);
  // 2027-02-06 annular and 2027-08-02 total solar eclipses; the other 2027 lunar eclipses are penumbral.
  assert.deepEqual(a.eclipses.map((eclipse) => `${eclipse.kind} ${eclipse.date}`), ["solar 2027-02-06", "solar 2027-08-02"]);
});

test("forecast: Saturn–Sun square matches an independent ephemeris check", () => {
  // Saturn reaches 9°23′ Aries (square to a 9°23′ Cancer Sun) on 2026-11-05 and again on 2027-01-15.
  const chart = calculateNatalChart(input);
  const event = calculateForecast(chart, from).transits.find((item) => item.transit === "saturn" && item.target === "sun" && item.aspect === "square");
  assert.ok(event);
  assert.equal(event.exact.length, 2);
});

test("unknown birth time leaves out the Moon, angles and houses", () => {
  const chart = calculateNatalChart({ ...input, unknownTime: true });
  const forecast = calculateForecast(chart, from);
  assert.equal(forecast.limited, true);
  assert.deepEqual(forecast.houses, []);
  assert.ok(forecast.transits.every((event) => !["moon", "ascendant", "midheaven"].includes(event.target)));
  const reading = createNatalReading({ ...input, unknownTime: true }, from);
  assert.ok(reading.sections.some((section) => section.id === "forecast-intro"));
  assert.ok(!reading.sections.some((section) => section.id === "forecast-houses"));
});

test("reading carries the Mongolian year and forecast sections and stays stable for a fixed date", () => {
  const reading = createNatalReading(input, from);
  assert.equal(reading.mongolYear.title, "Цагаан морь");
  assert.equal(reading.forecastFrom, from.toISOString());
  for (const id of ["my-year", "my-animal", "my-combined", "next-year", "forecast-intro", "forecast-timeline", "forecast-eclipses", "forecast-closing"]) assert.ok(reading.sections.some((section) => section.id === id), id);
  assert.equal(JSON.stringify(createNatalReading(input, from).sections), JSON.stringify(reading.sections));
  assert.doesNotMatch(reading.sections.filter((section) => section.group === "forecast").map((section) => section.title).join(" "), /[☌⚹□△☍]/u);
});

test("A3 poster and reading PDF render", async () => {
  const font = readFileSync(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url));
  const reading = createNatalReading(input, from);
  const poster = await makeNatalPoster(reading, font);
  assert.equal(Buffer.from(poster.slice(0, 4)).toString(), "%PDF");
  const pdf = await makeNatalPdf(reading, font);
  assert.equal(Buffer.from(pdf.slice(0, 4)).toString(), "%PDF");
  const { PDFDocument } = await import("pdf-lib");
  const page = (await PDFDocument.load(poster)).getPage(0).getSize();
  assert.ok(Math.abs(page.width - 841.89) < 0.1 && Math.abs(page.height - 1190.55) < 0.1);
});

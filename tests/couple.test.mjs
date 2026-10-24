// Couple (synastry) product: engine accuracy, content coverage and language rules, generated readings.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { ALL_CITIES } from "../lib/cities.ts";
import { angularDistance, calculateNatalChart } from "../lib/astrology.ts";
import { lifePath } from "../lib/codes.ts";
import { CALIBRATION } from "../lib/couple/calibration.ts";
import { COMPOSITE_MOON, COMPOSITE_SUN, COMPOSITE_VENUS } from "../lib/couple/content/composite.ts";
import { CROSS_ASPECTS } from "../lib/couple/content/cross-aspects.ts";
import * as guidance from "../lib/couple/content/guidance.ts";
import { LIFE_PATH_LOVE, LIFE_PATH_PAIRS } from "../lib/couple/content/life-path.ts";
import { OVERLAY_TEXT } from "../lib/couple/content/overlays.ts";
import { MARS_CONFLICT, MERCURY_TALK, MOON_NEEDS, VENUS_LOVE } from "../lib/couple/content/profiles.ts";
import { SIGN_RELATIONS } from "../lib/couple/content/sign-relations.ts";
import * as free from "../lib/couple/free.ts";
import { buildCoupleReading, createCoupleReading } from "../lib/couple/reading.ts";
import { selectCrossAspects } from "../lib/couple/select.ts";
import {
  CROSS_ORDER, CROSS_PAIRS, METRICS, buildCoupleChart, calculateCoupleChart, crossAspects, midpoint, pairKey, percentile, rawScores, signDistance, signLinks, synastryOrb, validateCoupleInput,
} from "../lib/couple/synastry.ts";
import { makeCouplePdf } from "../lib/couple-pdf.ts";
import { coupleMessage } from "../lib/couple-email-template.ts";
import { ASPECT_NAMES } from "../lib/natal/terms.ts";
import { mixedScriptWords, terminologyIssues } from "../scripts/mongolian-quality.mjs";

const person = (name, birthDate, birthTime, cityId = "ulaanbaatar", unknownTime = false) => ({ name, birthDate, birthTime, cityId, unknownTime });
const BOLD = person("Болд", "1990-07-01", "08:30");
const SARAA = person("Сараа", "1992-03-14", "21:10", "darkhan");

// ---------------------------------------------------------------- engine

test("synastry pairs: 21 personal, 12 with Jupiter/Saturn, 15 outer-planet pairs", () => {
  assert.equal(CROSS_PAIRS.length, 48);
  assert.equal(new Set(CROSS_PAIRS).size, 48);
  for (const key of CROSS_PAIRS) { const [x, y] = key.split("-"); assert.equal(pairKey(y, x), key); }
  for (const shared of ["jupiter-saturn", "uranus-pluto", "saturn-saturn", "jupiter-jupiter", "neptune-neptune"]) assert.ok(!CROSS_PAIRS.includes(shared), shared);
});

test("midpoint takes the shorter arc and sign distance folds at the opposition", () => {
  assert.equal(midpoint(350, 10), 0);
  assert.equal(midpoint(10, 350), 0);
  assert.equal(midpoint(100, 140), 120);
  assert.equal(midpoint(0, 180) % 180, 90);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 11].map((d) => signDistance(0, d)), [0, 1, 2, 3, 4, 5, 6, 5, 1]);
  assert.equal(signDistance(11, 0), 1);
});

test("every cross aspect is real: recomputed angle, orb inside the synastry limit, nothing missed", () => {
  const a = calculateNatalChart(BOLD), b = calculateNatalChart(SARAA);
  const found = crossAspects(a, b);
  const point = (chart, id) => id === "ascendant" ? chart.ascendant : chart.planets.find((planet) => planet.id === id);
  for (const aspect of found) {
    const angle = angularDistance(point(a, aspect.a).longitude, point(b, aspect.b).longitude);
    assert.ok(Math.abs(angle - aspect.angle) < 1e-9);
    assert.ok(Math.abs(Math.abs(angle - ASPECT_NAMES[aspect.type].angle) - aspect.orb) < 1e-9);
    assert.ok(aspect.orb <= synastryOrb(aspect.type, aspect.a, aspect.b) + 1e-9, `${aspect.key} orb`);
    assert.ok(CROSS_PAIRS.includes(aspect.key));
  }
  // Brute force: every allowed pair within orb must be listed.
  let expected = 0;
  for (const x of CROSS_ORDER) for (const y of CROSS_ORDER) {
    const left = point(a, x), right = point(b, y);
    if (!left || !right || !CROSS_PAIRS.includes(pairKey(x, y))) continue;
    const angle = angularDistance(left.longitude, right.longitude);
    if (Object.keys(ASPECT_NAMES).some((type) => Math.abs(angle - ASPECT_NAMES[type].angle) <= synastryOrb(type, x, y))) expected++;
  }
  assert.equal(found.length, expected);
});

test("swapping the two people mirrors the aspects and keeps every score", () => {
  const a = calculateNatalChart(BOLD), b = calculateNatalChart(SARAA);
  const ab = buildCoupleChart(a, b), ba = buildCoupleChart(b, a);
  const signature = (list, flip) => list.map((item) => `${flip ? item.b : item.a}>${flip ? item.a : item.b}:${item.type}`).sort();
  assert.deepEqual(signature(ab.aspects, false), signature(ba.aspects, true));
  for (const metric of METRICS) assert.equal(ab.scores[metric].score, ba.scores[metric].score, metric);
  assert.deepEqual(ab.lifePath, { a: lifePath(BOLD.birthDate), b: lifePath(SARAA.birthDate) });
});

test("calibration tables are monotonic and percentiles stay within 1–99", () => {
  for (const set of Object.values(CALIBRATION)) for (const metric of METRICS) {
    const list = set[metric];
    assert.equal(list.length, 21);
    for (let i = 1; i < list.length; i++) assert.ok(list[i] >= list[i - 1], metric);
    assert.equal(percentile(list[0] - 1, list), 1);
    assert.equal(percentile(list[20] + 1, list), 99);
    assert.equal(percentile(list[10], list), 50);
  }
});

test("scores are percentiles: about half of random couples fall below 50", () => {
  let seed = 7;
  const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const pad = (value) => String(value).padStart(2, "0");
  let below = 0;
  const count = 300;
  for (let index = 0; index < count; index++) {
    const year = 1970 + Math.floor(random() * 35);
    const make = (offset) => person("Тест", `${year + offset}-${pad(1 + Math.floor(random() * 12))}-${pad(1 + Math.floor(random() * 28))}`, `${pad(Math.floor(random() * 24))}:${pad(Math.floor(random() * 60))}`);
    const couple = calculateCoupleChart({ a: make(0), b: make(Math.floor(random() * 5)) });
    if (couple.scores.overall.score < 50) below++;
  }
  assert.ok(below > count * 0.35 && below < count * 0.65, `${below} of ${count} below 50`);
});

test("unknown birth time: no Ascendant contacts or house overlays, Moon contacts flagged as approximate", () => {
  const couple = calculateCoupleChart({ a: person("Болд", "1990-07-01", "", "ulaanbaatar", true), b: SARAA });
  assert.equal(couple.calibration, "known1");
  assert.ok(!couple.aspects.some((aspect) => aspect.a === "ascendant"));
  assert.ok(couple.overlays.every((overlay) => overlay.owner === "a"), "only A's planets in B's houses");
  for (const aspect of couple.aspects.filter((item) => item.a === "moon")) assert.equal(aspect.approximate, true);
  assert.equal(calculateCoupleChart({ a: person("Анар", "1990-07-01", "", "ulaanbaatar", true), b: person("Билгүүн", "1991-01-02", "", "ulaanbaatar", true) }).overlays.length, 0);
});

test("validation: labelled errors, identical people rejected, email only when paying", () => {
  assert.throws(() => validateCoupleInput({ a: { ...BOLD, name: "<b>" }, b: SARAA }), /^Error: Таны мэдээлэл: /);
  assert.throws(() => validateCoupleInput({ a: BOLD, b: { ...SARAA, birthDate: "1992-02-31" } }), /^Error: Хамтрагчийн мэдээлэл: /);
  assert.throws(() => validateCoupleInput({ a: BOLD, b: { ...BOLD, name: "Өөр" } }), /яг ижил/);
  assert.throws(() => validateCoupleInput({ a: BOLD, b: SARAA }, true), /Имэйл/);
  assert.equal(validateCoupleInput({ a: BOLD, b: SARAA, email: " A@B.mn " }, true).email, "a@b.mn");
  assert.equal(validateCoupleInput({ a: BOLD, b: SARAA }).a.email, "");
});

// ---------------------------------------------------------------- content

const records = [];
const collect = (path, value) => {
  if (typeof value === "string") records.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((item, index) => collect(`${path}[${index}]`, item));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) collect(`${path}.${key}`, item);
};
collect("CROSS_ASPECTS", CROSS_ASPECTS);
collect("VENUS_LOVE", VENUS_LOVE); collect("MARS_CONFLICT", MARS_CONFLICT); collect("MOON_NEEDS", MOON_NEEDS); collect("MERCURY_TALK", MERCURY_TALK);
collect("SIGN_RELATIONS", SIGN_RELATIONS);
collect("COMPOSITE_SUN", COMPOSITE_SUN); collect("COMPOSITE_MOON", COMPOSITE_MOON); collect("COMPOSITE_VENUS", COMPOSITE_VENUS);
collect("OVERLAY_TEXT", OVERLAY_TEXT);
collect("LIFE_PATH_LOVE", LIFE_PATH_LOVE); collect("LIFE_PATH_PAIRS", LIFE_PATH_PAIRS);
collect("guidance", guidance);
collect("free", free);
const interpretations = records.filter((record) => !/\.theme$|^free\.|COUPLE_COPY\.(practices|moonApprox|doubled|linkUncertain|linkDoubled|overlayApprox|noEvidence|roles|scores|intro|method|closing|disclaimer|unknownTime|numerologyIntro|compositeIntro|overlaysIntro|signsIntro|aspectsIntro)/.test(record.path) && !/DISTANCE_NAMES/.test(record.path));
const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[А-ЯЁӨҮA-Z«0-9])/u).filter(Boolean);
const GENITIVE = ["Хонины", "Үхрийн", "Ихрийн", "Мэлхийн", "Арслангийн", "Охины", "Жинлүүрийн", "Хилэнцийн", "Нумын", "Матрын", "Хумхын", "Загасны"];
const ORDINALS = ["нэгдүгээр", "хоёрдугаар", "гуравдугаар", "дөрөвдүгээр", "тавдугаар", "зургаадугаар", "долоодугаар", "наймдугаар", "есдүгээр", "аравдугаар", "арван нэгдүгээр", "арван хоёрдугаар"];

test("every synastry pair has a theme and conjunction, harmonious and challenging texts", () => {
  for (const key of CROSS_PAIRS) {
    const text = CROSS_ASPECTS[key];
    assert.ok(text, `missing ${key}`);
    for (const field of ["theme", "conjunction", "harmonious", "challenging"]) assert.ok(text[field]?.length > 5, `${key}.${field}`);
  }
  assert.deepEqual(Object.keys(CROSS_ASPECTS).sort(), [...CROSS_PAIRS].sort(), "no orphan texts");
});

test("sign, house and number tables are complete and name the right sign, planet and house", () => {
  const signTable = (list, lead, name) => { assert.equal(list.length, 12, name); list.forEach((text, index) => { assert.ok(text.startsWith(lead), `${name}[${index}] lead`); assert.ok(text.includes(`${GENITIVE[index]} ордод`), `${name}[${index}] sign`); }); };
  signTable(VENUS_LOVE, "Сугар", "VENUS_LOVE"); signTable(MARS_CONFLICT, "Ангараг", "MARS_CONFLICT"); signTable(MOON_NEEDS, "Сар", "MOON_NEEDS"); signTable(MERCURY_TALK, "Буд", "MERCURY_TALK");
  signTable(COMPOSITE_SUN, "Хамтын зургийн Нар", "COMPOSITE_SUN"); signTable(COMPOSITE_MOON, "Хамтын зургийн Сар", "COMPOSITE_MOON"); signTable(COMPOSITE_VENUS, "Хамтын зургийн Сугар", "COMPOSITE_VENUS");
  const leads = { sun: "Нар", moon: "Сар", venus: "Сугар", mars: "Ангараг" };
  for (const [id, list] of Object.entries(OVERLAY_TEXT)) { assert.equal(list.length, 12); list.forEach((text, index) => assert.ok(text.startsWith(`${leads[id]} нөгөөгийнхөө ${ORDINALS[index]} байшинд`), `${id} house ${index + 1}`)); }
  for (const list of Object.values(SIGN_RELATIONS)) assert.equal(list.length, 7);
  assert.equal(LIFE_PATH_LOVE.length, 9);
  LIFE_PATH_LOVE.forEach((text, index) => assert.ok(text.startsWith(`Амьдралын замын ${index + 1} тоотой`)));
  for (let x = 1; x <= 9; x++) for (let y = x; y <= 9; y++) assert.ok(LIFE_PATH_PAIRS[`${x}-${y}`], `life path ${x}-${y}`);
  assert.equal(Object.keys(LIFE_PATH_PAIRS).length, 45);
  for (const table of [guidance.CONFLICT_BY_MARS, guidance.REPAIR_BY_MOON]) assert.equal(Object.keys(table).length, 10);
  assert.equal(free.FREE_SUN_LINK.length, 7);
});

test("no placeholder leaks, straight quotes or banned terms; Latin only as glossed technical terms", () => {
  const banned = [
    [/гариг/iu, "гараг"], [/асцендент/iu, "Мандах орд"], [/(?<!\p{L})чарт/iu, "зураг"], [/хороскоп/iu, "натал зураг"],
    [/(^|[^\p{L}])чи([^\p{L}]|$)|чиний/iu, "та"], [/оппозиц|конжанкшн/iu, "Эсрэгцэл / Нэгдэл"],
    [/хувь тавилан|гарцаагүй|заавал тохиолдоно|хараал|салах нь гарцаагүй/iu, "fatalistic wording"],
    [/(^|[^\p{L}])(өвчин|үхэл|нас бар|осол|эмчил|онош|жирэмсэ|салалт|гэр бүл салах)/iu, "health / death / breakup prediction"],
  ];
  const allowedLatin = /\((synastry|composite chart|house overlay|life path|quincunx)\)|\b(ASC|MC|PDF|QPay|UTC)\b/g;
  for (const { path, text } of records) {
    assert.doesNotMatch(text, /undefined|null|NaN|\$\{|[{}]|"/, path);
    for (const [pattern, use] of banned) assert.doesNotMatch(text, pattern, `${path}: use ${use}`);
    assert.doesNotMatch(text.replace(allowedLatin, ""), /[A-Za-z]/, `${path}: Latin`);
    assert.deepEqual(terminologyIssues(text), [], path);
    assert.deepEqual(mixedScriptWords(text), [], path);
    assert.doesNotMatch(text, /[^\s]{2,}д[аэоө]гийг/u, `${path}: -дгийг`);
  }
});

test("interpretation records are 2–5 sentences and 80–700 characters, and no sentence is reused", () => {
  const seen = new Map();
  for (const { path, text } of interpretations) {
    const count = sentences(text).length;
    assert.ok(count >= 2 && count <= 5, `${path}: ${count} sentences`);
    assert.ok(text.length >= 80 && text.length <= 700, `${path}: ${text.length} chars`);
    for (const sentence of sentences(text)) {
      if (sentence.length < 40) continue;
      assert.ok(!seen.has(sentence), `"${sentence}" in ${path} and ${seen.get(sentence)}`);
      seen.set(sentence, path);
    }
  }
});

// ---------------------------------------------------------------- readings

let seed = 20261025;
const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const pad = (value) => String(value).padStart(2, "0");
const cities = ALL_CITIES.map((city) => city.id);
const NAMES = ["Бат-Эрдэнэ", "Сараа", "Мөнхзул", "Тэмүүлэн", "Anu", "Оюун-Эрдэнэ"];
const randomPerson = (index, offset) => {
  const year = 1955 + Math.floor(random() * 50) + offset;
  return person(NAMES[(index + offset) % NAMES.length], `${Math.min(year, 2007)}-${pad(1 + Math.floor(random() * 12))}-${pad(1 + Math.floor(random() * 28))}`, `${pad(Math.floor(random() * 24))}:${pad(Math.floor(random() * 60))}`, cities[(index * 7 + offset) % cities.length], (index + offset) % 7 === 0);
};
const samples = Array.from({ length: 300 }, (_, index) => ({ a: randomPerson(index, 0), b: randomPerson(index, 1 + (index % 4)) }));

test("300 generated couple readings: complete, chart-faithful, never decline names, never repeat themselves", () => {
  for (const input of samples) {
    const reading = createCoupleReading(input);
    const label = `${input.a.birthDate}/${input.b.birthDate}`;
    const all = reading.sections.flatMap((section) => [section.title, section.meta ?? "", ...section.paragraphs]).join("\n");
    assert.doesNotMatch(all, /undefined|null|NaN|\$\{/, label);
    assert.deepEqual(terminologyIssues(all), [], label);
    assert.deepEqual(mixedScriptWords(all.replace(/Anu/g, "")), [], label);
    // Names appear only in the nominative: never with a Cyrillic suffix glued on.
    for (const name of [input.a.name, input.b.name]) assert.doesNotMatch(all, new RegExp(`${name}-?(ийн|ын|ний|д|т|ыг|ийг|аас|ээс|тай|тэй)(?![\\p{L}])`, "u"), `${label}: ${name} declined`);
    assert.ok(reading.sections.length >= 35, `${label}: ${reading.sections.length} sections`);
    for (const section of reading.sections) assert.ok(section.paragraphs.length > 0 && section.paragraphs.every((paragraph) => paragraph.trim().length > 20), `${label} ${section.id}`);
    // Aspect sections mirror the engine's selection, with the computed orb.
    const selected = selectCrossAspects(reading);
    const aspectSections = reading.sections.filter((section) => section.id.startsWith("cross-"));
    assert.equal(aspectSections.length, selected.length, label);
    aspectSections.forEach((section, index) => assert.ok(section.meta.endsWith(`орб ${selected[index].aspect.orb.toFixed(1)}°`), `${label} ${section.id}`));
    // Profiles name the planet's real sign.
    for (const [who, chart] of [["a", reading.a], ["b", reading.b]]) {
      const venus = chart.planets.find((planet) => planet.id === "venus");
      assert.ok(reading.sections.find((section) => section.id === `${who}-venus`).meta.includes(`${venus.degree}°${pad(venus.minute)}′`), `${label} ${who} venus`);
    }
    if (input.a.unknownTime && input.b.unknownTime) assert.ok(!reading.sections.some((section) => section.group === "overlays"), label);
    // No long sentence more than twice in one reading.
    const counts = new Map();
    for (const paragraph of reading.sections.flatMap((section) => section.paragraphs)) for (const sentence of sentences(paragraph)) if (sentence.length > 60) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
    for (const [sentence, count] of counts) assert.ok(count <= 2, `${label}: "${sentence}" ×${count}`);
  }
});

test("couple PDF and email carry the whole reading", async () => {
  const reading = createCoupleReading({ a: { ...BOLD, name: "O'Neil" }, b: SARAA });
  const message = coupleMessage(reading);
  for (const section of reading.sections) for (const paragraph of section.paragraphs) assert.ok(message.text.includes(paragraph), section.id);
  assert.ok(message.html.includes("O&#39;Neil") && !message.html.includes("O'Neil"));
  const font = await readFile(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url));
  const pdf = await makeCouplePdf(reading, font);
  assert.equal(Buffer.from(pdf.slice(0, 5)).toString(), "%PDF-");
  const { PDFDocument } = await import("pdf-lib");
  assert.ok((await PDFDocument.load(pdf)).getPageCount() >= 8);
  await mkdir("outputs", { recursive: true });
  await writeFile("outputs/couple-sample.pdf", pdf);
});

test("stored readings fit comfortably in one D1 row", () => {
  const size = JSON.stringify(buildCoupleReading(calculateCoupleChart({ a: BOLD, b: SARAA }))).length;
  assert.ok(size < 400_000, `${size} bytes`);
});

test("raw scores are deterministic for the same input", () => {
  const a = calculateNatalChart(BOLD), b = calculateNatalChart(SARAA);
  assert.deepEqual(rawScores(crossAspects(a, b), signLinks(a, b)), rawScores(crossAspects(a, b), signLinks(a, b)));
});

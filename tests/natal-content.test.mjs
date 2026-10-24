// Automated gate from .claude/skills/mongolian-natal-translation/quality-checklist.md
import test from "node:test";
import assert from "node:assert/strict";
import { ALL_CITIES } from "../lib/cities.ts";
import { ANGULAR_PLANET, ASCENDANT_IN_SIGN, MIDHEAVEN_IN_SIGN } from "../lib/natal/content/angles.ts";
import { ASPECT_TYPE_TAILS, PAIR_ASPECTS, SLOW_PAIR_ASPECTS } from "../lib/natal/content/aspects.ts";
import * as overview from "../lib/natal/content/overview.ts";
import { PLANET_IN_HOUSE } from "../lib/natal/content/planets-in-houses.ts";
import { PLANET_IN_SIGN } from "../lib/natal/content/planets-in-signs.ts";
import * as free from "../lib/natal/free.ts";
import { createNatalReading, selectAspects } from "../lib/natal/reading.ts";
import { PERSONAL, PLANET_ORDER, POINT_ORDER, SIGN_NAMES, SOCIAL } from "../lib/natal/terms.ts";
import { terminologyIssues, mixedScriptWords } from "../scripts/mongolian-quality.mjs";

const records = [];
const collect = (path, value) => {
  if (typeof value === "string") records.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((item, index) => collect(`${path}[${index}]`, item));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) collect(`${path}.${key}`, item);
};
collect("PLANET_IN_SIGN", PLANET_IN_SIGN);
collect("PLANET_IN_HOUSE", PLANET_IN_HOUSE);
collect("ASCENDANT_IN_SIGN", ASCENDANT_IN_SIGN);
collect("MIDHEAVEN_IN_SIGN", MIDHEAVEN_IN_SIGN);
collect("ANGULAR_PLANET", ANGULAR_PLANET);
collect("PAIR_ASPECTS", PAIR_ASPECTS);
collect("SLOW_PAIR_ASPECTS", SLOW_PAIR_ASPECTS);
collect("ASPECT_TYPE_TAILS", ASPECT_TYPE_TAILS);
collect("overview", overview);
collect("free", free);

const interpretations = records.filter((record) => /PLANET_IN_|ASCENDANT_IN|MIDHEAVEN_IN|ANGULAR_PLANET|PAIR_ASPECTS\.[^.]+\.(conjunction|harmonious|challenging|text)|ELEMENT_|MODALITY_|HEMISPHERE|RETROGRADE/.test(record.path));
const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[А-ЯЁӨҮA-Z«])/u).filter(Boolean);

test("every planet and the node has a text for each of the 12 signs and 12 houses", () => {
  for (const id of POINT_ORDER) {
    assert.equal(PLANET_IN_SIGN[id]?.length, 12, `${id} signs`);
    assert.equal(PLANET_IN_HOUSE[id]?.length, 12, `${id} houses`);
  }
  assert.equal(ASCENDANT_IN_SIGN.length, 12);
  assert.equal(MIDHEAVEN_IN_SIGN.length, 12);
  for (const id of PLANET_ORDER) assert.ok(ANGULAR_PLANET[id].ascendant && ANGULAR_PLANET[id].midheaven, id);
});

test("each personal/social pair has conjunction, harmonious and challenging texts where astronomy allows them", () => {
  const impossible = { "sun-mercury": ["harmonious", "challenging"], "sun-venus": ["harmonious", "challenging"], "mercury-venus": ["challenging"] };
  const fast = [...PERSONAL, ...SOCIAL];
  for (let i = 0; i < PLANET_ORDER.length; i++) for (let j = i + 1; j < PLANET_ORDER.length; j++) {
    const a = PLANET_ORDER[i], b = PLANET_ORDER[j], key = `${a}-${b}`;
    if (!fast.includes(a) && !fast.includes(b)) continue;
    if (fast.includes(a) && fast.includes(b) || PERSONAL.includes(a) || PERSONAL.includes(b)) {
      assert.ok(PAIR_ASPECTS[key], `missing pair ${key}`);
      for (const family of ["conjunction", "harmonious", "challenging"]) if (!(impossible[key] ?? []).includes(family)) assert.ok(PAIR_ASPECTS[key][family], `${key}.${family}`);
    } else assert.ok(SLOW_PAIR_ASPECTS[key], `missing slow pair ${key}`);
  }
});

test("no record contains undefined, null, NaN, template braces or straight double quotes", () => {
  for (const { path, text } of records) assert.doesNotMatch(text, /undefined|null|NaN|\$\{|[{}]|"/, path);
});

test("approved terminology only (glossary in .claude/skills/mongolian-natal-translation/terminology.md)", () => {
  const banned = [
    [/гариг/iu, "гараг"],
    [/\d+-р гэр|[а-яө]+дугаар гэр|[а-яө]+дүгээр гэр/iu, "байшин"],
    [/асцендент/iu, "Мандах орд"],
    [/(?<!\p{L})чарт/iu, "натал зураг / зураг"],
    [/хороскоп/iu, "натал зураг"],
    [/(^|[^\p{L}])чи([^\p{L}]|$)|чиний/iu, "та"],
    [/оппозиц|конжанкшн/iu, "Эсрэгцэл / Нэгдэл"],
    [/хувь тавилан|гарцаагүй|заавал тохиолдоно|хараал/iu, "fatalistic wording"],
    [/(^|[^\p{L}])(өвчин|үхэл|нас бар|осол|эмчил|онош|жирэмсэ|салалт)/iu, "health / death / event prediction"],
  ];
  for (const { path, text } of records) for (const [pattern, use] of banned) {
    // The glossary explains «Мандах орд буюу Асцендент» exactly once, in READING_COPY.ascendantTerm.
    if (path.endsWith("ascendantTerm") && pattern.source.includes("асцендент")) continue;
    assert.doesNotMatch(text, pattern, `${path}: use ${use}`);
  }
});

test("Latin letters appear only in approved abbreviations", () => {
  const allowed = /\b(ASC|MC|DSC|IC|PDF|QPay|UTC|IANA|Swiss Ephemeris|NASA|JPL|Horizons|true)\b/g;
  for (const { path, text } of records) assert.doesNotMatch(text.replace(allowed, ""), /[A-Za-z]/, path);
});

test("interpretation records are 2–5 sentences and 100–700 characters", () => {
  for (const { path, text } of interpretations) {
    const count = sentences(text).length;
    assert.ok(count >= 2 && count <= 5, `${path}: ${count} sentences`);
    assert.ok(text.length >= 100 && text.length <= 700, `${path}: ${text.length} chars`);
  }
});

test("no sentence is reused across two interpretation records", () => {
  const seen = new Map();
  for (const { path, text } of interpretations) for (const sentence of sentences(text)) {
    if (sentence.length < 40) continue;
    assert.ok(!seen.has(sentence), `"${sentence}" in ${path} and ${seen.get(sentence)}`);
    seen.set(sentence, path);
  }
});

test("sign texts name the right sign in the genitive and planet texts name their planet", () => {
  const genitive = ["Хонины", "Үхрийн", "Ихрийн", "Мэлхийн", "Арслангийн", "Охины", "Жинлүүрийн", "Хилэнцийн", "Нумын", "Матрын", "Хумхын", "Загасны"];
  const lead = { sun: "Нар", moon: "Сар", mercury: "Буд", venus: "Сугар", mars: "Ангараг", jupiter: "Бархасбадь", saturn: "Санчир", uranus: "Тэнгэрийн ван", neptune: "Далайн ван", pluto: "Плутон", node: "Сарны хойд зангилаа" };
  for (const id of POINT_ORDER) PLANET_IN_SIGN[id].forEach((text, index) => {
    assert.ok(text.startsWith(lead[id]), `${id}[${index}] should open with ${lead[id]}`);
    assert.ok(text.includes(`${genitive[index]} ордод`), `${id}[${index}] should say «${genitive[index]} ордод» (${SIGN_NAMES[index]})`);
  });
  const ordinals = ["нэгдүгээр", "хоёрдугаар", "гуравдугаар", "дөрөвдүгээр", "тавдугаар", "зургаадугаар", "долоодугаар", "наймдугаар", "есдүгээр", "аравдугаар", "арван нэгдүгээр", "арван хоёрдугаар"];
  for (const id of POINT_ORDER) PLANET_IN_HOUSE[id].forEach((text, index) => assert.ok(text.startsWith(`${lead[id]} ${ordinals[index]} байшинд`), `${id} house ${index + 1}`));
});

test("habitual participles drop their vowel before the accusative (-дгийг, not -дагийг)", () => {
  for (const { path, text } of records) assert.doesNotMatch(text, /[^\s]{2,}д[аэоө]гийг/u, path);
});

// ---------------------------------------------------------------- generated readings

let seed = 20261023;
const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const pad = (value) => String(value).padStart(2, "0");
const cities = ALL_CITIES.map((city) => city.id);
const samples = Array.from({ length: 300 }, (_, index) => {
  const year = 1930 + Math.floor(random() * 95), month = 1 + Math.floor(random() * 12), day = 1 + Math.floor(random() * 28);
  return { name: "Тест", birthDate: `${year}-${pad(month)}-${pad(day)}`, birthTime: `${pad(Math.floor(random() * 24))}:${pad(Math.floor(random() * 60))}`, cityId: cities[index % cities.length], unknownTime: index % 9 === 0 };
});

test("300 generated readings: complete, clean, chart-faithful and not repetitive", () => {
  for (const input of samples) {
    const reading = createNatalReading(input);
    const all = reading.sections.flatMap((section) => [section.title, section.meta ?? "", ...section.paragraphs]).join("\n");
    assert.doesNotMatch(all, /undefined|null|NaN|\$\{/, input.birthDate);
    assert.deepEqual(terminologyIssues(all), [], input.birthDate);
    assert.deepEqual(mixedScriptWords(all), [], input.birthDate);
    assert.ok(reading.sections.length >= (input.unknownTime ? 22 : 40), `${input.birthDate}: ${reading.sections.length} sections`);
    for (const section of reading.sections) assert.ok(section.paragraphs.length > 0 && section.paragraphs.every((paragraph) => paragraph.trim().length > 20), `${input.birthDate} ${section.id}`);
    // Every planet section's meta must match the computed position exactly.
    for (const planet of [...reading.planets, reading.node]) {
      const section = reading.sections.find((item) => item.id === planet.id);
      assert.ok(section, `${planet.id} section`);
      assert.ok(section.meta.includes(`${planet.degree}°${pad(planet.minute)}′`), `${planet.id} degree`);
      if (planet.house) assert.ok(section.meta.includes(`${planet.house}-р байшин`), `${planet.id} house`);
    }
    // Aspect sections only mention aspects the engine found.
    const selected = selectAspects(reading);
    assert.equal(reading.sections.filter((section) => section.id.startsWith("aspect-") && section.id !== "aspects-intro").length, selected.length);
    // No long sentence appears more than twice in one reading.
    const counts = new Map();
    for (const paragraph of reading.sections.flatMap((section) => section.paragraphs)) for (const sentence of sentences(paragraph)) if (sentence.length > 60) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
    for (const [sentence, count] of counts) assert.ok(count <= 2, `${input.birthDate}: "${sentence}" ×${count}`);
    if (input.unknownTime) assert.ok(!reading.sections.some((section) => section.group === "houses" || section.id === "ascendant" || section.id === "midheaven"));
  }
});

test("names are never declined: no suffix is glued to the customer's name", () => {
  const reading = createNatalReading({ name: "Бат-Эрдэнэ", birthDate: "1993-04-12", birthTime: "14:20", cityId: "darkhan", unknownTime: false });
  const text = reading.sections.flatMap((section) => section.paragraphs).join(" ");
  assert.doesNotMatch(text, /Бат-Эрдэнэ-?(ийн|ын|д|т|ээс|тэй)/u);
});

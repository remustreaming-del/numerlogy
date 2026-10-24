import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { glossary, spellingExceptions, extractText, mixedScriptWords, terminologyIssues, spellingIssues, unknownWords, sourceRecords } from "../scripts/mongolian-quality.mjs";
import { POINT_FORMS, ANGLE_FORMS, SIGN_FORMS, SIGN_NAMES, SIGN_GEN, house, inSign, ofSign, signPhrase } from "../lib/natal/terms.ts";

const cases = ["nom", "gen", "dat", "acc", "abl", "ins", "com", "dir"];
const selectCases = (forms) => Object.fromEntries(cases.map((key) => [key, forms[key]]));

test("every glossary term has eight explicit cases and agrees with runtime names", () => {
  for (const term of glossary) {
    assert.deepEqual(Object.keys(term.forms).sort(), [...cases].sort(), term.term_id);
    for (const value of Object.values(term.forms)) assert.match(value, /^[\p{Script=Cyrillic} ]+$/u, term.term_id);
    assert.equal(term.forms.nom, term.mongolian, term.term_id);
    const point = term.term_id.startsWith("planet.") && POINT_FORMS[term.term_id.slice(7)];
    const angle = ANGLE_FORMS[term.term_id];
    if (point || angle) assert.deepEqual(term.forms, selectCases(point || angle), term.term_id);
    if (term.term_id === "north_node") assert.deepEqual(term.forms, selectCases(POINT_FORMS.node));
  }
  assert.equal(SIGN_FORMS.length, 12);
  SIGN_FORMS.forEach((sign, index) => {
    const entry = glossary.find((term) => term.term_id === `sign.${sign.id}`);
    assert.deepEqual(entry.forms, selectCases(sign));
    assert.deepEqual(entry.phrase_forms, sign.phrase);
    assert.equal(SIGN_NAMES[index], sign.nom);
    assert.equal(SIGN_GEN[index], sign.gen);
    assert.equal(inSign(index), sign.phrase.dat);
    assert.equal(ofSign(index), sign.phrase.gen);
    assert.equal(signPhrase(index), sign.phrase.nom);
  });
});

test("templates distinguish a bare sign's case from the whole sign phrase", () => {
  assert.equal(SIGN_FORMS[0].dat, "Хонинд");
  assert.equal(SIGN_FORMS[0].ins, "Хониор");
  assert.equal(inSign(0), "Хонины ордод");
  assert.equal(inSign(9), "Матрын ордод");
  assert.equal(SIGN_FORMS[1].ins, "Үхрээр");
  assert.equal(POINT_FORMS.jupiter.acc, "Бархасбадийг");
  assert.equal(POINT_FORMS.uranus.gen, "Тэнгэрийн вангийн");
  assert.equal(house(12).dat, "арван хоёрдугаар байшинд");
});

test("glossary rules catch Cyrillic words, uppercase and inflected banned terms", () => {
  for (const word of ["чарт", "ЧАРТЫН", "«хороскоп»", "гаригуудын", "оппозицийн", "конжанкшн"]) {
    assert.ok(terminologyIssues(word).length, word);
  }
  assert.deepEqual(terminologyIssues("Нар Хонины ордод байна. Гэр бүл, гарагийн байрлал."), []);
  // A stem within an unrelated word must not be treated as a word boundary.
  assert.deepEqual(terminologyIssues("ажиглагчарт"), []);
});

test("homoglyph checks catch internal and edge Latin letters, including escaped literals", () => {
  for (const word of ["хoнь", "мэдрeмж", "aмар", "cар", "саp", "xонь", "ХOНЬ"]) {
    assert.deepEqual(mixedScriptWords(word), [word]);
  }
  assert.deepEqual(mixedScriptWords("PDF-ээр QPay-ээр ASC ба MC. NASA/JPL Horizons."), []);
  const records = extractText('const copy = "х\\u006fнь"; // чарт\nconst el = <p>Сарны орд</p>;', "sample.tsx");
  assert.equal(records.length, 2);
  assert.deepEqual(mixedScriptWords(records[0].text), ["хoнь"]);
  assert.deepEqual(terminologyIssues(records[1].text), []);
});

test("template code cannot append Cyrillic suffixes to interpolated names", async () => {
  for (const file of ["lib/natal/reading.ts", "lib/natal/terms.ts", "lib/astrology.ts"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\$\{[^}]+\}\p{Script=Cyrillic}/u, file);
  }
});

test("spelling exceptions are explicit, justified, unique and never banned vocabulary", () => {
  const seen = new Set();
  for (const { reason, words } of spellingExceptions) {
    assert.ok(reason.length > 30);
    for (const word of words) {
      assert.match(word, /^[а-яёөү]+$/u);
      assert.ok(!seen.has(word), word);
      assert.deepEqual(terminologyIssues(word), [], word);
      seen.add(word);
    }
  }
});

test("Hunspell rejects new typos and keeps a measurement's suffix attached", async () => {
  assert.deepEqual(await unknownWords("Монгол хэл, Хонины ордод, бэлгэдэл, 0.01°-аас бага."), []);
  assert.deepEqual(await unknownWords("мэдрэмжжж тусламжинд"), ["мэдрэмжжж", "тусламжинд"]);
  assert.deepEqual(await unknownWords("аас"), ["аас"]);
});

test("all natal and numerology content passes Mongolian spelling", async () => {
  const records = await sourceRecords();
  for (const file of ["angles", "aspects", "overview", "planets-in-houses", "planets-in-signs"]) {
    assert.ok(records.some((record) => record.file === `lib/natal/content/${file}.ts`));
  }
  const issues = await spellingIssues();
  assert.deepEqual(issues.map(({ file, line, word }) => `${file}:${line} ${word}`), []);
});

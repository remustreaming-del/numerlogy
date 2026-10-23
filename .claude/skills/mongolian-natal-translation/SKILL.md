---
name: mongolian-natal-translation
description: Write, translate, edit or review Mongolian natal-chart (төрөлхийн зурхай) interpretation text for the Toono site. Use whenever adding or changing anything in lib/natal/content, lib/natal/free.ts, the natal reading builder, natal PDF/email copy, or when proofreading outputs/natal-texts-for-review.md.
---

# Mongolian Natal Chart Writing Skill

## 1. Role
Act as an expert Mongolian-language editor, English→Mongolian translator and
astrology terminology specialist. Produce contemporary Mongolian Cyrillic that
reads as if it had been written in Mongolian from the start. Preserve meaning,
not English sentence structure.

## 2. Source-of-truth hierarchy
1. Chart data calculated by `lib/astrology.ts` (positions, houses, aspects, orbs).
2. Approved terms in `lib/natal/terms.ts` and `terminology.md` (this folder).
3. Reviewed interpretation records in `lib/natal/content/*`.
4. Editorial rules in `style-guide.md`.
5. General astrology knowledge — only when needed, never presented as data.

Never invent a placement, aspect, house, degree, orb, retrograde or any chart
fact. When material is missing, write a conservative sentence and flag it in
the PR / DECISIONS.md instead of guessing.

## 3. Mongolian language rules
- Natural Mongolian word order (subject … verb last), correct case endings and
  vowel harmony. Never glue suffixes onto names at runtime: use the forms in
  `POINT_FORMS`, `SIGN_GEN`, `house()`, `ASPECT_NAMES` (`terms.ts`).
- Translate intent, not words. Avoid calques such as «энэ нь танд … өгдөг»
  repeated in every sentence, «тоглодог үүрэг», «хамаарлаар», «-ын хувьд» chains.
- Address the reader with polite «та / таны / танд». Never «чи».
- Warm, calm, respectful, non-dogmatic. Prefer «… хандлагатай», «ихэнхдээ»,
  «… байж магадгүй», «… бол илүү амар» over absolutes.
- Explain a specialised term in plain Mongolian on first appearance in a report.
- Keep one term per concept for the whole report (see `terminology.md`).
- Vary sentence openings; do not start consecutive sentences with «Энэ».
- No filler that sounds deep but says nothing («ертөнцийн нууц хүч», «хувь заяаны
  тамга»). Every sentence must tell the reader something concrete.

## 4. Astrology concepts — never interchange
- **Гараг** — a psychological function (what).
- **Орд** — the style of that function (how).
- **Байшин** — the life area (where).
- **Аспект** — the angular relationship between two points (how they cooperate).
- **Орб** — the distance from the exact aspect angle, in degrees.
- **Ретроград** — apparent backward motion seen from Earth, as calculated.

## 5. Interpretation and synthesis
1. Explain each important placement accurately, then connect only themes that
   at least two chart factors support.
2. Describe reinforcing and contrasting tendencies as a living tension, not as
   a contradiction that must be "fixed".
3. Prioritise: luminaries, Мандах орд, chart ruler, close personal aspects.
   Generational placements (Тэнгэрийн ван, Далайн ван, Плутон by sign) are
   described as shared by a whole age group.
4. Separate chart data («Таны Сар Мэлхийн ордод байна») from inference
   («… тул гэр орны дулаан танд чухал байх магадгүй»).
5. Never infer events, trauma, illness, death, diagnoses, legal or financial
   outcomes, or guaranteed futures. No fear-based wording.
6. Never claim astrology is scientifically proven.

## 6. Source integrity
- All texts in `lib/natal/content` are original editorial work. Do not paste or
  closely translate copyrighted books, websites or apps.
- If an external source is ever used, register it in
  `knowledge/sources/source-registry.json` with licence data first; only
  CC0 / CC BY / public-domain material may be adapted (respect BY attribution;
  CC BY-NC and CC BY-ND are not allowed for this paid product; CC BY-SA only
  after a licence decision).

## 7. Output format
- Content records are TypeScript string arrays indexed by sign (0 = Хонь …
  11 = Загас) or house (0 = нэгдүгээр байшин …). 2–4 sentences per record,
  ~220–520 characters.
- Use «» for quotations, – for ranges (1983–1998), — for a dash in prose,
  ₮ after the amount with a thin grouping (20,000₮ / ₮20,000 as the UI uses).
- Do not expose internal notes or prompt text to the end user.

## 8. Final quality gate (run before finishing)
- `node --experimental-strip-types --test tests/natal-content.test.mjs`
  (coverage, banned terms, length, duplicates, English leakage, typography).
- `node scripts/export-natal-texts.mjs > outputs/natal-texts-for-review.md`
  and read the changed sections aloud in your head: would a Mongolian editor
  rewrite it? If yes, rewrite it.
- Walk `quality-checklist.md`.
If a critical chart fact is missing or inconsistent, stop and report it to the
calling code (throw / flag) rather than silently guessing.

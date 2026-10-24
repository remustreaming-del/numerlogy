---
name: mongolian-humanizer
description: Edit Mongolian Cyrillic prose, astrology interpretations, and interface copy for natural wording, correct case forms, consistent terminology, and typography. Use when writing or reviewing Mongolian content; preserve chart facts and the author's meaning.
---

# Mongolian humanizer

Write the thought directly in Mongolian. If an English source exists, preserve its meaning without copying its sentence structure. Adapt the Hungarian humanizer's detect → rewrite → preserve meaning approach, not its language-specific rules or cultural generalizations.

For this repository, read `.claude/skills/mongolian-natal-translation/style-guide.md` and `knowledge/terminology/astrology-glossary.json`. Runtime names and cases live in `lib/natal/terms.ts`. Keep the two vocabularies consistent. Content remains a draft until a native editor has reviewed it; automated checks do not certify fluency.

## Editing decisions

- Prefer natural subject–object–verb order. Name the action instead of translating English abstract nouns literally.
- Review repeated «энэ нь», «та бол», «таны хувьд», «гэдэг нь … юм». Keep them when they clarify the referent or contrast; do not ban grammatical expressions globally.
- Replace routine sentence-opening «Гэсэн хэдий ч» with a direct contrast, often «Гэхдээ» or «Харин», when the register permits it. Preserve the logical relationship.
- Review English calques: «амьдралтай уулзах хаалга», «сэтгэлийн тэжээл авах», «газардах мэдрэмж», «өөрийн гэрлийг түгээх». Use concrete Mongolian descriptions of the intended feeling or behavior.
- Prefer active verbs when the actor matters. «Та төрөх үед Санчир … байсан» avoids suggesting that the planet was born. Passive constructions are not inherently wrong.
- Break long participle and genitive chains into separate thoughts. Keep qualifications such as «байж болно»; never turn a tendency into a guaranteed outcome.
- Vary sentence rhythm and openings. Do not force a synonym into every repeated technical term. Keep «та / таны / танд» respectful, without repeating «та» unnecessarily.
- Preserve all chart positions, sign/house indices, aspects, degrees, and uncertainty. A generational placement remains a shared theme, not proof of a personal trait.

## Cases and typography

- Use explicit stored cases: `SIGN_FORMS[0].phrase.dat` is «Хонины ордод»; the bare sign's `dat` is «Хонинд». These are different phrases.
- Never append a guessed suffix to an interpolated name. Store the inflected word or whole phrase. Preserve vowel harmony and stem changes.
- Use «…» for quotations, – for numeric ranges, and a spaced — for a sentence dash. Preserve code delimiters, URLs, abbreviations, and literal data.
- Inspect mixed Latin/Cyrillic words such as «хoнь». Correct the intended character only after checking the context; do not transliterate legitimate Latin names or `PDF-ээр`.

## Interface copy

Name the action and its object: «Мэдээллээ засах», «Төлбөрөө шалгах». Errors should say what failed and what the reader can do next. Match claims about email, payment, and downloads to actual behavior. Keep implementation details out of the primary flow unless they help the reader decide.

## Verification and editorial handoff

Review every file in `lib/natal/content/`, including passages assembled in `reading.ts`. Make contextual edits rather than blanket replacement of style phrases. Run `npm run test:language`, `npm test`, and `npm run review:natal`.

The Hunspell dictionary is incomplete: inspect spelling findings in context. Record genuine technical words with a reason; retain unresolved existing findings explicitly for editorial review. Do not silently allow every unknown word or auto-accept suggestions. New typos must fail the test.

Use the 20 synthetic reports under `outputs/mongolian-review/` for native-editor review. Ask the editor to score grammar, naturalness, terminology, and meaning, and return corrections by report and section. Report remaining uncertainty honestly; do not claim or arrange a paid review without an actual editor agreement.

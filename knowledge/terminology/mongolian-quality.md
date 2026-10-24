# Mongolian editorial checks

Write new prose in Mongolian first. The repository skill is
[`mongolian-humanizer`](../../.claude/skills/mongolian-humanizer/SKILL.md).
Keep interpretation text as a draft until a native editor has reviewed it.

- `npm run test:language`: source terminology, mixed scripts, glossary/runtime
  agreement, content spelling, typography, and 300 assembled reports.
- `npm run lint:mongolian`: checks actual TS/TSX string values and template chunks
  throughout `lib/`, `components/`, and `app/`. Comments and code identifiers are
  excluded. Escaped Unicode literals are decoded by the TypeScript parser.
- `npm run spellcheck:mongolian`: checks every Cyrillic word in natal content,
  free natal copy, and `lib/content.ts`; exits nonzero on unknown spellings.
- `npm test`: language checks plus astronomy, report, payment, email, and PDF tests.
- `npm run review:natal`: creates 20 synthetic reports, a manifest, case forms,
  and spelling exceptions in `outputs/mongolian-review/`, and refreshes
  `outputs/natal-texts-for-review.md`. Outputs are UTF-8 on Windows too.

The five requested forms are included alongside accusative, comitative, and
directive forms. `SIGN_FORMS` preserves zodiac order; its `phrase` member holds
whole phrases such as «Хонины ордод». Select the required case instead of adding
a suffix. `SIGN_NAMES` and `SIGN_GEN` remain compatibility views of those records.
Every JSON glossary entry has eight forms; tests compare runtime planet, angle,
node, and sign entries with that glossary. Newly supplied forms are explicitly
marked `draft-native-review`, independently of the term's existing approval.

The spelling dictionary is [`dictionary-mn` 3.0.0](https://github.com/wooorm/dictionaries/tree/main/dictionaries/mn),
licensed LPPL-1.3c. We load its unmodified affix and dictionary buffers using
[`hunspell-asm`](https://github.com/kwonoj/hunspell-asm), a development dependency.
`nspell` was tried but its eager expansion of this 580,636-entry dictionary used
about 1.5 GB and did not finish in several minutes. The WASM binding checks the
same content in seconds. No spelling dependency is imported into the application.

Hunspell cannot judge naturalness or meaning and misses some valid inflections.
The explicit word groups in `mongolian-spelling-exceptions.json` have reasons;
they supplement glossary names, aliases, and forms. They are also included in
the editor pack. Do not add a wildcard or bulk-accept every unknown word to make
tests pass. Correct genuine mistakes first. Never add prohibited terminology as
a spelling exception.

One verified terminology correction is «Матарын» → «Матрын», matching
[Монгол хэлний их тайлбар толь](https://mongoltoli.mn/dictionary/detail/56609).
Proper astronomical names retain the project's approved spellings pending native
review. The dictionary's [гараг entry](https://mongoltoli.mn/dictionary/detail/23116)
also supports preserving «гарагийн» when the spellchecker flags it.

The 20-report pack includes all 12 Sun signs, two unknown-time cases, historical
time zones, high latitude, and the southern hemisphere. A native Mongolian editor,
ideally familiar with astrology, should review the reports and case table and
return corrections by report and section ID. The pack includes a 1–5 scoring
guide. No editor has been hired and no native review is claimed by these checks.

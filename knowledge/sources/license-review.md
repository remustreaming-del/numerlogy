# Licence review: natal content and calculations

| Source | Use in product | Licence | Decision |
|---|---|---|---|
| Toono editorial texts (`lib/natal/content`, `lib/natal/free.ts`) | Shown to paying users | Owner's own work | ✅ Original writing; native-speaker proofread pending |
| astronomy-engine | Runtime planet positions (browser and Worker) | MIT | ✅ Keep licence notice |
| IANA tz database | Historical UTC offsets | Public domain | ✅ |
| NASA/JPL Horizons | Numbers in unit tests only | US Government work | ✅ |
| Swiss Ephemeris | Offline cross-check; numbers in unit tests only | AGPL-3.0 / commercial | ✅ for QA. ❌ Do **not** add it as a runtime dependency without a commercial licence |

Rules for adding interpretation material later (see §6 of `.claude/skills/mongolian-natal-translation/SKILL.md`):

1. Register the source in `source-registry.json` **before** collecting anything.
2. Allowed for adaptation in this paid product: public domain, CC0, CC BY (keep the attribution).
3. Not allowed: CC BY-NC (no commercial use), CC BY-ND (no derivatives), unknown or unstated licences, scraped websites, books.
4. CC BY-SA only after an explicit owner decision, because share-alike may then apply to the derived texts.
5. Never translate a protected text closely and present it as original. Rewrite from concepts, compare several references and keep the provenance.

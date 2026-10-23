# Natal redesign · final report

## Delivery

- Protected the original work on branch `redesign-natal` in checkpoint commit `062973f` before redesign edits.
- Rebuilt `/` as a two-product landing page and added `/etsgiin-kod` and `/natal` product routes.
- Rewrote `DESIGN.md` after comparing three dark celestial directions; selected Night Observatory.
- Set both server-side prices independently to ₮20,000. The natal amount is `NATAL_PRICE_MNT` and is intentionally flagged for owner review.
- Did not push or merge.

## Natal engine

- `astronomy-engine` supplies geocentric apparent ecliptic-of-date planet positions.
- Iterative Placidus houses use local apparent sidereal time and switch, with a visible label, to Whole Sign at |latitude| ≥ 66.5°.
- Luxon resolves local civil time through IANA/ICU rules, including Mongolia's past DST years and the western Hovd zone.
- The built-in 20-city list avoids geocoding; free-chart birth data stays in the browser.
- Unknown birth times are supported without inventing an Ascendant or houses.
- The SVG wheel is accompanied by a visible semantic table.

## Paid flow

- The free result includes the wheel plus Sun, Moon, and Ascendant summary.
- The full reading adds all planets and the strongest major aspects.
- QPay creates a separate natal product order at the server-owned price.
- Paid natal orders return the full report, generate a vector-wheel PDF, and send the full reading by email; the email path attempts to attach that PDF.
- Live QPay/Resend delivery still requires real merchant credentials and a public callback origin, so a real transaction was not performed locally.

## Verification

- TypeScript: pass
- ESLint: pass
- Unit tests: 16/16 pass
- Reference accuracy: 5 NASA/JPL Horizons DE441 charts × 10 bodies, every longitude within 0.1°
- Production build: pass
- Browser suite: pass at 320, 375, 768, 1024, and 1440 px
- Accessibility: zero serious/critical axe violations on tested product flows
- Speed: every local landing load reached network idle within the 5-second test budget
- Visual QA: two screenshot rounds at five widths; round-two scores are 10/10 at every width

## Owner review

1. Proofread `outputs/natal-texts-for-review.md`.
2. Confirm or change `NATAL_PRICE_MNT = 20000` in `lib/server.ts`.
3. Before launch, apply migration `drizzle/0002_safe_blue_marvel.sql` to the deployed D1 database.
4. Run one QPay sandbox payment and confirm callback, amount, report unlock, Resend delivery, attached PDF, and recovery flow.

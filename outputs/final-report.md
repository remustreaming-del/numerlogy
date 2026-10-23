# Natal redesign · final report

## Delivery

- Protected the original work on branch `redesign-natal` in checkpoint commit `062973f` before redesign edits.
- Rebuilt `/` as a two-product landing page and added `/etsgiin-kod` and `/natal` product routes.
- Rewrote `DESIGN.md` after comparing three dark celestial directions; selected Night Observatory.
- Set the independent server-side prices to ₮10,000 for Эцгийн код and ₮20,000 for the natal full reading, as confirmed for this deployment.
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
- Unit and reference tests: 39/39 pass
- Reference accuracy: 5 NASA/JPL Horizons DE441 charts × 10 bodies, every longitude within 0.1°
- Production build: pass
- Browser suite: pass at 320, 375, 768, 1024, and 1440 px
- Accessibility: zero serious/critical axe violations on tested product flows
- Speed: every local landing load reached network idle within the 5-second test budget
- Visual QA: two screenshot rounds at five widths; round-two scores are 10/10 at every width

## Cloudflare deployment · 2026-10-23

- Deployed Worker `toono` version `209d697b-2103-4b17-9d92-3e9cc233816a` to `www.numpath.site` and `numpath.site`.
- Production D1 binding points to `toono-db`; migration `drizzle/0002_safe_blue_marvel.sql` was applied remotely and all eight natal columns were verified.
- Existing Worker secrets were preserved. Live `/api/config` reports payments enabled, Эцгийн код at ₮10,000, and the natal full reading at ₮20,000.
- Post-deploy smoke checks passed for `/`, `/etsgiin-kod`, `/natal`, the config API, apex-to-www redirect, and a free natal chart render with its SVG and semantic table.
- No QPay charge was created during deployment verification.

## Owner review

1. Proofread `outputs/natal-texts-for-review.md`.
2. Run one QPay sandbox payment and confirm callback, amount, report unlock, Resend delivery, attached PDF, and recovery flow.

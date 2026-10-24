# Toono

A Mongolian-first, dark celestial site with two products:

- `/etsgiin-kod` — father/child numerology report, **₮10,000**.
- `/natal` — free natal wheel plus Sun, Moon, and Ascendant; full reading and PDF, **₮20,000**.

The landing route `/` presents both products. Prices are independent server constants in `lib/server.ts`.

## Natal calculation

- Planets use the MIT-licensed `astronomy-engine` (apparent, light-time and aberration corrected, ecliptic of date). Angles use apparent sidereal time with the **true** obliquity; the lunar node is the **true** (osculating) node.
- Accuracy gates in `tests/natal.test.mjs`: 5 charts vs NASA/JPL Horizons DE441 (planets ≤ 0.1°), 6 charts vs Swiss Ephemeris 2.10 (ASC, MC, all 12 Placidus cusps ≤ 0.03°, true node ≤ 0.05°). An offline 400-chart sweep against Swiss Ephemeris (1920–2030, latitudes −60…65°) gave max errors of 0.005° (planets), 0.004° (ASC/cusps), 0.01° (node). Swiss Ephemeris is **not** a dependency (AGPL); only the reference numbers are embedded.
- Houses: iterative Placidus semi-arcs; Whole Sign at |latitude| ≥ 66.5° or wherever a semi-arc is undefined, and the reading says so.
- Time: Luxon + IANA history. Covers Mongolia's DST years (1983–1998, 2001–2006, 2015–2016), `Asia/Hovd` for the western aimags, a skipped spring-forward time (moved forward and flagged) and a repeated fall-back time (summer-time occurrence used and flagged).
- Degrees are truncated, never rounded (29°59.9′ stays in its sign).
- Places: `lib/cities.ts` has all 21 aimag centres plus diaspora cities. «Өөр газар» accepts latitude, longitude and an IANA zone for soums and unlisted places. No geocoding request is ever made.
- Unknown time: noon positions, no ASC/MC/houses, and the reading reports when the Moon changes sign that day (with both texts).
- When a shift of ≤ 15 minutes in birth time would change the Ascendant sign, the chart and reading warn the customer.

## Natal reading (paid)

- Free (client): wheel, positions table, aspect list, Big Three short texts and element/modality balance — `lib/natal/free.ts`.
- Paid (server only): `lib/natal/reading.ts` assembles ~45–50 sections from `lib/natal/content/*` — overview (elements, modality, Moon phase, chart ruler, stelliums, hemispheres), Sun/Moon/ASC, every planet by sign + house + dignity + retrograde + angularity, MC and 10th ruler, true node, the 12 most relevant aspects, all 12 houses, strengths, challenges, synthesis and method. The browser never imports it; the free preview uses `POST /api/natal/preview` (only while payments are off). `npm run build` then `grep` of `dist/client` for a paid sentence must return nothing.
- Mongolian language rules, glossary, style guide and checklist: `.claude/skills/mongolian-natal-translation/`. Machine-readable glossary and licence registry: `knowledge/`.
- Names and signs are never declined at runtime by gluing suffixes; every substituted noun has hand-written case forms in `lib/natal/terms.ts`.
- `tests/natal-content.test.mjs` enforces coverage, approved terms, banned fatalistic/medical wording, Latin leakage, sentence counts, no reused sentences, and 300 generated readings that must match the chart data exactly and never repeat a long sentence more than twice.
- Proofreading: `node --experimental-strip-types scripts/export-natal-texts.mjs > outputs/natal-texts-for-review.md`; a full sample reading: `node --experimental-strip-types scripts/sample-natal-reading.mjs 1990-07-01 08:30 ulaanbaatar`.

## Payments and email

QPay credentials are read only on the server. The browser cannot set an amount. Set:

```text
PAYMENTS_ENABLED=true
QPAY_CLIENT_ID=...
QPAY_CLIENT_SECRET=...
QPAY_INVOICE_CODE=...
PUBLIC_ORIGIN=https://...
QPAY_SANDBOX=true
```

For delivery through Resend, also set `RESEND_API_KEY` and `EMAIL_FROM`. Natal email includes the full reading and attempts to attach the generated PDF. If PDF attachment generation fails, the reading email still sends and the authenticated report page remains downloadable.

Payment callbacks use a random hashed callback key and confirm the invoice server-to-server. Browser polling is a fallback when a callback is late. Access tokens are hashed in D1; unpaid orders never return report content.

## Local development

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Local variables live in ignored `.dev.vars`.

## Domain recovery

The production Worker has a recovery address at `https://toono.numpath-toono.workers.dev`.
Own-account builds explicitly keep `workers_dev` enabled alongside the custom domains.
If `numpath.site` stops resolving, check the domain registration and nameserver
delegation before redeploying the app. The assigned Cloudflare nameservers are
`jaziel.ns.cloudflare.com` and `teagan.ns.cloudflare.com`.

The `PUBLIC_ORIGIN` Worker secret controls new QPay callback URLs and natal PDF
font downloads. If the recovery address becomes the operating address, set this
secret to that HTTPS origin after its certificate is active; restore it to
`https://www.numpath.site` when the domain is restored. Existing QPay invoices
retain their original callback URL; browser payment polling remains available.

After building, apply D1 migrations in order for a fresh local database:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_loving_ricochet.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_father_child_email.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_safe_blue_marvel.sql
```

## Validation

```powershell
npx tsc --noEmit
npm run lint
node --experimental-strip-types --test tests/core.test.mjs tests/natal.test.mjs tests/natal-content.test.mjs
npm run build
$env:SCREENSHOT_ROUND='final'; python tests/browser.py
```

`tests/browser.py` checks both routes, five viewport widths, unknown-time behavior, SVG/table accessibility, a natal preview PDF, axe WCAG 2.2 AA findings, horizontal overflow, and a local speed budget. Visual evidence and the two scored review rounds are under `outputs/`.

Before launch, run a real QPay sandbox payment and confirm callback reachability, amount, email/PDF attachment, recovery access, and D1 migrations on the deployed environment. No branch is pushed or merged by this workflow.

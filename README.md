# Toono

A Mongolian-first, dark celestial site with two products:

- `/etsgiin-kod` — father/child numerology report, **₮20,000**.
- `/natal` — free natal wheel plus Sun, Moon, and Ascendant; full reading and PDF, **₮20,000**.

The landing route `/` presents both products. Prices are independent server constants in `lib/server.ts`.

## Natal calculation

- Sun, Moon, and planet positions use the MIT-licensed `astronomy-engine` package. Calculations are local/in-process and require no ephemeris API.
- Five committed charts compare all 10 planetary longitudes against NASA/JPL Horizons DE441 to within 0.1°.
- Houses use iterative Placidus semi-arcs. At |latitude| ≥ 66.5°, where Placidus is undefined, the engine labels and uses Whole Sign.
- Local birth times resolve with Luxon against the runtime's IANA/ICU history. Tests cover Mongolia's 1983–1998 and 2015–2016 daylight-saving periods and the western `Asia/Hovd` zone.
- Birthplaces come from `lib/cities.ts`. No geocoding request is made and free-chart birth data stays in the browser.
- Unknown times use local noon for approximate planetary positions and intentionally omit the Ascendant and houses.
- The SVG wheel is paired with a visible semantic table. Paid PDFs draw the wheel as vector geometry.

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
node --experimental-strip-types --test tests/core.test.mjs tests/natal.test.mjs
npm run build
$env:SCREENSHOT_ROUND='final'; python tests/browser.py
```

`tests/browser.py` checks both routes, five viewport widths, unknown-time behavior, SVG/table accessibility, a natal preview PDF, axe WCAG 2.2 AA findings, horizontal overflow, and a local speed budget. Visual evidence and the two scored review rounds are under `outputs/`.

Before launch, run a real QPay sandbox payment and confirm callback reachability, amount, email/PDF attachment, recovery access, and D1 migrations on the deployed environment. No branch is pushed or merged by this workflow.

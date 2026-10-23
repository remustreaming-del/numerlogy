# Toono — Эцгийн код (father–child numerology)

A responsive Mongolian-only website: father's and customer's names and birth dates + email → QPay → online report, downloadable PDF, and the same PDF emailed via Resend. Built with React, Vinext, Cloudflare D1, and pdf-lib. Fonts are self-hosted and PDFs embed a Cyrillic-compatible font.

## Report content

- Each birth date is digit-summed and reduced to 1–9 (no master numbers; the source texts cover 1–9 only).
- Parts I and II: father's and customer's number, verbatim from `text/ETSGIIN_KOD_9_BELGEDLIIN_TOO_FINANCIAL_RISKS_v2` (`lib/content.ts` → `numbers`).
- Part III: compatibility built from the `text/ETSGIIN_KOD_08-08_CUSTOMER` template. Per-number phrases live in `lib/content.ts` → `slots`; the 08 phrases are verbatim from that PDF, 1–7 and 9 were written from the Word file and should be proof-read. Hand-written pair titles go in `pairTitles` (only `8-8` exists). Tests assert 08–08 reproduces the source sentences.

## Email

Set `RESEND_API_KEY` and `EMAIL_FROM` (a sender on a Resend-verified domain). After QPay confirms payment the callback emails the PDF; if that fails, the next status check retries (claim-based, at most once per 5 minutes, with a Resend idempotency key). Status is stored in `orders.email_status` (`sending`/`sent`/`failed`). Without the keys, payment still works and no email is sent. Preview mode never sends email.

## Current state

The site is a **private preview**. No live payment credentials are configured. A clearly labeled free preview lets the owner test the entire report/download experience without charging money. The price is a single fixed **₮5,000** (`PRICE_MNT` in `lib/server.ts`). Reports use documented digit-sum numerology, retaining master numbers 11, 22, and 33. The name personalizes the report; birth date determines its numbers. Interpretations are for reflection, not predictions.

## Run locally

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:5173. Node 22.16 was used for verification. The site runs in preview mode without secrets. Local Cloudflare variables belong in ignored `.dev.vars`; `.env.example` lists the keys. Do not commit credentials.

## Activate QPay

1. Set the final report price and business/support/refund information. The current policy explicitly describes a preview; replace that section with the business's customer support, refund, and data-retention details before launch.
2. Obtain QPay Merchant V2 credentials: `QPAY_CLIENT_ID`, `QPAY_CLIENT_SECRET`, `QPAY_INVOICE_CODE`. Set them with the Sites runtime environment tool, never in browser code or Git.
3. Set `PUBLIC_ORIGIN` and `QPAY_SANDBOX=true` for merchant sandbox testing. `PUBLIC_ORIGIN` must be the actual externally reachable HTTPS origin.
4. Make the site publicly accessible when the owner is ready to launch. An owner-private Site blocks anonymous QPay callbacks, so a private Site cannot complete live checkout. Preserve private access until launch is requested.
5. Enable `PAYMENTS_ENABLED=true`, perform an end-to-end QPay sandbox payment, and verify the callback, MNT amount, saved order, recovery code, and downloads. Change `QPAY_SANDBOX=false` for production and verify one production transaction before inviting clients.

Merchant documentation: https://developer.qpay.mn/mn/docs/merchant?version=2.0.0

## Payment behavior

- Prices come from server configuration; client-supplied prices are ignored.
- QPay invoice creation returns the real QR image and bank deep links. No mock QR code is presented as a payment request.
- Invoices are simple QPay invoices **without e-barimt**: `calculate_vat` is `false` and no tax fields (`tax_customer_code`, `district_code`, `tax_type`, `lines`) are sent. Checkout and the policy tell customers no e-barimt receipt is issued.
- The callback contains a random secret, stored hashed. It triggers server-to-server `POST /v2/payment/check` for the stored invoice ID. Paid MNT rows must cover the order amount before the report is unlocked. Duplicate payment IDs are not counted twice.
- Browser status checks (the 4 s poll and the "Төлбөр шалгах" button) read the order record and, while it is pending, also run `POST /v2/payment/check` at most once per order per 10 s. This unlocks the report if the callback is late, lost, or cannot reach the server (e.g. local dev). Callback processing is idempotent after confirmation.
- A random order access token, stored hashed in D1, protects reports. The browser stores only the order ID/token. The recovery code is a bearer credential; anyone holding it can open that report.
- Pending orders never return report content. Free personalized preview is disabled when payment mode is enabled. The fictional sample remains available.
- Uncertain invoice creation is retained for merchant reconciliation rather than blindly retrying. Investigate using the QPay `sender_invoice_no` (order ID with hyphens removed). Do not ask a client to pay twice.
- Invoice creation has a small global rate cap. Higher-volume production use should add platform rate limits and operational monitoring.

## Database

Schema: `db/schema.ts`. Migrations: `drizzle/0000_loving_ricochet.sql`, `drizzle/0001_father_child_email.sql` (father name/birthday, email, email status). Sites provisions the `DB` binding and applies migrations on deployment. For a fresh local database:

```powershell
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_loving_ricochet.sql
```

Run each migration once per database. Paid reports are regenerated from stored names/dates, in Mongolian. Orders store the customer's email to deliver the report; it is shared only with Resend, never with QPay. Preview input is processed without database storage.

## Validation

```powershell
npx tsc --noEmit
node --experimental-strip-types --test tests/core.test.mjs
npm run build
python tests/browser.py
```

`tests/browser.py` predates the current single-card UI and the father–child form and needs updating before use. Browser tests require a running local dev server, the local D1 migration, Python Playwright, installed Chrome, and PyMuPDF. They exercise Mongolian report creation, desktop/mobile layouts, PDF and text downloads, dialogs, invalid input, origin checks, and paid/unpaid report access. Core tests check date arithmetic, master numbers, payment amounts/status/currency, and valid PDFs. Generated screenshots and test PDFs are in ignored `outputs/`.

Live QPay transactions remain untested until merchant credentials and a public callback origin are configured. The PDF font was visually checked after fixing a variable-font rendering issue.

The Sites Windows helper currently misresolves the npm shim on this machine; direct `npm run build` successfully produces the same configured Sites output. Source sync and publication use the supplied Sites workflow helper.

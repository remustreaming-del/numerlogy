# Design audit · resolved

## Baseline findings

- `app/page.tsx:1` — one client component owned the entire product, form, payment, report, and download flow; hierarchy and maintenance both suffered.
- `app/page.tsx:13` — native `type="date"` exposed a locale-dependent date presentation and did not match the Mongolian Он / Сар / Өдөр mental model.
- `app/globals.css:1` — the inherited chalk/lavender palette contradicted the requested dark mystical direction and mixed two visual systems.
- `/` — only one product was discoverable; there was no clear route model for two services.
- Natal chart — absent; no accessible chart/table pairing, unknown-time path, historical timezone handling, or polar fallback.

## Direction comparison

| Direction | Strength | Risk | Decision |
|---|---|---|---|
| Celestial editorial | Strong invitation and typographic identity | Too passive for dense chart data | Not selected |
| Night observatory | Precise chart structure, strong dark contrast, responsive instrument panel | Requires restrained decoration | Selected |
| Illuminated codex | Memorable luxury atmosphere | Ornament and glass effects compete with forms | Not selected |

## Implemented phases

### Phase 1 · Critical

- Added two-product landing architecture and direct routes.
- Replaced native dates with visible Он / Сар / Өдөр fields.
- Split product, report, chart, table, form, header, and date concerns into components.
- Added semantic headings, skip link, native controls, inline live messages, focus management, and visible focus states.
- Added SVG chart plus a visible table, not a visually-hidden fallback.

### Phase 2 · Refinement

- Established semantic dark-indigo, gold, text, state, and divider tokens.
- Standardized Cormorant/Noto type roles, 4/8 spacing rhythm, radii, control heights, and content measures.
- Added responsive outer-layout and chart-layout breakpoints based on actual content pressure.
- Added collision-aware radial lanes for close planet markers.

### Phase 3 · Polish

- Preserved the starfield while honoring reduced motion.
- Added explicit loading labels with ellipses, disabled states, preview labels, and status/error styling.
- Added table scrolling containment, tabular numeric columns, and dark native-control theming.

## Web Interface Guidelines review

### `app/globals.css`

✓ visible `:focus-visible` treatment; no `outline:none`; no `transition:all`; reduced motion present; dark `color-scheme` present; safe responsive gutters; no horizontal overflow at tested widths.

### `components/birth-date-fields.tsx`

✓ labelled native selects; explicit names; touch-sized controls; no placeholder-only labels.

### `components/natal/natal-flow.tsx`

✓ semantic form controls and buttons; email autocomplete/input mode/spellcheck; inline errors; busy labels; unknown-time alternative; fixed-size QR image.

### `components/natal/chart-wheel.tsx`

✓ SVG title/description; visible adjacent data table; decoration is not the sole data source.

### `components/site-header.tsx`

✓ links for navigation, descriptive brand label, consistent Lucide icon.

## Automated accessibility result

Zero serious or critical axe WCAG A/AA/2.1 AA/2.2 AA violations on the 375px natal result and 390px Эцгийн код flow. Raw reports are in `outputs/screenshots/round-2/`.

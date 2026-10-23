# Toono design system

## Product idea

Toono is a private, Mongolian-first place for reflective readings. The landing page presents two equal products: **Эцгийн код** at `/etsgiin-kod` and **Натал зураг** at `/natal`. The visual language should feel like a quiet night observatory: mystical enough to invite curiosity, precise enough to trust with dates, charts, payment, and a long report.

## Directions explored

1. **Celestial editorial** — oversized serif type, generous empty space, sparse constellations. Beautiful for marketing, but too passive once dense chart data appears.
2. **Night observatory — selected** — instrument-panel surfaces, crisp circular geometry, editorial headings, restrained gold. It gives the chart and its table equal authority and scales cleanly from phone to desktop.
3. **Illuminated codex** — ornamental gold frames, manuscript references, translucent layers. Memorable, but decoration competes with form labels and creates fragile dark-mode contrast.

The selected direction combines observatory structure with the warmth of an editorial reading. Decoration never carries meaning; the SVG wheel always has an adjacent semantic table.

## Colour tokens

| Token | Value | Purpose |
|---|---:|---|
| `--bg` | `#080819` | Night-sky canvas |
| `--bg-deep` | `#050511` | Deepest background |
| `--surface` | `#101025` | Primary panel |
| `--surface-raised` | `#17162F` | Inputs, table headers, raised cards |
| `--surface-soft` | `#1D1B37` | Secondary card |
| `--text` | `#F2EDDF` | Primary text |
| `--text-soft` | `#C5C0D1` | Body text |
| `--muted` | `#9995AC` | Metadata only; never small critical instructions |
| `--gold` | `#D5B66B` | Celestial points and primary actions |
| `--gold-bright` | `#ECD28D` | Hover, focus, emphasized values |
| `--violet` | `#8581D8` | Secondary data accent |
| `--line` | `#302E4A` | Dividers |
| `--line-strong` | `#4A4564` | Control boundaries |
| `--danger` | `#FFB5B8` | Error text |
| `--success` | `#B9E7C9` | Confirmation text |

Gold is not body-copy colour. It identifies celestial data, selected states, focus, and the one primary action in a region.

## Typography

- Display: self-hosted **Cormorant Garamond**, weights 500–600. Use for product names, reading titles, numbers, and large chart headings.
- Interface and body: self-hosted **Noto Sans**, weights 400–700. It supports Mongolian Cyrillic in the site and PDF.
- Minimum body size: 13px for secondary copy, 16px base. Long readings use a relaxed 1.7 line height and a narrow text measure.
- Headings use `text-wrap: balance`; numeric chart/table content uses tabular numerals.

## Layout and rhythm

- Maximum shell: 1200px; desktop gutters 24px, phone gutters 12–16px.
- Spacing follows a 4/8 rhythm, with primary section steps of 24, 32, 40, 64, and 88px.
- Radius: 8px controls, 16px internal panels, 24px product containers.
- Desktop product pages pair a sticky explanatory rail with the working panel. Below 900px they stack.
- Controls have a minimum 44px target; primary controls are 50px.

## Components

- **Site header:** compact brand and two direct product links. No hamburger is needed for two destinations.
- **Product card:** full-card link with number, Lucide icon, description, price state, and explicit “Нээх” affordance.
- **Date fields:** three labelled selects—Он, Сар, Өдөр—never a locale-dependent native date string.
- **Chart wheel:** supplementary SVG with circles, cusp lines, zodiac and planet symbols. It has an accessible title/description.
- **Positions table:** visible beside/below the wheel and independently keyboard-scrollable. This is the precise, screen-reader-friendly source.
- **Messages:** inline, live error/status feedback; errors receive focus after submit.
- **Reading:** calm single-column articles separated by lines, with no decorative motion.

## Interaction and accessibility

- Every interactive element uses a native button, link, input, or select.
- Focus is a 2px bright-gold outline with 4px offset and is never removed.
- The header includes a skip link. Headings remain hierarchical.
- Decorative Lucide icons are `aria-hidden`; icon meaning is repeated in visible text.
- The animated starfield is decorative and becomes static under `prefers-reduced-motion`.
- No interaction depends on hover, colour, drag, or a gesture alone.
- Unknown birth time is a first-class option; unavailable Ascendant/houses are stated rather than fabricated.

## Content voice

Mongolian copy is calm, direct, and non-deterministic. Interpretations describe tendencies and reflection prompts, not diagnoses or guaranteed events. The full reading always includes the disclaimer that astrology is symbolic reflection, not medical, legal, or financial advice.

## Product and price settings

- Эцгийн код: `ETSGIIN_PRICE_MNT = 10000`
- Натал зураг wheel + Sun/Moon/Ascendant: free
- Натал бүрэн тайлал: `NATAL_PRICE_MNT = 20000`

These are separate server-side constants in `lib/server.ts`; client-supplied amounts are ignored.

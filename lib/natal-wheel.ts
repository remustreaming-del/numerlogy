// Vector chart wheel shared by the reading PDF and the A3 poster. Client-safe (no interpretation text).
import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import type { NatalReading } from "./natal/reading-types.ts";
import { POINT_ABBR, SIGN_ABBR, type PointId } from "./natal/terms.ts";

export type WheelColors = { ink: RGB; muted: RGB; gold: RGB; panel: RGB; line: RGB; harmonious: RGB; challenging: RGB };
export type WheelOptions = {
  page: PDFPage;
  reading: NatalReading;
  font: PDFFont;
  measure: (text: string, size: number) => number;
  cx: number;
  cy: number;
  /** Outer radius in points; every other size scales with it (150 is the reference size). */
  outer: number;
  colors: WheelColors;
};

export function drawChartWheel({ page, reading, font, measure, cx, cy, outer, colors }: WheelOptions) {
  const { ink, muted, gold, panel, line, harmonious, challenging } = colors;
  const k = outer / 150, zodiacInner = 126 * k, inner = 78 * k;
  const rotation = reading.ascendant?.longitude ?? 0;
  const pt = (lon: number, radius: number) => { const a = (180 - (((lon - rotation) % 360) + 360) % 360) * Math.PI / 180; return { x: cx + Math.cos(a) * radius, y: cy - Math.sin(a) * radius }; };
  const label = (text: string, x: number, y: number, size: number, color: RGB) => page.drawText(text, { x: x - measure(text, size * k) / 2, y: y - size * k * 0.4, size: size * k, font, color });

  page.drawCircle({ x: cx, y: cy, size: outer, borderColor: gold, borderWidth: k });
  page.drawCircle({ x: cx, y: cy, size: zodiacInner, borderColor: line, borderWidth: .8 * k });
  page.drawCircle({ x: cx, y: cy, size: inner, borderColor: line, borderWidth: .8 * k });
  for (let index = 0; index < 12; index++) {
    page.drawLine({ start: pt(index * 30, zodiacInner), end: pt(index * 30, outer), color: line, thickness: .8 * k });
    const p = pt(index * 30 + 15, (outer + zodiacInner) / 2);
    label(SIGN_ABBR[index], p.x, p.y, 8, gold);
  }
  reading.houses?.forEach((cusp, index) => {
    page.drawLine({ start: pt(cusp.longitude, inner), end: pt(cusp.longitude, zodiacInner), color: index % 3 === 0 ? gold : line, thickness: (index % 3 === 0 ? 1.1 : .5) * k });
    const nextCusp = reading.houses![(index + 1) % 12].longitude, middle = cusp.longitude + ((((nextCusp - cusp.longitude) % 360) + 360) % 360) / 2;
    const p = pt(middle, inner + 8 * k);
    label(String(cusp.house), p.x, p.y, 6, muted);
  });
  for (const aspect of reading.aspects) {
    if (aspect.type === "conjunction") continue;
    const a = reading.planets.find((planet) => planet.id === aspect.a)!, b = reading.planets.find((planet) => planet.id === aspect.b)!;
    page.drawLine({ start: pt(a.longitude, inner - 3 * k), end: pt(b.longitude, inner - 3 * k), color: aspect.type === "trine" || aspect.type === "sextile" ? harmonious : challenging, thickness: .6 * k, opacity: Math.max(.3, 1 - aspect.orb / aspect.maxOrb) });
  }
  if (reading.ascendant && reading.midheaven) {
    page.drawLine({ start: pt(reading.ascendant.longitude, outer), end: pt(reading.ascendant.longitude + 180, outer), color: gold, thickness: 1.2 * k });
    page.drawLine({ start: pt(reading.midheaven.longitude, outer), end: pt(reading.midheaven.longitude + 180, outer), color: gold, thickness: .8 * k, dashArray: [3 * k, 2 * k] });
    for (const [lon, text] of [[reading.ascendant.longitude, "ASC"], [reading.midheaven.longitude, "MC"]] as const) { const p = pt(lon, outer + 12 * k); label(text, p.x, p.y, 7, gold); }
  }
  const bodies = [...reading.planets, reading.node].sort((a, b) => a.longitude - b.longitude);
  let previous = -99, lane = 0;
  for (const body of bodies) {
    lane = body.longitude - previous < 8 ? (lane + 1) % 3 : 0; previous = body.longitude;
    const p = pt(body.longitude, zodiacInner - 14 * k - lane * 12 * k);
    page.drawLine({ start: pt(body.longitude, zodiacInner), end: pt(body.longitude, zodiacInner - 5 * k), color: ink, thickness: .8 * k });
    page.drawCircle({ x: p.x, y: p.y, size: 7 * k, color: panel, borderColor: gold, borderWidth: .7 * k });
    label(POINT_ABBR[body.id as PointId], p.x, p.y, 6, ink);
  }
  if (!reading.houses) label("ЦАГГҮЙ", cx, cy, 9, muted);
}

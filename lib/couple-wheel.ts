// Vector synastry bi-wheel for the couple PDF. Client-safe (no interpretation text).
// Inner ring: person A's planets and houses; outer ring: person B's planets; centre: cross aspects.
import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import type { CoupleChart, CrossAspect } from "./couple/synastry.ts";
import { POINT_ABBR, SIGN_ABBR, type PointId } from "./natal/terms.ts";

export type BiWheelColors = { ink: RGB; muted: RGB; gold: RGB; violet: RGB; panel: RGB; line: RGB; harmonious: RGB; challenging: RGB };
export type BiWheelOptions = {
  page: PDFPage;
  couple: CoupleChart;
  aspects: CrossAspect[];
  font: PDFFont;
  measure: (text: string, size: number) => number;
  cx: number;
  cy: number;
  outer: number;
  colors: BiWheelColors;
};

const abbr = (id: string) => id === "ascendant" ? "ASC" : POINT_ABBR[id as PointId];

export function drawSynastryWheel({ page, couple, aspects, font, measure, cx, cy, outer, colors }: BiWheelOptions) {
  const { ink, muted, gold, violet, panel, line, harmonious, challenging } = colors;
  const k = outer / 150, zodiacInner = 128 * k, divider = 98 * k, inner = 66 * k;
  const rotation = couple.a.ascendant?.longitude ?? 0;
  const pt = (lon: number, radius: number) => { const angle = (180 - (((lon - rotation) % 360) + 360) % 360) * Math.PI / 180; return { x: cx + Math.cos(angle) * radius, y: cy - Math.sin(angle) * radius }; };
  const label = (text: string, x: number, y: number, size: number, color: RGB) => page.drawText(text, { x: x - measure(text, size * k) / 2, y: y - size * k * 0.4, size: size * k, font, color });

  page.drawCircle({ x: cx, y: cy, size: outer, borderColor: gold, borderWidth: k });
  for (const radius of [zodiacInner, divider, inner]) page.drawCircle({ x: cx, y: cy, size: radius, borderColor: line, borderWidth: .7 * k });
  for (let index = 0; index < 12; index++) {
    page.drawLine({ start: pt(index * 30, zodiacInner), end: pt(index * 30, outer), color: line, thickness: .7 * k });
    const p = pt(index * 30 + 15, (outer + zodiacInner) / 2);
    label(SIGN_ABBR[index], p.x, p.y, 7.5, gold);
  }
  couple.a.houses?.forEach((cusp, index) => page.drawLine({ start: pt(cusp.longitude, inner), end: pt(cusp.longitude, divider), color: index % 3 === 0 ? gold : line, thickness: (index % 3 === 0 ? 1 : .45) * k }));

  const position = (person: "a" | "b", id: string) => {
    const chart = person === "a" ? couple.a : couple.b;
    return id === "ascendant" ? chart.ascendant : chart.planets.find((planet) => planet.id === id);
  };
  for (const aspect of aspects) {
    const a = position("a", aspect.a), b = position("b", aspect.b);
    if (!a || !b || aspect.family === "conjunction") continue;
    page.drawLine({ start: pt(a.longitude, inner - 2 * k), end: pt(b.longitude, inner - 2 * k), color: aspect.family === "harmonious" ? harmonious : challenging, thickness: .7 * k, opacity: Math.max(.35, aspect.strength) });
  }

  const ring = (person: "a" | "b", radius: number, color: RGB) => {
    const chart = person === "a" ? couple.a : couple.b;
    const bodies = [...chart.planets, ...(chart.ascendant ? [chart.ascendant] : [])].sort((x, y) => x.longitude - y.longitude);
    let previous = -99, lane = 0;
    for (const body of bodies) {
      lane = body.longitude - previous < 8 ? (lane + 1) % 2 : 0; previous = body.longitude;
      const p = pt(body.longitude, radius - lane * 11 * k);
      page.drawCircle({ x: p.x, y: p.y, size: 6.5 * k, color: panel, borderColor: color, borderWidth: .8 * k });
      label(abbr(body.id), p.x, p.y, body.id === "ascendant" ? 4.5 : 5.5, ink);
    }
  };
  ring("b", zodiacInner - 9 * k, violet);
  ring("a", divider - 9 * k, gold);
  if (!couple.a.houses) label("ЦАГГҮЙ", cx, cy, 8, muted);
}

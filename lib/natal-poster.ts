// A3 chart-wheel poster (PDF). Built in the browser from chart geometry only: no interpretation text.
import { drawChartWheel } from "./natal-wheel.ts";
import { sanitize } from "./natal-pdf.ts";
import { mongolYearOf } from "./natal/mongol-year.ts";
import type { NatalReading } from "./natal/reading-types.ts";
import { ELEMENT_NAMES, HOUSE_SYSTEM_NAMES, signPhrase, type Element } from "./natal/terms.ts";

const ELEMENTS: Element[] = ["fire", "earth", "air", "water"];

export async function makeNatalPoster(reading: NatalReading, fontBytes: ArrayBuffer | Uint8Array) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const ink = rgb(.93, .91, .82), muted = rgb(.70, .69, .78), gold = rgb(.83, .68, .36), panel = rgb(.055, .05, .14), line = rgb(.24, .22, .36);
  const colors = { ink, muted, gold, panel, line, harmonious: rgb(.45, .62, .86), challenging: rgb(.82, .42, .42) };
  const W = 841.89, H = 1190.55;
  const page = document.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: panel });
  page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: gold, borderWidth: 1 });
  page.drawRectangle({ x: 36, y: 36, width: W - 72, height: H - 72, borderColor: line, borderWidth: .6 });

  const widths = new Map<string, number>();
  const measure = (text: string, size: number) => { let total = 0; for (const character of text) { if (!widths.has(character)) widths.set(character, font.widthOfTextAtSize(character, 1)); total += widths.get(character)!; } return total * size; };
  const center = (raw: string, size: number, color: typeof ink, y: number, x = W / 2) => { const text = sanitize(raw); page.drawText(text, { x: x - measure(text, size) / 2, y, size, font, color }); };

  center("T O O N O", 13, gold, H - 96);
  center(reading.input.name, 44, ink, H - 160);
  center(`${reading.input.birthDate} · ${reading.input.unknownTime ? "төрсөн цаггүй" : reading.input.birthTime} · ${reading.city.name}`, 15, muted, H - 196);

  drawChartWheel({ page, reading, font, measure, cx: W / 2, cy: H - 540, outer: 272, colors });

  // Big Three
  const [sun, moon] = reading.planets;
  const three = [["Нар", signPhrase(sun.signIndex)], ["Сар", signPhrase(moon.signIndex)], ...(reading.ascendant ? [["Мандах орд", signPhrase(reading.ascendant.signIndex)]] : [])];
  const columnWidth = (W - 120) / three.length;
  three.forEach(([label, value], index) => {
    const x = 60 + columnWidth * (index + .5);
    center(label.toUpperCase(), 11, gold, 330, x);
    center(value, 22, ink, 300, x);
  });
  page.drawLine({ start: { x: 120, y: 270 }, end: { x: W - 120, y: 270 }, color: line, thickness: .6 });

  // Element balance bars
  const total = Object.values(reading.balance.elements).reduce((sum, value) => sum + value, 0) || 1;
  ELEMENTS.forEach((element, index) => {
    const x = 120 + index * ((W - 240) / 4), width = (W - 240) / 4 - 20, share = reading.balance.elements[element] / total;
    center(ELEMENT_NAMES[element].nom, 11, muted, 232, x + width / 2);
    page.drawRectangle({ x, y: 208, width, height: 8, color: line });
    page.drawRectangle({ x, y: 208, width: Math.max(width * share, 2), height: 8, color: gold });
  });

  const year = reading.mongolYear ?? mongolYearOf(reading.input.birthDate);
  center(`Монгол зурхай · ${year.title} жил`, 14, ink, 150);
  center(`Тропик зодиак · ${HOUSE_SYSTEM_NAMES[reading.houseSystem]} · Toono`, 9, muted, 70);
  document.setTitle(`Натал зургийн постер · ${reading.input.name}`);
  document.setAuthor("Toono");
  return document.save();
}

import { selectCrossAspects } from "./couple/select.ts";
import type { CoupleReading } from "./couple/reading-types.ts";
import { COUPLE_GROUPS } from "./couple/reading-types.ts";
import { METRIC_NAMES } from "./couple/free.ts";
import { METRICS } from "./couple/synastry.ts";
import { drawSynastryWheel } from "./couple-wheel.ts";
import { sanitize } from "./natal-pdf.ts";

export async function makeCouplePdf(reading: CoupleReading, fontBytes: ArrayBuffer | Uint8Array) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const ink = rgb(.93, .91, .82), muted = rgb(.70, .69, .78), gold = rgb(.83, .68, .36), violet = rgb(.56, .54, .88), panel = rgb(.055, .05, .14), line = rgb(.24, .22, .36);
  const harmonious = rgb(.45, .62, .86), challenging = rgb(.82, .42, .42);
  const W = 595.28, H = 841.89, M = 54;
  let page = document.addPage([W, H]), y = H - 60;
  const paint = () => page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: panel });
  const next = () => { page = document.addPage([W, H]); paint(); y = H - 60; };
  paint();

  const widths = new Map<string, number>();
  const measure = (text: string, size: number) => { let total = 0; for (const character of text) { if (!widths.has(character)) widths.set(character, font.widthOfTextAtSize(character, 1)); total += widths.get(character)!; } return total * size; };
  const write = (raw: string, size = 10, color = muted, after = 8, x = M, maxWidth = W - 2 * M, leading = 1.62) => {
    const text = sanitize(raw);
    let row = "";
    const draw = () => { if (y < 70) next(); page.drawText(row, { x, y, size, font, color }); y -= size * leading; };
    for (const word of text.split(/\s+/)) { const part = row ? ` ${word}` : word; if (measure(row + part, size) <= maxWidth) row += part; else { if (row) draw(); row = word; } }
    if (row) draw();
    y -= after;
  };
  const facts = (chart: CoupleReading["a"]) => `${chart.input.name} · ${chart.input.birthDate} · ${chart.input.unknownTime ? "төрсөн цаггүй" : chart.input.birthTime} · ${chart.city.name}`;

  // ---- cover
  write("TOONO · ХОСЫН ЗУРХАЙ", 10, gold, 18);
  write("Хоёр тэнгэрийн уулзвар", 26, ink, 4);
  write(`${reading.a.input.name} ба ${reading.b.input.name}`, 15, ink, 6);
  write(facts(reading.a), 9, gold, 0);
  write(facts(reading.b), 9, violet, 8);
  if (reading.preview) write("Туршилтын хувилбар · Төлбөр төлөөгүй", 9, muted, 4);

  // ---- bi-wheel (vectors only)
  const cx = W / 2, cy = 470, outer = 150;
  drawSynastryWheel({ page, couple: reading, aspects: selectCrossAspects(reading).map((item) => item.aspect), font, measure, cx, cy, outer, colors: { ink, muted, gold, violet, panel, line, harmonious, challenging } });
  y = cy - outer - 22;
  const legend = `Дотор цагираг: ${reading.a.input.name} · Гадна цагираг: ${reading.b.input.name}`;
  page.drawText(sanitize(legend), { x: W / 2 - measure(sanitize(legend), 8) / 2, y, size: 8, font, color: muted });
  y -= 30;

  // ---- scores
  write("Нийцлийн үзүүлэлтүүд (санамсаргүй хосуудтай харьцуулсан хувь)", 11, ink, 6);
  for (const metric of METRICS) {
    if (y < 80) next();
    const score = reading.scores[metric].score, barX = M + 170, barW = W - 2 * M - 210;
    page.drawText(sanitize(METRIC_NAMES[metric]), { x: M, y, size: 9, font, color: muted });
    page.drawRectangle({ x: barX, y: y - 1, width: barW, height: 7, color: line });
    page.drawRectangle({ x: barX, y: y - 1, width: barW * score / 100, height: 7, color: metric === "tension" ? challenging : gold });
    page.drawText(`${score}/100`, { x: barX + barW + 8, y, size: 9, font, color: ink });
    y -= 18;
  }
  y -= 8;

  // ---- reading
  for (const group of COUPLE_GROUPS) {
    const sections = reading.sections.filter((section) => section.group === group.id);
    if (!sections.length) continue;
    if (y < 190) next();
    y -= 6;
    page.drawLine({ start: { x: M, y: y + 18 }, end: { x: W - M, y: y + 18 }, color: line, thickness: .6 });
    write(group.title.toUpperCase(), 9, gold, 8);
    for (const section of sections) {
      if (y < 140) next();
      write(section.title, 14, ink, 2);
      if (section.meta) write(section.meta, 8.5, gold, 4);
      for (const paragraph of section.paragraphs) write(paragraph, 10, muted, 6);
      y -= 6;
    }
  }

  const total = document.getPageCount();
  document.getPages().forEach((item, index) => item.drawText(`Toono · Хосын зурхай · ${index + 1} / ${total}`, { x: M, y: 30, size: 8, font, color: muted }));
  document.setTitle(`Хосын зурхай · ${reading.a.input.name} ба ${reading.b.input.name}`);
  document.setAuthor("Toono");
  return document.save();
}

import type { NatalReading } from "./natal/reading-types.ts";
import { READING_GROUPS } from "./natal/reading-types.ts";
import { drawChartWheel } from "./natal-wheel.ts";
import { house } from "./natal/terms.ts";

// Noto Sans has no astrological glyphs: they are replaced or dropped so the PDF never shows empty boxes.
export const sanitize = (text: string) => text.replace(/[☉☽☿♀♂♃♄♅♆♇☊♈-♓]/gu, "").replace(/☌/g, "—").replace(/[⚹△□☍]/g, "·").replace(/≈/g, "~").replace(/−/g, "-").replace(/\s{2,}/g, " ").trim();

export async function makeNatalPdf(reading: NatalReading, fontBytes: ArrayBuffer | Uint8Array) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const ink = rgb(.93, .91, .82), muted = rgb(.70, .69, .78), gold = rgb(.83, .68, .36), panel = rgb(.055, .05, .14), line = rgb(.24, .22, .36);
  const harmonious = rgb(.45, .62, .86), challenging = rgb(.82, .42, .42);
  const W = 595.28, H = 841.89, M = 54;
  let page = document.addPage([W, H]), y = H - 60;
  const paint = () => page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: panel });
  const next = () => { page = document.addPage([W, H]); paint(); y = H - 60; };
  paint();

  // Per-character width cache keeps layout cheap on the Workers CPU budget.
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

  // ---- cover
  write("TOONO · НАТАЛ ЗУРАГ", 10, gold, 18);
  write("Тэнгэрийн хөрөг", 26, ink, 4);
  write(reading.input.name, 15, ink, 4);
  write(`${reading.input.birthDate} · ${reading.input.unknownTime ? "төрсөн цаггүй" : reading.input.birthTime} · ${reading.city.name}`, 9, muted, 10);

  // ---- wheel (vectors only)
  const cx = W / 2, cy = 520, outer = 150;
  drawChartWheel({ page, reading, font, measure, cx, cy, outer, colors: { ink, muted, gold, panel, line, harmonious, challenging } });

  // ---- positions table
  y = cy - outer - 34;
  write("Гараг ба цэгүүдийн байрлал", 12, ink, 4);
  const rows = [...(reading.ascendant ? [reading.ascendant] : []), ...(reading.midheaven ? [reading.midheaven] : []), ...reading.planets, reading.node];
  const columnWidth = (W - 2 * M) / 2;
  rows.forEach((row, index) => {
    const column = index % 2, x = M + column * columnWidth;
    if (column === 0 && index > 0) y -= 14;
    if (y < 70) next();
    const text = `${row.name} — ${row.sign} ${row.degree}°${String(row.minute).padStart(2, "0")}′${row.retrograde && row.id !== "node" ? " ℞" : ""}${row.house ? ` · ${house(row.house).short}` : ""}`;
    page.drawText(sanitize(text), { x, y, size: 8.5, font, color: muted });
  });
  y -= 24;
  if (reading.notices.length) write(reading.notices.map((notice) => notice.text).join(" "), 8, muted, 10);

  // ---- reading
  for (const group of READING_GROUPS) {
    const sections = reading.sections.filter((section) => (section.group ?? "intro") === group.id);
    if (!sections.length) continue;
    if (y < 190) next();
    y -= 6;
    page.drawLine({ start: { x: M, y: y + 18 }, end: { x: W - M, y: y + 18 }, color: line, thickness: .6 });
    write(group.title.toUpperCase(), 9, gold, 8);
    for (const section of sections) {
      if (y < 140) next();
      write(section.title, 14, ink, 2);
      if (section.meta) write(section.meta, 8.5, gold, 4);
      const paragraphs = section.paragraphs ?? ((section as { body?: string }).body ? [(section as { body?: string }).body!] : []);
      for (const paragraph of paragraphs) write(paragraph, 10, muted, 6);
      y -= 6;
    }
  }

  const total = document.getPageCount();
  document.getPages().forEach((item, index) => item.drawText(`Toono · Натал зураг · ${index + 1} / ${total}`, { x: M, y: 30, size: 8, font, color: muted }));
  document.setTitle(`Натал зураг · ${reading.input.name}`);
  document.setAuthor("Toono");
  return document.save();
}

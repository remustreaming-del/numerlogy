import type { NatalReading } from "./natal/reading-types.ts";
import { READING_GROUPS } from "./natal/reading-types.ts";
import { POINT_ABBR, SIGN_ABBR, house, type PointId } from "./natal/terms.ts";

// Noto Sans has no astrological glyphs: they are replaced or dropped so the PDF never shows empty boxes.
const sanitize = (text: string) => text.replace(/[☉☽☿♀♂♃♄♅♆♇☊♈-♓]/gu, "").replace(/☌/g, "—").replace(/[⚹△□☍]/g, "·").replace(/≈/g, "~").replace(/−/g, "-").replace(/\s{2,}/g, " ").trim();

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
  const center = (raw: string, size: number, color: typeof ink, atY: number) => { const text = sanitize(raw); page.drawText(text, { x: (W - measure(text, size)) / 2, y: atY, size, font, color }); };

  // ---- cover
  write("TOONO · НАТАЛ ЗУРАГ", 10, gold, 18);
  write("Тэнгэрийн хөрөг", 26, ink, 4);
  write(reading.input.name, 15, ink, 4);
  write(`${reading.input.birthDate} · ${reading.input.unknownTime ? "төрсөн цаггүй" : reading.input.birthTime} · ${reading.city.name}`, 9, muted, 10);

  // ---- wheel (vectors only)
  const cx = W / 2, cy = 520, outer = 150, zodiacInner = 126, inner = 78;
  const rotation = reading.ascendant?.longitude ?? 0;
  const pt = (lon: number, radius: number) => { const a = (180 - (((lon - rotation) % 360) + 360) % 360) * Math.PI / 180; return { x: cx + Math.cos(a) * radius, y: cy - Math.sin(a) * radius }; };
  page.drawCircle({ x: cx, y: cy, size: outer, borderColor: gold, borderWidth: 1 });
  page.drawCircle({ x: cx, y: cy, size: zodiacInner, borderColor: line, borderWidth: .8 });
  page.drawCircle({ x: cx, y: cy, size: inner, borderColor: line, borderWidth: .8 });
  for (let index = 0; index < 12; index++) {
    page.drawLine({ start: pt(index * 30, zodiacInner), end: pt(index * 30, outer), color: line, thickness: .8 });
    const label = pt(index * 30 + 15, (outer + zodiacInner) / 2), text = SIGN_ABBR[index];
    page.drawText(text, { x: label.x - measure(text, 8) / 2, y: label.y - 3, size: 8, font, color: gold });
  }
  reading.houses?.forEach((cusp, index) => {
    page.drawLine({ start: pt(cusp.longitude, inner), end: pt(cusp.longitude, zodiacInner), color: index % 3 === 0 ? gold : line, thickness: index % 3 === 0 ? 1.1 : .5 });
    const nextCusp = reading.houses![(index + 1) % 12].longitude, middle = cusp.longitude + ((((nextCusp - cusp.longitude) % 360) + 360) % 360) / 2, label = pt(middle, inner + 8), text = String(cusp.house);
    page.drawText(text, { x: label.x - measure(text, 6) / 2, y: label.y - 2, size: 6, font, color: muted });
  });
  for (const aspect of reading.aspects) {
    if (aspect.type === "conjunction") continue;
    const a = reading.planets.find((planet) => planet.id === aspect.a)!, b = reading.planets.find((planet) => planet.id === aspect.b)!;
    page.drawLine({ start: pt(a.longitude, inner - 3), end: pt(b.longitude, inner - 3), color: aspect.type === "trine" || aspect.type === "sextile" ? harmonious : challenging, thickness: .6, opacity: Math.max(.3, 1 - aspect.orb / aspect.maxOrb) });
  }
  if (reading.ascendant && reading.midheaven) {
    page.drawLine({ start: pt(reading.ascendant.longitude, outer), end: pt(reading.ascendant.longitude + 180, outer), color: gold, thickness: 1.2 });
    page.drawLine({ start: pt(reading.midheaven.longitude, outer), end: pt(reading.midheaven.longitude + 180, outer), color: gold, thickness: .8, dashArray: [3, 2] });
    for (const [lon, text] of [[reading.ascendant.longitude, "ASC"], [reading.midheaven.longitude, "MC"]] as const) { const p = pt(lon, outer + 12); page.drawText(text, { x: p.x - measure(text, 7) / 2, y: p.y - 2.5, size: 7, font, color: gold }); }
  }
  const bodies = [...reading.planets, reading.node].sort((a, b) => a.longitude - b.longitude);
  let previous = -99, lane = 0;
  for (const body of bodies) {
    lane = body.longitude - previous < 8 ? (lane + 1) % 3 : 0; previous = body.longitude;
    const radius = zodiacInner - 14 - lane * 12, p = pt(body.longitude, radius), tick = pt(body.longitude, zodiacInner);
    page.drawLine({ start: tick, end: pt(body.longitude, zodiacInner - 5), color: ink, thickness: .8 });
    page.drawCircle({ x: p.x, y: p.y, size: 7, color: panel, borderColor: gold, borderWidth: .7 });
    const text = POINT_ABBR[body.id as PointId];
    page.drawText(text, { x: p.x - measure(text, 6) / 2, y: p.y - 2, size: 6, font, color: ink });
  }
  if (!reading.houses) center("ЦАГГҮЙ", 9, muted, cy - 3);

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

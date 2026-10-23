import type { NatalReading } from "./astrology";

export async function makeNatalPdf(reading: NatalReading, fontBytes: ArrayBuffer | Uint8Array) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const document = await PDFDocument.create(); document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const ink = rgb(.93, .91, .82), muted = rgb(.68, .67, .76), gold = rgb(.83, .68, .36), panel = rgb(.055, .05, .14), line = rgb(.2, .18, .32);
  let page = document.addPage([595.28, 841.89]), y = 790;
  const next = () => { page = document.addPage([595.28, 841.89]); page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: panel }); y = 790; };
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: panel });
  const widths = new Map<string, number>();
  const measure = (text: string, size: number) => { let total = 0; for (const character of text) { if (!widths.has(character)) widths.set(character, font.widthOfTextAtSize(character, 1)); total += widths.get(character)!; } return total * size; };
  const write = (text: string, size = 10, color = muted, after = 10, x = 48, maxWidth = 499) => {
    let row = "";
    const draw = () => { if (y < 65) next(); page.drawText(row, { x, y, size, font, color }); y -= size * 1.7; };
    for (const word of text.split(/\s+/)) { const part = row ? ` ${word}` : word; if (measure(row + part, size) <= maxWidth) row += part; else { if (row) draw(); row = word; } }
    if (row) draw(); y -= after;
  };
  write("TOONO · НАТАЛ ЗУРАГ", 11, gold, 5); write(`${reading.input.name}-ийн төрсөн агшны тэнгэр`, 23, ink, 3); write(`${reading.input.birthDate} · ${reading.input.unknownTime ? "төрсөн цаггүй" : reading.input.birthTime} · ${reading.city.name}`, 9, muted, 18);
  const cx = 297.5, cy = 545, outer = 128, inner = 72, rotation = reading.ascendant?.longitude ?? 0;
  page.drawCircle({ x: cx, y: cy, size: outer, borderColor: gold, borderWidth: 1 }); page.drawCircle({ x: cx, y: cy, size: inner, borderColor: line, borderWidth: 1 });
  const pt = (lon: number, radius: number) => { const a = (180 - (((lon - rotation) % 360 + 360) % 360)) * Math.PI / 180; return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }; };
  for (let index = 0; index < 12; index++) { const a = pt(index * 30, inner), b = pt(index * 30, outer); page.drawLine({ start: a, end: b, color: line, thickness: index % 3 === 0 ? 1.2 : .5 }); }
  for (const planet of reading.planets) { const p = pt(planet.longitude, 94); page.drawCircle({ x: p.x, y: p.y, size: 4, color: gold }); }
  if (reading.ascendant) { const left = pt(reading.ascendant.longitude, outer), right = pt(reading.ascendant.longitude + 180, outer); page.drawLine({ start: left, end: right, color: gold, thickness: 1.4 }); }
  y = 382; write(reading.note, 9, muted, 18);
  for (const section of reading.sections) { if (y < 135) next(); write(section.title, 14, ink, 4); write(section.body, 10, muted, 14); }
  document.getPages().forEach((item, index) => item.drawText(`toono · Натал зураг  |  ${index + 1} / ${document.getPageCount()}`, { x: 48, y: 28, size: 8, font, color: muted }));
  document.setTitle(`${reading.input.name} · Натал зураг`); document.setAuthor("Toono");
  return document.save();
}

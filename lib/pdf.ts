import type { Report } from "./numerology";
export async function makePdf(report: Report, fontBytes: ArrayBuffer | Uint8Array) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(`Эцгийн код · ${report.pairCode} ${report.pairTitle}`); doc.setAuthor("Toono");
  const ink = rgb(.16,.15,.25), muted = rgb(.37,.36,.43), accent = rgb(.45,.38,.56), lavender = rgb(.94,.92,.98);
  let page = doc.addPage([595.28,841.89]), y = 770;
  const next = () => { page = doc.addPage([595.28,841.89]); y=770; };
  // widthOfTextAtSize re-lays out the whole string (~5 ms per call); cached per-character widths keep the PDF fast enough for a Worker.
  const charWidths = new Map<string, number>();
  const measure = (text: string, size: number) => { let w = 0; for (const ch of text) { let cw = charWidths.get(ch); if (cw === undefined) { cw = font.widthOfTextAtSize(ch, 1); charWidths.set(ch, cw); } w += cw; } return w * size; };
  const write = (text: string, size=11, color=ink, space=14, x=48, width=499) => {
    let line="";
    const draw = () => { if(y<65) next(); page.drawText(line,{x,y,size,font,color}); y-=size*1.65; };
    for(const word of text.split(/\s+/)) {
      const piece = line ? ` ${word}` : word;
      if(measure(line+piece,size)<=width){line+=piece;continue;}
      if(line){draw();line="";}
      for(const char of word){if(line && measure(line+char,size)>width){draw();line="";}line+=char;}
    }
    if(line)draw();y-=space;
  };
  write("toono · ЭЦГИЙН КОД",22);
  write(report.preview?"Туршилтын тайлан · Төлбөр төлөөгүй":"Таны хувийн тайлал",10,muted);
  write(`${report.pairCode}  ${report.pairTitle}`,20,ink,6);
  write(report.pairSubtitle,10,muted,18);
  page.drawRectangle({x:40,y:y-78,width:515,height:88,color:lavender});
  ([["Аавын тоо",report.father],["Таны тоо",report.child]] as const).forEach(([label,person],i)=>{const x=62+i*255;page.drawText(`${String(person.number).padStart(2,"0")} ${person.title}`,{x,y:y-25,size:20,font,color:ink});page.drawText([label,person.name,person.birthday].filter(Boolean).join(" · ").slice(0,60),{x,y:y-53,size:9,font,color:muted});});y-=112;
  for(const part of report.parts){
    if(y<220)next();
    write(part.kicker.toUpperCase(),9,accent,2);write(part.heading,16,ink,6);
    if(part.lead)write(part.lead,10,muted,16);
    for(const section of part.sections){
      if(y<150)next();write(section.title,13,ink,3);
      if(section.text)write(section.text,10.5,muted,14);
      section.items?.forEach((item,i)=>{if(y<110)next();write(`${String(i+1).padStart(2,"0")}  ${item.title}`,10,ink,1,60,487);write(item.text,10,muted,10,60,487);});
      if(section.items)y-=6;
    }
    if(part.note)write(part.note,10,accent,24);
  }
  if(y<150)next();write("Тооцооллын тухай",12);write(report.method,9,muted);
  doc.getPages().forEach((p,i)=>{p.drawLine({start:{x:48,y:43},end:{x:547,y:43},color:lavender});p.drawText(`toono · Эцгийн код  |  ${i+1} / ${doc.getPageCount()}`,{x:48,y:27,size:9,font,color:muted});});return doc.save();
}
export function downloadFile(data:BlobPart,type:string,filename:string){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}

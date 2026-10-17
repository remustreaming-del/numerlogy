import type { Report } from "./numerology";
export async function makePdf(report: Report, fontBytes: ArrayBuffer) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(`${report.name} — Тоон зурхай`); doc.setAuthor("Toono");
  const ink = rgb(.16,.15,.25), muted = rgb(.37,.36,.43), lavender = rgb(.94,.92,.98);
  let page = doc.addPage([595.28,841.89]), y = 770;
  const next = () => { page = doc.addPage([595.28,841.89]); y=770; };
  const write = (text: string, size=11, color=ink, space=14) => {
    let line="";
    const draw = () => { if(y<65) next(); page.drawText(line,{x:48,y,size,font,color}); y-=size*1.65; };
    for(const word of text.split(/\s+/)) {
      if(line && font.widthOfTextAtSize(`${line} ${word}`,size)>499){draw();line="";}
      for(const char of (line?` ${word}`:word)){if(font.widthOfTextAtSize(line+char,size)>499){draw();line="";}line+=char;}
    }
    if(line)draw();y-=space;
  };
  write("toono",28);
  write(report.preview?"Туршилтын тайлан · Төлбөр төлөөгүй":"Таны хувийн тоон зурхай",10,muted);
  write(report.name,26);write(`${report.birthday}  |  ${report.year}`,10,muted);
  page.drawRectangle({x:40,y:y-78,width:515,height:88,color:lavender});
  const labels=["Амьдралын зам","Төрсөн өдөр","Хувийн жил"];
  [report.lifePath,report.birthNumber,report.personalYear].forEach((n,i)=>{page.drawText(String(n),{x:62+i*170,y:y-25,size:30,font,color:ink});page.drawText(labels[i],{x:62+i*170,y:y-53,size:10,font,color:muted});});y-=112;
  write(report.introduction,11,muted,24);
  for(const section of report.sections){if(y<160)next();write(section.title,16,ink,3);write(section.text,11,muted,23);}
  if(y<180)next();write("Тооцооллын тухай",14);write(report.method,9,muted);
  doc.getPages().forEach((p,i)=>{p.drawLine({start:{x:48,y:43},end:{x:547,y:43},color:lavender});p.drawText(`toono  |  ${i+1} / ${doc.getPageCount()}`,{x:48,y:27,size:9,font,color:muted});});return doc.save();
}
export function downloadFile(data:BlobPart,type:string,filename:string){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}

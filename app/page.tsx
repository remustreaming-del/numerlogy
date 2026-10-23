"use client";
import { useEffect,useRef,useState,type FormEvent } from "react";
import { ArrowLeft,ArrowRight,Download } from "lucide-react";
import type { Details,Report } from "@/lib/numerology";
import { lifePath,numberTitles,pad,pairHeading } from "@/lib/codes";
import { Starfield } from "@/components/starfield";
type Invoice={id:string;amount:number;qr_image:string;urls:{name:string;description:string;link:string}[]};
type Saved={id:string;token:string};
type OrderResponse={status:string;report:Report;invoice:Invoice;amount:number;email:string|null;emailEnabled:boolean};
type Step="dates"|"details"|"pay"|"report";
const storageKey="toono-etsgiin-kod-v1";
const money=(n:number)=>`₮${n.toLocaleString("en-US")}`;
async function api<T=OrderResponse>(path:string,options?:RequestInit){const response=await fetch(path,options);const data=await response.json() as T & {error?:string};if(!response.ok)throw new Error(data.error||"Дахин оролдоно уу.");return data;}
function DateField({id,label,value,max,onChange}:{id:string;label:string;value:string;max:string;onChange:(v:string)=>void}){return <label className="date-field" htmlFor={id}><span className={value?"filled":""}>{label}</span><input id={id} type="date" className={value?"has-value":""} min="1900-01-01" max={max} required value={value} onChange={e=>onChange(e.target.value)}/></label>;}
export default function Home(){
  const [step,setStep]=useState<Step>("dates"),[details,setDetails]=useState<Details>({fatherName:"",fatherBirthday:"",name:"",birthday:"",email:""});
  const [config,setConfig]=useState<{live:boolean;price:number}|null>(null),[invoice,setInvoice]=useState<Invoice|null>(null),[saved,setSaved]=useState<Saved|null>(null),[report,setReport]=useState<Report|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const attempt=useRef<{fingerprint:string;order:Saved}|null>(null);
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Ulaanbaatar"});
  useEffect(()=>{fetch("/api/config").then(r=>{if(!r.ok)throw new Error();return r.json() as Promise<{live:boolean;price:number}>;}).then(setConfig).catch(()=>setError("Төлбөрийн хэсгийг ачаалж чадсангүй. Хуудсыг дахин ачаална уу."));try{const value=localStorage.getItem(storageKey);if(value){const p=JSON.parse(value);if(typeof p.id==="string"&&typeof p.token==="string")setSaved(p);}}catch{}},[]);
  useEffect(()=>{if(step!=="pay"||!invoice||!saved)return;let active=true;const timer=setInterval(async()=>{if(document.hidden)return;try{const data=await api(`/api/orders/${saved.id}`,{headers:{Authorization:`Bearer ${saved.token}`}});if(active&&data.status==="paid")unlock(data);}catch{}},4000);return()=>{active=false;clearInterval(timer);};},[step,invoice,saved]);
  function go(next:Step){setStep(next);setError("");setNotice("");window.scrollTo({top:0});}
  function remember(order:Saved){setSaved(order);try{localStorage.setItem(storageKey,JSON.stringify(order));}catch{}}
  function unlock(data:OrderResponse){setReport(data.report);go("report");setNotice(data.emailEnabled&&data.email?`Тайлалыг ${data.email} хаяг руу илгээлээ. Ирээгүй бол spam хавтсаа шалгана уу.`:"");}
  function showCode(event:FormEvent){event.preventDefault();if(details.fatherBirthday>=details.birthday){setError("Аавын төрсөн огноо таны төрсөн огнооноос өмнө байх ёстой.");return;}go("details");}
  async function submit(event:FormEvent){event.preventDefault();setError("");setNotice("");setBusy(true);try{if(!config)throw new Error("Төлбөрийн хэсэг ачаалж байна.");if(!config.live){go("pay");return;}const fingerprint=JSON.stringify(details);const order=attempt.current?.fingerprint===fingerprint?attempt.current.order:{id:crypto.randomUUID(),token:crypto.randomUUID()};attempt.current={fingerprint,order};remember(order);const result=await api<Invoice>("/api/orders",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":order.id,Authorization:`Bearer ${order.token}`},body:JSON.stringify(details)});setInvoice(result);go("pay");}catch(e){setError(e instanceof Error?e.message:"Дахин оролдоно уу.");}finally{setBusy(false);}}
  async function preview(){setBusy(true);setError("");try{setReport(await api<Report>("/api/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(details)}));go("report");}catch(e){setError(e instanceof Error?e.message:"Дахин оролдоно уу.");}finally{setBusy(false);}}
  async function check(order:Saved){setBusy(true);setError("");setNotice("");try{const data=await api(`/api/orders/${order.id}`,{headers:{Authorization:`Bearer ${order.token}`}});if(data.status==="paid"&&data.report)unlock(data);else if(data.invoice){setInvoice({...data.invoice,id:order.id,amount:data.amount});go("pay");setNotice("Төлбөр хараахан баталгаажаагүй байна. Төлсөн бол түр хүлээнэ үү. Давхар бүү төлөөрэй.");}else throw new Error("Нэхэмжлэх бэлтгэгдэж байна. Түр хүлээнэ үү.");}catch(e){setError(e instanceof Error?e.message:"Тайланг нээх боломжгүй байна.");}finally{setBusy(false);}}
  async function download(target:Report){setBusy(true);setError("");try{const {makePdf,downloadFile}=await import("@/lib/pdf");const font=await fetch("/fonts/NotoSans-Regular.ttf");if(!font.ok)throw new Error();downloadFile(await makePdf(target,await font.arrayBuffer()) as BlobPart,"application/pdf",`etsgiin-kod-${target.pairCode.replace("–","-")}.pdf`);}catch{setError("Файлыг бэлтгэж чадсангүй. Дахин оролдоно уу.");}finally{setBusy(false);}}
  const set=(key:keyof Details)=>(value:string)=>setDetails({...details,[key]:value});
  const price=money(invoice?.amount??config?.price??10000);
  const f=details.fatherBirthday?lifePath(details.fatherBirthday):0,c=details.birthday?lifePath(details.birthday):0,heading=f&&c?pairHeading(f,c):null;
  return <><Starfield/>
  <main className={`stage${step==="report"?" wide":""}`}><div className="panel">
  {step==="dates"&&<form onSubmit={showCode} className="intro">
    <p className="kicker">{"эцгийн код"}</p><h1 className="title-gap">{"Таны ЭЦГИЙН КОД юу вэ?"}</h1>
    <DateField id="father-birthday" label="Аавын төрсөн он, сар, өдөр" value={details.fatherBirthday} max={today} onChange={set("fatherBirthday")}/>
    <DateField id="birthday" label="Таны төрсөн он, сар, өдөр" value={details.birthday} max={today} onChange={set("birthday")}/>
    <button className="cta">{"Миний кодыг харах"}<ArrowRight size={20}/></button>
    {saved&&<button type="button" className="link-button" disabled={busy} onClick={()=>check(saved)}>{"Өмнөх тайлал нээх"}</button>}
  </form>}
  {step==="details"&&heading&&<form onSubmit={submit} className="intro">
    <button type="button" className="back" onClick={()=>go("dates")}><ArrowLeft size={18}/>{"Огноо засах"}</button>
    <p className="kicker">{"таны код"}</p><p className="code">{heading.code}</p><h1 className="code-title">{heading.title}</h1>
    <p className="lede">{`Аавын тоо ${pad(f)} ${numberTitles[f]} · Таны тоо ${pad(c)} ${numberTitles[c]}. Бүрэн тайлалд хоёр тооны мөн чанар, эд баялгийн зангилаа, тэнцвэрийн түлхүүр багтана.`}</p>
    <input aria-label="Имэйл" placeholder="Имэйл хаяг" type="email" autoComplete="email" inputMode="email" maxLength={254} required value={details.email} onChange={e=>set("email")(e.target.value)}/>
    <p className="hint">{"Төлбөр баталгаажмагц тайлалыг энэ хаяг руу илгээнэ."}</p>
    <div className="price-row"><span>{"Эцгийн код · бүрэн тайлал"}</span><strong>{price}</strong></div>
    <button className="cta" disabled={busy||!config}>{busy?"Бэлтгэж байна…":"QPay-ээр төлөх"}<ArrowRight size={20}/></button>
  </form>}
  {step==="pay"&&<div className="intro"><button className="back" onClick={()=>go("details")}><ArrowLeft size={18}/>{"Буцах"}</button><p className="kicker">{"төлбөр"}</p><h1>{price}</h1>{!config?.live?<div className="preview-box"><p>{"Туршилтын горим. Төлбөр авахгүй, имэйл илгээхгүй."}</p><button className="cta" disabled={busy} onClick={preview}>{busy?"Бэлтгэж байна…":"Тайлал үзэх"}<ArrowRight size={20}/></button></div>:invoice&&<><div className="qr-area"><img src={`data:image/png;base64,${invoice.qr_image}`} alt="QPay QR" width={232} height={232}/><p>{"QR кодыг банкны аппаар уншуулна уу"}</p></div><div className="bank-links">{invoice.urls.filter(b=>/^[a-z][a-z0-9+.-]*:\/\//i.test(b.link)&&!/^(javascript|data|file|vbscript):/i.test(b.link)).map(b=><a key={b.name} href={b.link} rel="noreferrer">{b.description||b.name}</a>)}</div><button className="cta" disabled={busy} onClick={()=>saved&&check(saved)}>{busy?"Шалгаж байна…":"Төлбөр шалгах"}</button></>}</div>}
  {step==="report"&&report&&<><div className="report-heading"><p className="kicker">{"эцгийн код"}</p><h1>{`${report.pairCode} ${report.pairTitle}`}</h1><span>{report.pairSubtitle}</span></div><ReportContent report={report}/><div className="download-actions"><button className="cta" disabled={busy} onClick={()=>download(report)}><Download size={20}/>{busy?"Бэлтгэж байна…":"PDF татах"}</button></div><button className="link-button" onClick={()=>{setReport(null);setInvoice(null);go("dates");}}>{"Шинэ тайлал"}</button></>}
  {error&&<p className="error-message" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
  </div></main></>;
}
function ReportContent({report:r}:{report:Report}){return <div className="report-content"><div className="number-summary">{[[pad(r.father.number),`Аавын тоо · ${r.father.title}`],[pad(r.child.number),`Таны тоо · ${r.child.title}`],[r.pairCode,"Хоёр тооны уулзвар"]].map(([n,label])=><div key={label}><strong>{n}</strong><span>{label}</span></div>)}</div><blockquote className="report-quote">{`“${r.quote}”`}</blockquote>
  {r.parts.map(part=><article key={part.kicker} className="report-part"><p className="part-kicker">{part.kicker}</p><h3>{part.heading}</h3>{part.lead&&<p className="report-intro">{part.lead}</p>}{part.sections.map(s=><section key={s.title}><h4>{s.title}</h4>{s.text&&<p>{s.text}</p>}{s.items&&<ol className="knot-list">{s.items.map((item,i)=><li key={item.title}><span>{pad(i+1)}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></li>)}</ol>}</section>)}{part.note&&<p className="part-note">{part.note}</p>}</article>)}
  <p className="method-note">{r.method}</p></div>}

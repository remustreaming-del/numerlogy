"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Download, LockKeyhole, ShieldCheck } from "lucide-react";
import { BirthDateFields } from "@/components/birth-date-fields";
import { ChartWheel } from "./chart-wheel";
import { PositionsTable } from "./positions-table";
import { MONGOLIAN_CITIES } from "@/lib/cities";
import { calculateNatalChart, createNatalReading, formatLongitude, type NatalChart, type NatalInput, type NatalReading } from "@/lib/astrology";
import { downloadFile } from "@/lib/pdf";

type Invoice = { id: string; amount: number; qr_image: string; urls: { name: string; description: string; link: string }[] };
type Saved = { id: string; token: string };
type Config = { live: boolean; natalPrice: number };
type OrderResponse = { status: string; amount: number; invoice: Invoice | null; report: NatalReading | null; email: string | null; emailEnabled: boolean };
const storageKey = "toono-natal-v1";
const money = (amount: number) => new Intl.NumberFormat("mn-MN", { style: "currency", currency: "MNT", maximumFractionDigits: 0 }).format(amount);

async function api<T>(path: string, options?: RequestInit) { const response = await fetch(path, options); const data = await response.json() as T & { error?: string }; if (!response.ok) throw new Error(data.error || "Дахин оролдоно уу."); return data; }

export function NatalFlow() {
  const [input, setInput] = useState<NatalInput>({ name: "", email: "", birthDate: "", birthTime: "12:00", cityId: "ulaanbaatar", unknownTime: false });
  const [chart, setChart] = useState<NatalChart | null>(null), [reading, setReading] = useState<NatalReading | null>(null), [config, setConfig] = useState<Config | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null), [saved, setSaved] = useState<Saved | null>(null), [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null), attempt = useRef<{ fingerprint: string; order: Saved } | null>(null);
  useEffect(() => {
    fetch("/api/config").then((response) => response.json() as Promise<Config>).then(setConfig).catch(() => setError("Төлбөрийн тохиргоог ачаалж чадсангүй."));
    const timer = window.setTimeout(() => { try { const stored = localStorage.getItem(storageKey); if (stored) setSaved(JSON.parse(stored)); } catch { /* optional */ } }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (!invoice || !saved || reading) return; const timer = setInterval(async () => { if (document.hidden) return; try { const data = await api<OrderResponse>(`/api/orders/${saved.id}`, { headers: { Authorization: `Bearer ${saved.token}` } }); if (data.status === "paid" && data.report) { setReading(data.report); setCheckout(false); setNotice(data.emailEnabled && data.email ? `Бүрэн тайлалыг ${data.email} хаяг руу илгээлээ.` : "Төлбөр баталгаажлаа."); } } catch { /* manual retry remains */ } }, 4000); return () => clearInterval(timer); }, [invoice, saved, reading]);
  const change = <K extends keyof NatalInput>(key: K, value: NatalInput[K]) => setInput((current) => ({ ...current, [key]: value }));

  function calculate(event: FormEvent) { event.preventDefault(); setError(""); try { setChart(calculateNatalChart(input)); setReading(null); setCheckout(false); requestAnimationFrame(() => document.getElementById("chart-result")?.focus()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Мэдээллээ шалгана уу."); } }

  async function startPayment(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!config || !chart) throw new Error("Тохиргоо ачаалж байна.");
      if (!config.live) { setReading({ ...createNatalReading(input), preview: true }); setCheckout(false); return; }
      const fingerprint = JSON.stringify(input), order = attempt.current?.fingerprint === fingerprint ? attempt.current.order : { id: crypto.randomUUID(), token: crypto.randomUUID() };
      attempt.current = { fingerprint, order }; setSaved(order); localStorage.setItem(storageKey, JSON.stringify(order));
      const result = await api<Invoice>("/api/natal/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": order.id, Authorization: `Bearer ${order.token}` }, body: JSON.stringify(input) });
      setInvoice(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Төлбөр эхлүүлж чадсангүй."); } finally { setBusy(false); }
  }

  async function check() { if (!saved) return; setBusy(true); setError(""); try { const data = await api<OrderResponse>(`/api/orders/${saved.id}`, { headers: { Authorization: `Bearer ${saved.token}` } }); if (data.report) { setReading(data.report); setCheckout(false); } else setNotice("Төлбөр хараахан баталгаажаагүй байна."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Захиалгыг шалгаж чадсангүй."); } finally { setBusy(false); } }
  async function download() { if (!reading) return; setBusy(true); try { const [{ makeNatalPdf }, font] = await Promise.all([import("@/lib/natal-pdf"), fetch("/fonts/NotoSans-Regular.ttf")]); downloadFile(await makeNatalPdf(reading, await font.arrayBuffer()) as BlobPart, "application/pdf", `natal-${reading.input.birthDate}.pdf`); } catch { setError("PDF бэлтгэж чадсангүй."); } finally { setBusy(false); } }

  const price = money(config?.natalPrice ?? 20000);
  return <>
    {!chart && <form className="natal-form" onSubmit={calculate} noValidate>
      <div className="form-heading"><p className="eyebrow">ТӨРСӨН МЭДЭЭЛЭЛ</p><h1>Төрсөн агшны тэнгэрээ нээ.</h1><p>Бүх тооцоо энэ сайт дотор хийгдэнэ. Төрсөн газар хайлтын үйлчилгээ рүү илгээгдэхгүй.</p></div>
      <label htmlFor="natal-name">Таны нэр</label><input id="natal-name" name="name" autoComplete="name" required maxLength={80} value={input.name} onChange={(event) => change("name", event.target.value)} placeholder="Нэрээ оруулна уу…" />
      <BirthDateFields legend="Төрсөн огноо" value={input.birthDate} onChange={(value) => change("birthDate", value)} />
      <label htmlFor="birth-city">Төрсөн хот</label><select id="birth-city" name="birthCity" value={input.cityId} onChange={(event) => change("cityId", event.target.value)}>{MONGOLIAN_CITIES.map((city) => <option value={city.id} key={city.id}>{city.name} · {city.province}</option>)}</select>
      <div className="time-row"><label htmlFor="birth-time"><span>Төрсөн цаг</span><input id="birth-time" name="birthTime" type="time" value={input.birthTime} disabled={input.unknownTime} required={!input.unknownTime} onChange={(event) => change("birthTime", event.target.value)} /></label><label className="check-label"><input type="checkbox" checked={input.unknownTime} onChange={(event) => change("unknownTime", event.target.checked)} /><span>Төрсөн цагаа мэдэхгүй</span></label></div>
      <p className="field-hint">Төрсөн цаггүй бол Асцендент ба гэрүүд гарахгүй; Сар ойролцоогоор харагдана.</p>
      <button className="button primary wide">Натал зургаа гаргах <ArrowRight aria-hidden="true" /></button>
      <p className="secure-note"><ShieldCheck aria-hidden="true" /> Орон нутгийн хотын жагсаалт · IANA цагийн түүх</p>
    </form>}

    {chart && <section id="chart-result" className="chart-result" tabIndex={-1}>
      <button className="back-button" onClick={() => { setChart(null); setReading(null); setCheckout(false); setInvoice(null); }}><ArrowLeft aria-hidden="true" /> Мэдээлэл засах</button>
      <div className="chart-heading"><div><p className="eyebrow">{chart.input.name.toUpperCase()} · НАТАЛ ЗУРАГ</p><h1>Таны төрсөн агшны тэнгэр</h1><p>{chart.input.birthDate} · {chart.input.unknownTime ? "төрсөн цаггүй" : chart.input.birthTime} · {chart.city.name}</p></div><span className="system-badge">{chart.houseSystem === "placidus" ? "PLACIDUS" : chart.houseSystem === "whole-sign" ? "WHOLE SIGN" : "TIME UNKNOWN"}</span></div>
      <div className="chart-layout"><ChartWheel chart={chart} /><PositionsTable chart={chart} /></div>
      <p className="chart-note">{chart.note}</p>
      <div className="free-reading"><p className="eyebrow">ҮНЭГҮЙ ТОВЧ ТАЙЛАЛ</p><div className="trinity-grid">{[chart.planets[0], chart.planets[1], chart.ascendant].map((position, index) => position ? <article key={position.id}><span>{position.glyph}</span><p>{["Нар", "Сар", "Асцендент"][index]}</p><h2>{position.sign}</h2><small>{formatLongitude(position)}</small></article> : <article className="muted-card" key="unknown-asc"><span>—</span><p>Асцендент</p><h2>Тодорхойгүй</h2><small>Төрсөн цаг шаардлагатай</small></article>)}</div></div>
      {!reading && !checkout && <div className="unlock-panel"><div><LockKeyhole aria-hidden="true" /><p className="eyebrow">БҮРЭН ТАЙЛАЛ</p><h2>Бүх гараг, гэр, гол аспектуудаа уншаарай.</h2><p>PDF зурагтай тайлан болон имэйл хувилбар.</p></div><button className="button primary" onClick={() => setCheckout(true)}>Бүрэн тайлал · {price}</button></div>}
      {checkout && !reading && <form className="checkout-panel" onSubmit={startPayment}><button type="button" className="back-button" onClick={() => { setCheckout(false); setInvoice(null); }}><ArrowLeft aria-hidden="true" /> Зураг руу буцах</button><h2>Бүрэн тайлалаа авах</h2><label htmlFor="natal-email">Имэйл хаяг</label><input id="natal-email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} value={input.email} onChange={(event) => change("email", event.target.value)} required placeholder="name@example.com" /><div className="price-row"><span>Натал · Бүрэн тайлал</span><strong>{price}</strong></div>{!invoice ? <button className="button primary wide" disabled={busy}>{busy ? "Бэлтгэж байна…" : config?.live ? "QPay-ээр төлөх" : "Туршилтын тайлал нээх"}</button> : <><div className="qr-area"><img src={`data:image/png;base64,${invoice.qr_image}`} alt="QPay төлбөрийн QR код" width={232} height={232} /></div><button type="button" className="button primary wide" disabled={busy} onClick={check}>{busy ? "Шалгаж байна…" : "Төлбөр шалгах"}</button></>}</form>}
      {reading && <div className="full-reading"><div className="reading-heading"><p className="eyebrow">БҮРЭН ТАЙЛАЛ</p><h2>{reading.input.name}-ийн тэнгэрийн хөрөг</h2>{reading.preview && <span>Туршилтын хувилбар · Төлбөр төлөөгүй</span>}</div>{reading.sections.map((section) => <article key={section.id}><h3>{section.title}</h3><p>{section.body}</p></article>)}<div className="download-row"><button className="button primary" disabled={busy} onClick={download}><Download aria-hidden="true" />{busy ? "Бэлтгэж байна…" : "Зурагтай PDF татах"}</button></div></div>}
    </section>}
    {error && <p className="message error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}{notice && <p className="message success" role="status">{notice}</p>}
  </>;
}

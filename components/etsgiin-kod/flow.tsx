"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { BankLinks, type BankLink } from "@/components/bank-links";
import { BirthDateFields } from "@/components/birth-date-fields";
import { EtsgiinReportContent } from "./report-content";
import type { Details, Report } from "@/lib/numerology";
import { lifePath, numberTitles, pad, pairHeading } from "@/lib/codes";

type Invoice = { id: string; amount: number; qr_image: string; urls: BankLink[] };
type Saved = { id: string; token: string };
type OrderResponse = { status: string; report: Report; invoice: Invoice; amount: number; email: string | null; emailEnabled: boolean };
type Step = "dates" | "details" | "pay" | "report";
const storageKey = "toono-etsgiin-kod-v2";
const money = (amount: number) => new Intl.NumberFormat("mn-MN", { style: "currency", currency: "MNT", maximumFractionDigits: 0 }).format(amount);

async function api<T = OrderResponse>(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Дахин оролдоно уу.");
  return data;
}

export function EtsgiinKodFlow() {
  const [step, setStep] = useState<Step>("dates");
  const [details, setDetails] = useState<Details>({ fatherName: "", fatherBirthday: "", name: "", birthday: "", email: "" });
  const [config, setConfig] = useState<{ live: boolean; etsgiinPrice: number } | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null), [saved, setSaved] = useState<Saved | null>(null), [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const attempt = useRef<{ fingerprint: string; order: Saved } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function unlock(data: OrderResponse) { setReport(data.report); setStep("report"); setNotice(data.emailEnabled && data.email ? `Тайланг ${data.email} хаяг руу илгээлээ.` : ""); }

  useEffect(() => {
    fetch("/api/config").then((response) => response.json() as Promise<{ live: boolean; etsgiinPrice: number }>).then(setConfig).catch(() => setError("Төлбөрийн тохиргоог ачаалж чадсангүй."));
    const timer = window.setTimeout(() => { try { const value = localStorage.getItem(storageKey); if (value) setSaved(JSON.parse(value)); } catch { /* storage is optional */ } }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (step !== "pay" || !invoice || !saved) return;
    const timer = window.setInterval(async () => {
      if (document.hidden) return;
      try { const data = await api(`/api/orders/${saved.id}`, { headers: { Authorization: `Bearer ${saved.token}` } }); if (data.status === "paid") unlock(data); } catch { /* manual retry remains available */ }
    }, 4000);
    return () => clearInterval(timer);
  }, [step, invoice, saved]);

  const set = (key: keyof Details) => (value: string) => setDetails((current) => ({ ...current, [key]: value }));
  const go = (next: Step) => { setStep(next); setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remember = (order: Saved) => { setSaved(order); try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch { /* optional */ } };
  function showCode(event: FormEvent) {
    event.preventDefault();
    if (details.fatherBirthday >= details.birthday) return setError("Аавын төрсөн огноо таны төрсөн огнооноос өмнө байх ёстой.");
    go("details");
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!config) throw new Error("Төлбөрийн тохиргоо ачаалж байна.");
      if (!config.live) return go("pay");
      const fingerprint = JSON.stringify(details);
      const order = attempt.current?.fingerprint === fingerprint ? attempt.current.order : { id: crypto.randomUUID(), token: crypto.randomUUID() };
      attempt.current = { fingerprint, order }; remember(order);
      const result = await api<Invoice>("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": order.id, Authorization: `Bearer ${order.token}` }, body: JSON.stringify(details) });
      setInvoice(result); go("pay");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Дахин оролдоно уу."); } finally { setBusy(false); }
  }

  async function preview() {
    setBusy(true); setError("");
    try { setReport(await api<Report>("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) })); go("report"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Дахин оролдоно уу."); } finally { setBusy(false); }
  }

  async function check(order: Saved) {
    setBusy(true); setError("");
    try { const data = await api(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${order.token}` } }); if (data.status === "paid" && data.report) unlock(data); else if (data.invoice) { setInvoice({ ...data.invoice, id: order.id, amount: data.amount }); go("pay"); setNotice("Төлбөр хараахан баталгаажаагүй байна."); } else throw new Error("Захиалгыг сэргээж чадсангүй."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Тайланг нээж чадсангүй."); } finally { setBusy(false); }
  }

  async function download(target: Report) {
    setBusy(true); setError("");
    try { const { makePdf, downloadFile } = await import("@/lib/pdf"); const font = await fetch("/fonts/NotoSans-Regular.ttf"); downloadFile(await makePdf(target, await font.arrayBuffer()) as BlobPart, "application/pdf", `etsgiin-kod-${target.pairCode.replace("·", "-")}.pdf`); }
    catch { setError("PDF бэлтгэж чадсангүй. Дахин оролдоно уу."); } finally { setBusy(false); }
  }

  const father = details.fatherBirthday ? lifePath(details.fatherBirthday) : 0, child = details.birthday ? lifePath(details.birthday) : 0;
  const heading = father && child ? pairHeading(father, child) : null;
  const price = money(invoice?.amount ?? config?.etsgiinPrice ?? 20000);

  return <div className="flow-card">
    <ol className="stepper" aria-label="Үйл явц"><li aria-current={step === "dates" ? "step" : undefined}>01 <span>Огноо</span></li><li aria-current={step === "details" ? "step" : undefined}>02 <span>Код</span></li><li aria-current={step === "pay" ? "step" : undefined}>03 <span>Төлбөр</span></li><li aria-current={step === "report" ? "step" : undefined}>04 <span>Тайлал</span></li></ol>
    {step === "dates" && <form onSubmit={showCode} className="flow-form">
      <p className="eyebrow">ЭЦГИЙН КОД</p><h1>Таны Эцгийн код юу вэ?</h1><p className="form-intro">Хоёр төрсөн огноог оруулж, 81 бэлгэдлийн хослолоос өөрийн кодоо нээнэ үү.</p>
      <BirthDateFields legend="Аавын төрсөн огноо" value={details.fatherBirthday} onChange={set("fatherBirthday")} />
      <BirthDateFields legend="Таны төрсөн огноо" value={details.birthday} onChange={set("birthday")} />
      <button className="button primary wide" type="submit">Миний кодыг харах <ArrowRight aria-hidden="true" /></button>
      {saved && <button type="button" className="text-button" disabled={busy} onClick={() => check(saved)}>Өмнөх тайлалаа нээх</button>}
    </form>}
    {step === "details" && heading && <form onSubmit={submit} className="flow-form">
      <button type="button" className="back-button" onClick={() => go("dates")}><ArrowLeft aria-hidden="true" /> Огноо засах</button>
      <p className="eyebrow">ТАНЫ КОД</p><p className="code-mark">{heading.code}</p><h1>{heading.title}</h1>
      <p className="form-intro">Аавын тоо {pad(father)} {numberTitles[father]} · Таны тоо {pad(child)} {numberTitles[child]}.</p>
      <label htmlFor="etsgiin-email">Имэйл хаяг</label><input id="etsgiin-email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} required value={details.email} onChange={(event) => set("email")(event.target.value)} placeholder="name@example.com" />
      <p className="field-hint">Төлбөр баталгаажмагц тайлалыг энэ хаяг руу илгээнэ.</p>
      <div className="price-row"><span>Эцгийн код · Бүрэн тайлал</span><strong>{price}</strong></div>
      <button className="button primary wide" disabled={busy || !config}>{busy ? "Бэлтгэж байна…" : "QPay-ээр төлөх"}<ArrowRight aria-hidden="true" /></button>
    </form>}
    {step === "pay" && <section className="flow-form"><button className="back-button" onClick={() => go("details")}><ArrowLeft aria-hidden="true" /> Буцах</button><p className="eyebrow">ТӨЛБӨР</p><h1>{price}</h1>
      {!config?.live ? <div className="preview-box"><p>Туршилтын горим: төлбөр авахгүй, имэйл илгээхгүй.</p><button className="button primary wide" disabled={busy} onClick={preview}>{busy ? "Бэлтгэж байна…" : "Тайлалыг туршиж үзэх"}</button></div> : invoice && <><div className="qr-area"><img src={`data:image/png;base64,${invoice.qr_image}`} alt="QPay төлбөрийн QR код" width={232} height={232} /><p>Банкны апп-аар QR кодыг уншуулна уу.</p></div><BankLinks urls={invoice.urls} /><button className="button primary wide" disabled={busy} onClick={() => saved && check(saved)}>{busy ? "Шалгаж байна…" : "Төлбөр шалгах"}</button></>}
    </section>}
    {step === "report" && report && <section className="report-view"><div className="report-title"><p className="eyebrow">ЭЦГИЙН КОД</p><h1>{report.pairCode} {report.pairTitle}</h1><p>{report.pairSubtitle}</p></div><EtsgiinReportContent report={report} /><button className="button primary" disabled={busy} onClick={() => download(report)}><Download aria-hidden="true" />{busy ? "Бэлтгэж байна…" : "PDF татах"}</button><button className="text-button" onClick={() => { setReport(null); setInvoice(null); go("dates"); }}>Шинэ тайлал</button></section>}
    {error && <p className="message error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}{notice && <p className="message success" role="status">{notice}</p>}
  </div>;
}

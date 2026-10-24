"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Download, LockKeyhole, ShieldCheck } from "lucide-react";
import { BankLinks, type BankLink } from "@/components/bank-links";
import { BirthDateFields } from "@/components/birth-date-fields";
import { BirthTimeFields } from "@/components/birth-time-fields";
import { ChartWheel } from "./chart-wheel";
import { FreeSummary } from "./free-summary";
import { EMPTY_PLACE, PlaceFields } from "./place-fields";
import { PositionsTable } from "./positions-table";
import { ReadingView } from "./reading-view";
import { CUSTOM_PLACE_ID } from "@/lib/cities";
import { calculateNatalChart, type CustomPlace, type NatalChart, type NatalInput } from "@/lib/astrology";
import type { NatalReading } from "@/lib/natal/reading-types";
import { PAID_CONTENTS } from "@/lib/natal/free";
import { downloadFile } from "@/lib/pdf";

type Invoice = { id: string; amount: number; qr_image: string; urls: BankLink[] };
type Saved = { id: string; token: string };
type Config = { live: boolean; natalPrice: number };
type OrderResponse = { status: string; amount: number; invoice: Invoice | null; report: NatalReading | null; email: string | null; emailEnabled: boolean; emailStatus: string | null };
type FormState = Omit<NatalInput, "place"> & { place: CustomPlace };

const storageKey = "toono-natal-v1";
const money = (amount: number) => `${new Intl.NumberFormat("en-US").format(amount)}₮`;

async function api<T>(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Дахин оролдоно уу.");
  return data;
}

/** The request body the server validates: custom coordinates only when "Өөр газар" is chosen. */
function toInput(form: FormState): NatalInput {
  const { place, ...rest } = form;
  return rest.cityId === CUSTOM_PLACE_ID ? { ...rest, place } : rest;
}

export function NatalFlow() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", birthDate: "", birthTime: "", cityId: "ulaanbaatar", unknownTime: false, place: EMPTY_PLACE });
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [reading, setReading] = useState<NatalReading | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const attempt = useRef<{ fingerprint: string; order: Saved } | null>(null);

  useEffect(() => {
    fetch("/api/config").then((response) => response.json() as Promise<Config>).then(setConfig).catch(() => setError("Төлбөрийн тохиргоог ачаалж чадсангүй."));
    const timer = window.setTimeout(() => { try { const stored = localStorage.getItem(storageKey); if (stored) setSaved(JSON.parse(stored)); } catch { /* storage is optional */ } }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  // Poll every 4 s while the invoice is open and the tab is visible.
  useEffect(() => {
    if (!invoice || !saved || reading) return;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const data = await api<OrderResponse>(`/api/orders/${saved.id}`, { headers: { Authorization: `Bearer ${saved.token}` } });
        if (data.status === "paid" && data.report) { setReading(data.report); setCheckout(false); setNotice(data.emailStatus === "sent" && data.email ? `Бүрэн тайлалыг ${data.email} хаяг руу илгээлээ.` : "Төлбөр баталгаажлаа."); }
      } catch { /* the manual check button remains */ }
    }, 4000);
    return () => clearInterval(timer);
  }, [invoice, saved, reading]);

  const change = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  function calculate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      setChart(calculateNatalChart(toInput(form)));
      setReading(null); setCheckout(false); setInvoice(null);
      requestAnimationFrame(() => document.getElementById("chart-result")?.focus());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Мэдээллээ шалгана уу."); }
  }

  async function startPayment(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (!config || !chart) throw new Error("Тохиргоо ачаалж байна.");
      const input = toInput(form);
      if (!config.live) {
        const preview = await api<NatalReading>("/api/natal/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
        setReading(preview); setCheckout(false);
        requestAnimationFrame(() => document.querySelector<HTMLElement>(".full-reading")?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
      const fingerprint = JSON.stringify(input);
      const order = attempt.current?.fingerprint === fingerprint ? attempt.current.order : { id: crypto.randomUUID(), token: crypto.randomUUID() };
      attempt.current = { fingerprint, order };
      setSaved(order);
      try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch { /* storage is optional */ }
      const result = await api<Invoice>("/api/natal/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": order.id, Authorization: `Bearer ${order.token}` }, body: JSON.stringify(input) });
      setInvoice(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Төлбөр эхлүүлж чадсангүй."); }
    finally { setBusy(false); }
  }

  async function check(order = saved) {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const data = await api<OrderResponse>(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${order.token}` } });
      if (data.report) { setReading(data.report); setCheckout(false); setChart(data.report); }
      else setNotice("Төлбөр хараахан баталгаажаагүй байна. Хэдэн секундийн дараа дахин шалгана уу.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Захиалгыг шалгаж чадсангүй."); }
    finally { setBusy(false); }
  }

  async function download() {
    if (!reading) return;
    setBusy(true);
    try {
      const [{ makeNatalPdf }, font] = await Promise.all([import("@/lib/natal-pdf"), fetch("/fonts/NotoSans-Regular.ttf")]);
      downloadFile(await makeNatalPdf(reading, await font.arrayBuffer()) as BlobPart, "application/pdf", `natal-${reading.input.birthDate}.pdf`);
    } catch { setError("PDF бэлтгэж чадсангүй. Дахин оролдоно уу."); }
    finally { setBusy(false); }
  }

  async function downloadPoster() {
    if (!reading) return;
    setBusy(true);
    try {
      const [{ makeNatalPoster }, font] = await Promise.all([import("@/lib/natal-poster"), fetch("/fonts/NotoSans-Regular.ttf")]);
      downloadFile(await makeNatalPoster(reading, await font.arrayBuffer()) as BlobPart, "application/pdf", `natal-poster-A3-${reading.input.birthDate}.pdf`);
    } catch { setError("Постер бэлтгэж чадсангүй. Дахин оролдоно уу."); }
    finally { setBusy(false); }
  }

  const price = money(config?.natalPrice ?? 20000);
  return <>
    {!chart && <form className="natal-form" onSubmit={calculate} noValidate>
      <div className="form-heading">
        <p className="eyebrow">ТӨРСӨН МЭДЭЭЛЭЛ</p>
        <h1>Төрсөн агшны тэнгэрээ нээ.</h1>
        <p>Бүх тооцоо энэ сайт дотор хийгдэнэ. Төрсөн газар тань ямар нэг хайлтын үйлчилгээ рүү илгээгдэхгүй.</p>
      </div>
      <label htmlFor="natal-name">Таны нэр</label>
      <input id="natal-name" name="name" autoComplete="given-name" required maxLength={80} value={form.name} onChange={(event) => change("name", event.target.value)} placeholder="Нэрээ оруулна уу…" />
      <BirthDateFields legend="Төрсөн огноо" value={form.birthDate} onChange={(value) => change("birthDate", value)} />
      <div className="time-row">
        <BirthTimeFields legend="Төрсөн цаг (24 цагаар)" value={form.birthTime} disabled={form.unknownTime} onChange={(value) => change("birthTime", value)} />
        <label className="check-label"><input type="checkbox" checked={form.unknownTime} onChange={(event) => change("unknownTime", event.target.checked)} /><span>Төрсөн цагаа мэдэхгүй</span></label>
      </div>
      <p className="field-hint">Төрсний гэрчилгээн дээрх цагаа оруулаарай. Цагаа мэдэхгүй бол Мандах орд, байшингуудыг тооцохгүй. Сарны орд тодорхойгүй байж болно.</p>
      <PlaceFields cityId={form.cityId} place={form.place} onCity={(cityId) => change("cityId", cityId)} onPlace={(place) => change("place", place)} />
      <button className="button primary wide">Натал зургаа гаргах <ArrowRight aria-hidden="true" /></button>
      <p className="secure-note"><ShieldCheck aria-hidden="true" /> Орон нутгийн газрын жагсаалт · IANA цагийн түүх · Swiss Ephemeris-тэй тулгасан тооцоо</p>
      {saved && <button type="button" className="text-button" disabled={busy} onClick={() => check()}>Өмнөх бүрэн тайлалаа нээх</button>}
    </form>}

    {chart && <section id="chart-result" className="chart-result" tabIndex={-1} aria-labelledby="chart-title">
      <button className="back-button" onClick={() => { setChart(null); setReading(null); setCheckout(false); setInvoice(null); }}><ArrowLeft aria-hidden="true" /> Мэдээллээ засах</button>
      <div className="chart-heading">
        <div>
          <p className="eyebrow">НАТАЛ ЗУРАГ · {chart.input.name.toUpperCase()}</p>
          <h1 id="chart-title">Таны төрсөн агшны тэнгэр</h1>
          <p>{chart.input.birthDate} · {chart.input.unknownTime ? "төрсөн цаг тодорхойгүй" : chart.input.birthTime} · {chart.city.name}</p>
        </div>
        <span className="system-badge">{chart.houseSystem === "placidus" ? "ПЛАЦИДУС" : chart.houseSystem === "whole-sign" ? "БҮХЭЛ ОРД" : "ЦАГ ТОДОРХОЙГҮЙ"}</span>
      </div>
      <div className="chart-layout"><ChartWheel chart={chart} /><PositionsTable chart={chart} /></div>
      {chart.notices.filter((item) => item.kind !== "placidus").map((item) => <p className="chart-note" key={item.kind}>{item.text}</p>)}

      <FreeSummary chart={chart} />

      {!reading && !checkout && <div className="unlock-panel">
        <div>
          <LockKeyhole aria-hidden="true" />
          <p className="eyebrow">БҮРЭН ТАЙЛАЛ · 40 ОРЧИМ ХЭСЭГ</p>
          <h2>Зургаа бүтнээр нь уншаарай.</h2>
          <ul className="paid-contents">{PAID_CONTENTS.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <button className="button primary" onClick={() => setCheckout(true)}>Бүрэн тайлал авах · {price}</button>
      </div>}

      {checkout && !reading && <form className="checkout-panel" onSubmit={startPayment}>
        <button type="button" className="back-button" onClick={() => { setCheckout(false); setInvoice(null); }}><ArrowLeft aria-hidden="true" /> Зураг руу буцах</button>
        <h2>Бүрэн тайлалаа авах</h2>
        <label htmlFor="natal-email">Имэйл хаяг</label>
        <input id="natal-email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} value={form.email} onChange={(event) => change("email", event.target.value)} required={!!config?.live} placeholder="name@example.com" />
        <p className="field-hint">Төлбөр баталгаажмагц тайлал энэ хуудсанд нээгдэж, зурагтай PDF имэйлээр очно.</p>
        <div className="price-row"><span>Натал зураг · Бүрэн тайлал</span><strong>{price}</strong></div>
        {!invoice
          ? <button className="button primary wide" disabled={busy || !config}>{busy ? "Бэлтгэж байна…" : config?.live ? "QPay-ээр төлөх" : "Туршилтын тайлал нээх"}</button>
          : <>
            <div className="qr-area"><img src={`data:image/png;base64,${invoice.qr_image}`} alt="QPay төлбөрийн QR код" width={232} height={232} /><p>Банкны аппын QR уншигчаар энэ кодыг уншуулна уу.</p></div>
            <BankLinks urls={invoice.urls} />
            <p className="message warning">Төлбөр хийсэн бол дахин төлөх шаардлагагүй. Хэдэн секунд хүлээгээд «Төлбөрөө шалгах»-ыг дарна уу.</p>
            <p className="field-hint" role="status" aria-live="polite">Төлбөрийг 4 секунд тутам автоматаар шалгаж байна…</p>
            <button type="button" className="button primary wide" disabled={busy} onClick={() => check()}>{busy ? "Шалгаж байна…" : "Төлбөрөө шалгах"}</button>
          </>}
        {!config?.live && <p className="field-hint">Туршилтын горим: төлбөр авахгүй, имэйл илгээхгүй.</p>}
      </form>}

      {reading && <>
        <ReadingView reading={reading} />
        <div className="download-row"><button className="button primary" disabled={busy} onClick={download}><Download aria-hidden="true" />{busy ? "Бэлтгэж байна…" : "Зурагтай PDF татах"}</button><button className="button" disabled={busy} onClick={downloadPoster}><Download aria-hidden="true" />A3 постер татах</button></div>
      </>}
    </section>}
    {error && <p className="message error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    {notice && <p className="message success" role="status">{notice}</p>}
  </>;
}

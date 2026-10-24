"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Download, HeartHandshake, LockKeyhole, ShieldCheck } from "lucide-react";
import { BankLinks, type BankLink } from "@/components/bank-links";
import { EMPTY_PLACE } from "@/components/natal/place-fields";
import { CoupleReadingView } from "./couple-reading-view";
import { CoupleSummary } from "./couple-summary";
import { CrossAspectTable } from "./cross-aspect-table";
import { PersonFields, type PersonForm } from "./person-fields";
import { SynastryWheel } from "./synastry-wheel";
import { CUSTOM_PLACE_ID } from "@/lib/cities";
import type { NatalInput } from "@/lib/astrology";
import { PAID_CONTENTS } from "@/lib/couple/free";
import type { CoupleReading } from "@/lib/couple/reading-types";
import { selectCrossAspects } from "@/lib/couple/select";
import { calculateCoupleChart, type CoupleChart } from "@/lib/couple/synastry";
import { downloadFile } from "@/lib/pdf";

type Invoice = { id: string; amount: number; qr_image: string; urls: BankLink[] };
type Saved = { id: string; token: string };
type Config = { live: boolean; couplePrice: number };
type OrderResponse = { status: string; amount: number; invoice: Invoice | null; report: CoupleReading | null; email: string | null; emailEnabled: boolean; emailStatus: string | null };

const storageKey = "toono-couple-v1";
const money = (amount: number) => `${new Intl.NumberFormat("en-US").format(amount)}₮`;
const emptyPerson = (): PersonForm => ({ name: "", birthDate: "", birthTime: "", cityId: "ulaanbaatar", unknownTime: false, place: EMPTY_PLACE });

async function api<T>(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Дахин оролдоно уу.");
  return data;
}

/** The request body the server validates: custom coordinates only when «Өөр газар» is chosen. */
function toInput(person: PersonForm): NatalInput {
  const { place, ...rest } = person;
  return rest.cityId === CUSTOM_PLACE_ID ? { ...rest, place } : rest;
}

export function CoupleFlow() {
  const [a, setA] = useState<PersonForm>(emptyPerson);
  const [b, setB] = useState<PersonForm>(emptyPerson);
  const [email, setEmail] = useState("");
  const [couple, setCouple] = useState<CoupleChart | null>(null);
  const [reading, setReading] = useState<CoupleReading | null>(null);
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

  const unlock = (data: OrderResponse) => {
    if (!data.report) return;
    setReading(data.report); setCouple(data.report); setCheckout(false);
    setNotice(data.emailStatus === "sent" && data.email ? `Бүрэн тайлалыг ${data.email} хаяг руу илгээлээ.` : "Төлбөр баталгаажлаа.");
  };

  // Poll every 4 s while the invoice is open and the tab is visible.
  useEffect(() => {
    if (!invoice || !saved || reading) return;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const data = await api<OrderResponse>(`/api/orders/${saved.id}`, { headers: { Authorization: `Bearer ${saved.token}` } });
        if (data.status === "paid") unlock(data);
      } catch { /* the manual check button remains */ }
    }, 4000);
    return () => clearInterval(timer);
  }, [invoice, saved, reading]);

  function calculate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      setCouple(calculateCoupleChart({ a: toInput(a), b: toInput(b) }));
      setReading(null); setCheckout(false); setInvoice(null);
      requestAnimationFrame(() => document.getElementById("couple-result")?.focus());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Мэдээллээ шалгана уу."); }
  }

  async function startPayment(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (!config || !couple) throw new Error("Тохиргоо ачаалж байна.");
      const input = { a: toInput(a), b: toInput(b), email };
      if (!config.live) {
        const preview = await api<CoupleReading>("/api/couple/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
        setReading(preview); setCheckout(false);
        requestAnimationFrame(() => document.querySelector<HTMLElement>(".full-reading")?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
      const fingerprint = JSON.stringify(input);
      const order = attempt.current?.fingerprint === fingerprint ? attempt.current.order : { id: crypto.randomUUID(), token: crypto.randomUUID() };
      attempt.current = { fingerprint, order };
      setSaved(order);
      try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch { /* storage is optional */ }
      setInvoice(await api<Invoice>("/api/couple/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": order.id, Authorization: `Bearer ${order.token}` }, body: JSON.stringify(input) }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Төлбөр эхлүүлж чадсангүй."); }
    finally { setBusy(false); }
  }

  async function check(order = saved) {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const data = await api<OrderResponse>(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${order.token}` } });
      if (data.report) unlock(data);
      else setNotice("Төлбөр хараахан баталгаажаагүй байна. Хэдэн секундийн дараа дахин шалгана уу.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Захиалгыг шалгаж чадсангүй."); }
    finally { setBusy(false); }
  }

  async function download() {
    if (!reading) return;
    setBusy(true);
    try {
      const [{ makeCouplePdf }, font] = await Promise.all([import("@/lib/couple-pdf"), fetch("/fonts/NotoSans-Regular.ttf")]);
      downloadFile(await makeCouplePdf(reading, await font.arrayBuffer()) as BlobPart, "application/pdf", `couple-${reading.a.input.birthDate}-${reading.b.input.birthDate}.pdf`);
    } catch { setError("PDF бэлтгэж чадсангүй. Дахин оролдоно уу."); }
    finally { setBusy(false); }
  }

  const price = money(config?.couplePrice ?? 30000);
  const aspects = couple ? selectCrossAspects(couple).map((item) => item.aspect) : [];
  const unknown = couple && (couple.a.input.unknownTime || couple.b.input.unknownTime);
  return <>
    {!couple && <form className="natal-form couple-form" onSubmit={calculate} noValidate>
      <div className="form-heading">
        <p className="eyebrow">ХОЁР ХҮНИЙ МЭДЭЭЛЭЛ</p>
        <h1>Хоёр тэнгэрийг давхарлаж харъя.</h1>
        <p>Бүх тооцоо энэ сайт дотор хийгдэнэ. Төрсөн мэдээлэл тань ямар нэг хайлтын үйлчилгээ рүү илгээгдэхгүй.</p>
      </div>
      <PersonFields id="a" legend="Таны мэдээлэл" nameLabel="Таны нэр" value={a} onChange={setA} />
      <PersonFields id="b" legend="Хамтрагчийн мэдээлэл" nameLabel="Хамтрагчийн нэр" value={b} onChange={setB} />
      <p className="field-hint">Төрсөн цагаа мэдвэл Мандах орд, байшингийн давхцал нэмэгдэж, тайлал илүү нарийн болно. Цаг мэдэхгүй ч тайлал гарна.</p>
      <button className="button primary wide">Хосын зургаа гаргах <ArrowRight aria-hidden="true" /></button>
      <p className="secure-note"><ShieldCheck aria-hidden="true" /> Одон орны бодит тооцоо · Санамсаргүй 20,000 хостой харьцуулсан оноо</p>
      {saved && <button type="button" className="text-button" disabled={busy} onClick={() => check()}>Өмнөх бүрэн тайлалаа нээх</button>}
    </form>}

    {couple && <section id="couple-result" className="chart-result" tabIndex={-1} aria-labelledby="couple-title">
      <button className="back-button" onClick={() => { setCouple(null); setReading(null); setCheckout(false); setInvoice(null); }}><ArrowLeft aria-hidden="true" /> Мэдээллээ засах</button>
      <div className="chart-heading">
        <div>
          <p className="eyebrow">ХОСЫН ЗУРХАЙ</p>
          <h1 id="couple-title">{couple.a.input.name} ба {couple.b.input.name}</h1>
          <p>{couple.a.input.birthDate} · {couple.a.city.name} — {couple.b.input.birthDate} · {couple.b.city.name}</p>
        </div>
        <span className="system-badge"><HeartHandshake aria-hidden="true" /> {couple.aspects.length} АСПЕКТ</span>
      </div>
      <div className="chart-layout"><SynastryWheel couple={couple} aspects={aspects} /><CrossAspectTable couple={couple} aspects={aspects} /></div>
      {unknown && <p className="chart-note">Төрсөн цаг тодорхойгүй хүний Мандах орд, байшингийг тооцоогүй. Сартай холбоотой аспектыг ойролцоо гэж тэмдэглэв.</p>}

      <CoupleSummary couple={couple} />

      {!reading && !checkout && <div className="unlock-panel">
        <div>
          <LockKeyhole aria-hidden="true" />
          <p className="eyebrow">БҮРЭН ТАЙЛАЛ · 50 ОРЧИМ ХЭСЭГ</p>
          <h2>Харилцаагаа бүтнээр нь уншаарай.</h2>
          <ul className="paid-contents">{PAID_CONTENTS.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <button className="button primary" onClick={() => setCheckout(true)}>Бүрэн тайлал авах · {price}</button>
      </div>}

      {checkout && !reading && <form className="checkout-panel" onSubmit={startPayment}>
        <button type="button" className="back-button" onClick={() => { setCheckout(false); setInvoice(null); }}><ArrowLeft aria-hidden="true" /> Зураг руу буцах</button>
        <h2>Бүрэн тайлалаа авах</h2>
        <label htmlFor="couple-email">Имэйл хаяг</label>
        <input id="couple-email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} required={!!config?.live} placeholder="name@example.com" />
        <p className="field-hint">Төлбөр баталгаажмагц тайлал энэ хуудсанд нээгдэж, PDF хувилбар имэйлээр очно.</p>
        <div className="price-row"><span>Хосын зурхай · Бүрэн тайлал</span><strong>{price}</strong></div>
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
        <CoupleReadingView reading={reading} />
        <div className="download-row"><button className="button primary" disabled={busy} onClick={download}><Download aria-hidden="true" />{busy ? "Бэлтгэж байна…" : "PDF татах"}</button></div>
      </>}
    </section>}
    {error && <p className="message error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    {notice && <p className="message success" role="status">{notice}</p>}
  </>;
}

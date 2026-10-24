import { and, asc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { createReport, type Report } from "@/lib/numerology";
import { createNatalReading, type NatalReading } from "@/lib/natal/reading";
import { CUSTOM_PLACE_ID } from "@/lib/cities";
import { setting } from "@/lib/server";
import { message } from "@/lib/email-template";
import { natalMessage } from "@/lib/natal-email-template";
import { coupleMessage } from "@/lib/couple-email-template";
import type { CoupleReading } from "@/lib/couple/reading-types";

type Order = typeof orders.$inferSelect;
const RETRY_AFTER_MS = 5 * 60_000;

export function emailReady() { return !!setting("RESEND_API_KEY") && !!setting("EMAIL_FROM"); }

function retryableEmail(now: number) {
  return or(isNull(orders.emailStatus), and(inArray(orders.emailStatus, ["sending", "failed"]),
    or(isNull(orders.emailedAt), lt(orders.emailedAt, now - RETRY_AFTER_MS))));
}

// Run independently of the customer's browser and QPay callback retries.
export async function retryReportEmails() {
  if (!emailReady()) return;
  const pending = await getDb().select().from(orders)
    .where(and(eq(orders.status, "paid"), isNotNull(orders.email), retryableEmail(Date.now())))
    .orderBy(asc(orders.emailedAt), asc(orders.createdAt)).limit(1);
  for (const order of pending) {
    try { await deliverReport(order); }
    catch (error) { console.error("Report email retry failed", order.id, error instanceof Error ? error.message : error); }
  }
}

export function orderReport(order: Order): Report | NatalReading | CoupleReading | null {
  // Couple orders always store the complete reading at checkout.
  if (order.product === "couple") return order.chartJson ? JSON.parse(order.chartJson) as CoupleReading : null;
  if (order.product === "natal") {
    if (order.chartJson) return JSON.parse(order.chartJson) as NatalReading;
    if (!order.birthTime || !order.birthCity) return null;
    const place = order.birthCity === CUSTOM_PLACE_ID && order.birthLatitude != null && order.birthLongitude != null && order.birthTimezone
      ? { label: "Өөр газар", latitude: order.birthLatitude, longitude: order.birthLongitude, timezone: order.birthTimezone } : undefined;
    return createNatalReading({ name: order.name, email: order.email ?? "", birthDate: order.birthday, birthTime: order.birthTime, cityId: order.birthCity, unknownTime: order.unknownTime ?? false, place });
  }
  if (order.fatherName == null || !order.fatherBirthday) return null;
  return createReport({ fatherName: order.fatherName, fatherBirthday: order.fatherBirthday, name: order.name, birthday: order.birthday });
}

// Claims the order before sending so a QPay callback and a browser poll never both send.
// A failed or stuck attempt becomes claimable again after RETRY_AFTER_MS; Resend's idempotency key guards duplicates within 24h.
export async function deliverReport(order: Order) {
  if (!emailReady() || order.status !== "paid" || !order.email || order.emailStatus === "sent") return;
  const report = orderReport(order);
  if (!report) return;
  const db = getDb();
  const now = Date.now();
  const claimed = await db.update(orders).set({ emailStatus: "sending", emailedAt: now })
    .where(and(eq(orders.id, order.id), eq(orders.status, "paid"), retryableEmail(now)))
    .returning({ id: orders.id });
  if (!claimed.length) return;
  try {
    const natal = order.product === "natal", couple = order.product === "couple";
    const { subject, html, text } = couple ? coupleMessage(report as CoupleReading) : natal ? natalMessage(report as NatalReading) : message(report as Report);
    const attachments: { filename: string; content: string }[] = [];
    if (natal && setting("PUBLIC_ORIGIN")) {
      try {
        const [{ makeNatalPdf }, fontResponse] = await Promise.all([
          import("@/lib/natal-pdf"),
          fetch(new URL("/fonts/NotoSans-Regular.ttf", setting("PUBLIC_ORIGIN")).toString(), { signal: AbortSignal.timeout(10000) }),
        ]);
        if (fontResponse.ok) attachments.push({ filename: `natal-${order.birthday}.pdf`, content: Buffer.from(await makeNatalPdf(report as NatalReading, await fontResponse.arrayBuffer())).toString("base64") });
      } catch (error) { console.error("Natal PDF attachment failed", order.id, error instanceof Error ? error.message : error); }
    }
    if (couple && setting("PUBLIC_ORIGIN")) {
      try {
        const [{ makeCouplePdf }, fontResponse] = await Promise.all([
          import("@/lib/couple-pdf"),
          fetch(new URL("/fonts/NotoSans-Regular.ttf", setting("PUBLIC_ORIGIN")).toString(), { signal: AbortSignal.timeout(10000) }),
        ]);
        if (fontResponse.ok) attachments.push({ filename: `couple-${order.birthday}.pdf`, content: Buffer.from(await makeCouplePdf(report as CoupleReading, await fontResponse.arrayBuffer())).toString("base64") });
      } catch (error) { console.error("Couple PDF attachment failed", order.id, error instanceof Error ? error.message : error); }
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${setting("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": `report-${order.id}` },
      body: JSON.stringify({ from: setting("EMAIL_FROM"), to: [order.email], subject, html, text, ...(attachments.length ? { attachments } : {}) }),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    await db.update(orders).set({ emailStatus: "sent", emailedAt: Date.now() }).where(eq(orders.id, order.id));
  } catch (error) {
    console.error("Report email failed", order.id, error instanceof Error ? error.message : error);
    await db.update(orders).set({ emailStatus: "failed" }).where(eq(orders.id, order.id));
  }
}

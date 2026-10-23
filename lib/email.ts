import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { createReport, type Report } from "@/lib/numerology";
import { setting } from "@/lib/server";
import { message } from "@/lib/email-template";

type Order = typeof orders.$inferSelect;
const RETRY_AFTER_MS = 5 * 60_000;

export function emailReady() { return !!setting("RESEND_API_KEY") && !!setting("EMAIL_FROM"); }

export function orderReport(order: Order): Report | null {
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
    .where(and(eq(orders.id, order.id), or(isNull(orders.emailStatus), and(inArray(orders.emailStatus, ["sending", "failed"]), lt(orders.emailedAt, now - RETRY_AFTER_MS)))))
    .returning({ id: orders.id });
  if (!claimed.length) return;
  try {
    const { subject, html, text } = message(report);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${setting("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": `report-${order.id}` },
      body: JSON.stringify({ from: setting("EMAIL_FROM"), to: [order.email], subject, html, text }),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    await db.update(orders).set({ emailStatus: "sent", emailedAt: Date.now() }).where(eq(orders.id, order.id));
  } catch (error) {
    console.error("Report email failed", order.id, error instanceof Error ? error.message : error);
    await db.update(orders).set({ emailStatus: "failed" }).where(eq(orders.id, order.id));
  }
}

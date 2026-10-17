import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { validateDetails } from "@/lib/numerology";
import { authorizedOrder, body, hash, json, paymentReady, price, qpay, setting, type Invoice } from "@/lib/server";

export async function POST(req: Request) {
  if (!paymentReady()) return json({ error: "Payments are not connected yet. You can try a free preview." }, 503);
  let details;
  try { details = validateDetails(await body(req)); } catch (e) { return json({ error: e instanceof Error ? e.message : "Check your details." }, 400); }
  const id = req.headers.get("idempotency-key") || "";
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9-]{36}$/.test(accessToken)) return json({ error: "Invalid order reference." }, 400);
  const db = getDb();
  const previous = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (previous) {
    if (!await authorizedOrder(req, id)) return json({ error: "Order not found." }, 404);
    if (previous.invoiceJson) return json({ id, amount: previous.amount, ...JSON.parse(previous.invoiceJson) });
    return json({ error: "This order is still being processed. Keep your recovery code and try checking it again shortly." }, 409);
  }
  // Bound unpaid invoice creation; no visitor IPs or birth dates are sent to QPay.
  const recent = await db.select({ id: orders.id }).from(orders).where(gt(orders.createdAt, Date.now() - 60000)).limit(20);
  if (recent.length >= 20) return json({ error: "Checkout is busy. Please try again in a minute." }, 429);
  const callbackKey = crypto.randomUUID();
  const amount = price();
  const inserted = await db.insert(orders).values({ id, accessHash: await hash(accessToken), callbackHash: await hash(callbackKey), ...details, amount, year: new Date().getFullYear(), createdAt: Date.now() }).onConflictDoNothing().returning({ id: orders.id });
  if (!inserted.length) return json({ error: "This payment request is already being prepared. Please check your existing order." }, 409);
  try {
    const invoice = await qpay<Invoice>("/v2/invoice", { invoice_code: setting("QPAY_INVOICE_CODE"), sender_invoice_no: id, invoice_receiver_code: "terminal", invoice_description: "Toono numerology report", amount, callback_url: `${new URL(setting("PUBLIC_ORIGIN")!).origin}/api/qpay/callback/${id}?key=${callbackKey}` });
    if (!invoice.invoice_id || !invoice.qr_image) throw new Error("Incomplete invoice");
    const safeInvoice = { invoice_id: invoice.invoice_id, qr_image: invoice.qr_image, urls: invoice.urls || [] };
    await db.update(orders).set({ invoiceId: invoice.invoice_id, invoiceJson: JSON.stringify(safeInvoice), status: "pending" }).where(eq(orders.id, id));
    return json({ id, amount, ...safeInvoice });
  } catch {
    // Keep uncertain attempts to prevent duplicate invoices; support can reconcile sender_invoice_no.
    return json({ error: "QPay could not create your payment request. No payment was requested from you. Keep your recovery code and contact the site owner if this continues." }, 502);
  }
}

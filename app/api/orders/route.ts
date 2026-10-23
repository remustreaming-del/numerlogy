import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { validateDetails } from "@/lib/numerology";
import { authorizedOrder, body, hash, json, paymentReady, price, qpay, setting, type Invoice } from "@/lib/server";

export async function POST(req: Request) {
  if (!paymentReady()) return json({ error: "Төлбөр хараахан холбогдоогүй байна. Үнэгүй тайлан туршиж үзээрэй." }, 503);
  let details;
  try { details = validateDetails(await body(req)); } catch (e) { return json({ error: e instanceof Error ? e.message : "Мэдээллээ шалгана уу." }, 400); }
  const id = req.headers.get("idempotency-key") || "";
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9-]{36}$/.test(accessToken)) return json({ error: "Захиалгын дугаар буруу байна." }, 400);
  const db = getDb();
  const previous = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (previous) {
    if (!await authorizedOrder(req, id)) return json({ error: "Захиалга олдсонгүй." }, 404);
    if (previous.invoiceJson) return json({ id, amount: previous.amount, ...JSON.parse(previous.invoiceJson) });
    return json({ error: "Захиалга боловсруулагдаж байна. Сэргээх кодоо хадгалаад түр хүлээнэ үү." }, 409);
  }
  // Bound unpaid invoice creation; no visitor IPs, emails, or birth dates are sent to QPay.
  const recent = await db.select({ id: orders.id }).from(orders).where(gt(orders.createdAt, Date.now() - 60000)).limit(20);
  if (recent.length >= 20) return json({ error: "Төлбөрийн хэсэг ачаалалтай байна. Нэг минутын дараа дахин оролдоно уу." }, 429);
  const callbackKey = crypto.randomUUID();
  const amount = price("etsgiin-kod");
  const inserted = await db.insert(orders).values({ id, accessHash: await hash(accessToken), callbackHash: await hash(callbackKey), product: "etsgiin-kod", ...details, language: "mn", amount, year: new Date().getFullYear(), createdAt: Date.now() }).onConflictDoNothing().returning({ id: orders.id });
  if (!inserted.length) return json({ error: "Төлбөрийн хүсэлт бэлтгэгдэж байна. Одоо байгаа захиалгаа шалгана уу." }, 409);
  try {
    // Simple invoice without e-barimt: calculate_vat is off and no tax fields (tax_customer_code, district_code, lines) are sent.
    // sender_invoice_no must not contain special characters, so the order UUID is sent without hyphens.
    const invoice = await qpay<Invoice>("/v2/invoice", { invoice_code: setting("QPAY_INVOICE_CODE"), sender_invoice_no: id.replace(/-/g, ""), invoice_receiver_code: "terminal", invoice_description: "Toono Etsgiin kod report", amount, calculate_vat: false, callback_url: `${new URL(setting("PUBLIC_ORIGIN")!).origin}/api/qpay/callback/${id}?key=${callbackKey}` });
    if (!invoice.invoice_id || !invoice.qr_image) throw new Error("Incomplete invoice");
    const safeInvoice = { invoice_id: invoice.invoice_id, qr_image: invoice.qr_image, urls: (invoice.urls || []).map(({ name, description, link, logo }) => ({ name, description, link, logo })) };
    await db.update(orders).set({ invoiceId: invoice.invoice_id, invoiceJson: JSON.stringify(safeInvoice), status: "pending" }).where(eq(orders.id, id));
    return json({ id, amount, ...safeInvoice });
  } catch {
    // Keep uncertain attempts to prevent duplicate invoices; support can reconcile sender_invoice_no.
    return json({ error: "QPay төлбөрийн хүсэлт үүсгэж чадсангүй. Төлбөр аваагүй. Сэргээх кодоо хадгалаад, асуудал үргэлжилбэл сайтын эзэнтэй холбогдоно уу." }, 502);
  }
}

import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { validateNatalInput } from "@/lib/astrology";
import { createNatalReading } from "@/lib/natal/reading";
import { body, hash, json, paymentReady, price, qpay, setting, type Invoice } from "@/lib/server";

export async function POST(req: Request) {
  if (!paymentReady()) return json({ error: "Төлбөр хараахан холбогдоогүй байна. Туршилтын тайлалыг нээнэ үү." }, 503);
  let details;
  try { details = validateNatalInput(await body(req), true); } catch (error) { return json({ error: error instanceof Error ? error.message : "Мэдээллээ шалгана уу." }, 400); }
  const id = req.headers.get("idempotency-key") || "";
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9-]{36}$/.test(accessToken)) return json({ error: "Захиалгын дугаар буруу байна." }, 400);
  const db = getDb();
  const previous = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (previous?.invoiceJson) return json({ id, amount: previous.amount, ...JSON.parse(previous.invoiceJson) });
  if (previous) return json({ error: "Захиалга боловсруулагдаж байна." }, 409);
  const recent = await db.select({ id: orders.id }).from(orders).where(gt(orders.createdAt, Date.now() - 60000)).limit(20);
  if (recent.length >= 20) return json({ error: "Төлбөрийн хэсэг ачаалалтай байна. Нэг минутын дараа оролдоно уу." }, 429);
  const report = createNatalReading(details), callbackKey = crypto.randomUUID(), amount = price("natal");
  const inserted = await db.insert(orders).values({
    id, accessHash: await hash(accessToken), callbackHash: await hash(callbackKey), product: "natal",
    name: details.name, birthday: details.birthDate, email: details.email, language: "mn", amount,
    birthTime: details.birthTime, birthCity: report.city.id, birthTimezone: report.city.timezone,
    birthLatitude: report.city.latitude, birthLongitude: report.city.longitude, unknownTime: details.unknownTime,
    chartJson: JSON.stringify(report), year: new Date().getFullYear(), createdAt: Date.now(),
  }).onConflictDoNothing().returning({ id: orders.id });
  if (!inserted.length) return json({ error: "Захиалга бэлтгэгдэж байна." }, 409);
  try {
    const invoice = await qpay<Invoice>("/v2/invoice", { invoice_code: setting("QPAY_INVOICE_CODE"), sender_invoice_no: id.replace(/-/g, ""), invoice_receiver_code: "terminal", invoice_description: "Toono natal chart full reading", amount, calculate_vat: false, callback_url: `${new URL(setting("PUBLIC_ORIGIN")!).origin}/api/qpay/callback/${id}?key=${callbackKey}` });
    if (!invoice.invoice_id || !invoice.qr_image) throw new Error("Incomplete invoice");
    const safeInvoice = { invoice_id: invoice.invoice_id, qr_image: invoice.qr_image, urls: (invoice.urls || []).map(({ name, description, link, logo }) => ({ name, description, link, logo })) };
    await db.update(orders).set({ invoiceId: invoice.invoice_id, invoiceJson: JSON.stringify(safeInvoice), status: "pending" }).where(eq(orders.id, id));
    return json({ id, amount, ...safeInvoice });
  } catch { return json({ error: "QPay төлбөрийн хүсэлт үүсгэж чадсангүй. Төлбөр аваагүй." }, 502); }
}

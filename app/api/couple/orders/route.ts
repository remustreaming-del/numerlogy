import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { calculateNatalChart } from "@/lib/astrology";
import { buildCoupleChart, validateCoupleInput } from "@/lib/couple/synastry";
import { buildCoupleReading } from "@/lib/couple/reading";
import { authorizedOrder, body, hash, json, paymentReady, price, qpay, setting, type Invoice } from "@/lib/server";

// Person A goes into the regular birth columns; the whole reading (both charts) is stored in chart_json,
// so a paid report never changes even if the content library is revised later.
export async function POST(req: Request) {
  if (!paymentReady()) return json({ error: "Төлбөр хараахан холбогдоогүй байна. Туршилтын тайлалыг нээнэ үү." }, 503);
  let details;
  try { details = validateCoupleInput(await body(req), true); } catch (error) { return json({ error: error instanceof Error ? error.message : "Мэдээллээ шалгана уу." }, 400); }
  const id = req.headers.get("idempotency-key") || "";
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9-]{36}$/.test(accessToken)) return json({ error: "Захиалгын дугаар буруу байна." }, 400);
  const db = getDb();
  const previous = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (previous) {
    if (!await authorizedOrder(req, id)) return json({ error: "Захиалга олдсонгүй." }, 404);
    if (previous.invoiceJson) return json({ id, amount: previous.amount, ...JSON.parse(previous.invoiceJson) });
    return json({ error: "Захиалга боловсруулагдаж байна." }, 409);
  }
  const recent = await db.select({ id: orders.id }).from(orders).where(gt(orders.createdAt, Date.now() - 60000)).limit(20);
  if (recent.length >= 20) return json({ error: "Төлбөрийн хэсэг ачаалалтай байна. Нэг минутын дараа оролдоно уу." }, 429);
  const a = calculateNatalChart(details.a), b = calculateNatalChart(details.b);
  const report = buildCoupleReading(buildCoupleChart(a, b)), callbackKey = crypto.randomUUID(), amount = price("couple");
  const inserted = await db.insert(orders).values({
    id, accessHash: await hash(accessToken), callbackHash: await hash(callbackKey), product: "couple",
    name: details.a.name, birthday: details.a.birthDate, email: details.email, language: "mn", amount,
    birthTime: details.a.birthTime, birthCity: a.city.id, birthTimezone: a.city.timezone,
    birthLatitude: a.city.latitude, birthLongitude: a.city.longitude, unknownTime: details.a.unknownTime,
    chartJson: JSON.stringify(report), year: new Date().getFullYear(), createdAt: Date.now(),
  }).onConflictDoNothing().returning({ id: orders.id });
  if (!inserted.length) return json({ error: "Захиалга бэлтгэгдэж байна." }, 409);
  try {
    const invoice = await qpay<Invoice>("/v2/invoice", { invoice_code: setting("QPAY_INVOICE_CODE"), sender_invoice_no: id.replace(/-/g, ""), invoice_receiver_code: "terminal", invoice_description: "Toono couple compatibility reading", amount, calculate_vat: false, callback_url: `${new URL(setting("PUBLIC_ORIGIN")!).origin}/api/qpay/callback/${id}?key=${callbackKey}` });
    if (!invoice.invoice_id || !invoice.qr_image) throw new Error("Incomplete invoice");
    const safeInvoice = { invoice_id: invoice.invoice_id, qr_image: invoice.qr_image, urls: (invoice.urls || []).map(({ name, description, link, logo }) => ({ name, description, link, logo })) };
    await db.update(orders).set({ invoiceId: invoice.invoice_id, invoiceJson: JSON.stringify(safeInvoice), status: "pending" }).where(eq(orders.id, id));
    return json({ id, amount, ...safeInvoice });
  } catch { return json({ error: "QPay төлбөрийн хүсэлт үүсгэж чадсангүй. Төлбөр аваагүй." }, 502); }
}

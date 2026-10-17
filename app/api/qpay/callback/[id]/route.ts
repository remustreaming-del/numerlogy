import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { json, matches, paymentReady, qpay } from "@/lib/server";
import { isFullyPaid, type PaymentRow } from "@/lib/payment";

async function callback(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!paymentReady()) return json({ error: "Payments disabled" }, 503);
  const { id } = await context.params;
  const key = new URL(req.url).searchParams.get("key") || "";
  if (key.length !== 36) return json({ error: "Not found" }, 404);
  const db = getDb();
  const order = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order || !await matches(key, order.callbackHash)) return json({ error: "Not found" }, 404);
  if (order.status === "paid") return json({ ok: true });
  if (!order.invoiceId) return json({ error: "Invoice not ready" }, 503);
  try {
    const result = await qpay<{ rows: PaymentRow[] }>("/v2/payment/check", { object_type: "INVOICE", object_id: order.invoiceId, offset: { page_number: 1, page_limit: 100 } });
    if (Array.isArray(result.rows) && isFullyPaid(result.rows, order.amount)) {
      await db.update(orders).set({ status: "paid", paidAt: Date.now() }).where(eq(orders.id, id));
    }
    return json({ ok: true });
  } catch { return json({ error: "Payment verification unavailable. Please retry." }, 503); }
}
export const GET = callback;
export const POST = callback;

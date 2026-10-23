import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { confirmPayment, json, matches, paymentReady } from "@/lib/server";
import { deliverReport } from "@/lib/email";

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
  let paid: typeof order | null = null;
  try { paid = await confirmPayment(order); } catch { return json({ error: "Payment verification unavailable. Please retry." }, 503); }
  // Email failures are recorded on the order and retried from the status endpoint; QPay still gets ok.
  if (paid) await deliverReport(paid);
  return json({ ok: true });
}
export const GET = callback;
export const POST = callback;

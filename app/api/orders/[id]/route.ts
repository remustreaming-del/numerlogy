import { createReport } from "@/lib/numerology";
import { authorizedOrder, json } from "@/lib/server";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const order = await authorizedOrder(req, id);
  if (!order) return json({ error: "Тайлан олдсонгүй. Сэргээх кодоо шалгана уу." }, 404);
  return json({ id, status: order.status, amount: order.amount,
    invoice: order.invoiceJson ? JSON.parse(order.invoiceJson) : null,
    report: order.status === "paid" ? createReport({ name: order.name, birthday: order.birthday }, order.year) : null,
  });
}

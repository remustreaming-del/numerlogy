import { deliverReport, emailReady, orderReport } from "@/lib/email";
import { authorizedOrder, confirmPaymentThrottled, json } from "@/lib/server";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const found = await authorizedOrder(req, id);
  if (!found) return json({ error: "Тайлан олдсонгүй. Сэргээх кодоо шалгана уу." }, 404);
  // Fallback when the QPay callback has not arrived (or cannot reach this origin): ask QPay directly.
  const order = await confirmPaymentThrottled(found);
  // Fallback when the QPay callback could not send the email; deliverReport is idempotent.
  if (order.status === "paid" && order.emailStatus !== "sent") await deliverReport(order);
  return json({ id, status: order.status, amount: order.amount, email: order.email, emailEnabled: emailReady(),
    invoice: order.invoiceJson ? JSON.parse(order.invoiceJson) : null,
    report: order.status === "paid" ? orderReport(order) : null,
  });
}

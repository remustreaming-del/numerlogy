export type PaymentRow = { payment_id: string; payment_status: string; payment_amount: string | number; payment_currency: string };
export function isFullyPaid(rows: PaymentRow[], amount: number) {
  const seen = new Set<string>();
  let total = 0;
  for (const row of rows) {
    const value = Number(row.payment_amount);
    if (row.payment_id && !seen.has(row.payment_id) && row.payment_status === "PAID" && row.payment_currency === "MNT" && Number.isFinite(value) && value > 0) {
      seen.add(row.payment_id);
      total += value;
    }
  }
  return Number.isSafeInteger(amount) && amount > 0 && total >= amount;
}

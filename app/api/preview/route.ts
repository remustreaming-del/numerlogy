import { createReport, validateDetails } from "@/lib/numerology";
import { body, json, paymentReady } from "@/lib/server";
export async function POST(req: Request) {
  if (paymentReady()) return json({ error: "Preview is unavailable while payments are enabled." }, 403);
  try { const details = validateDetails(await body(req)); return json({ ...createReport(details), preview: true }); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Check your details." }, 400); }
}

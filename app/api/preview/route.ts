import { createReport, validateDetails } from "@/lib/numerology";
import { body, json, paymentReady } from "@/lib/server";
export async function POST(req: Request) {
  if (paymentReady()) return json({ error: "Төлбөр идэвхтэй үед үнэгүй туршилт боломжгүй." }, 403);
  try { const details = validateDetails(await body(req)); return json({ ...createReport(details), preview: true }); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Мэдээллээ шалгана уу." }, 400); }
}

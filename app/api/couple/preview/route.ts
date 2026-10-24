import { createCoupleReading } from "@/lib/couple/reading";
import { body, json, paymentReady } from "@/lib/server";

// Free full couple reading only while payments are not live (owner preview). Never charges, never emails.
export async function POST(req: Request) {
  if (paymentReady()) return json({ error: "Төлбөр идэвхтэй үед үнэгүй туршилт боломжгүй." }, 403);
  try { return json({ ...createCoupleReading(await body(req)), preview: true }); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Мэдээллээ шалгана уу." }, 400); }
}

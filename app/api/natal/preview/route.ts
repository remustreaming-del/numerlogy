import { validateNatalInput } from "@/lib/astrology";
import { createNatalReading } from "@/lib/natal/reading";
import { body, json, paymentReady } from "@/lib/server";

// Free full reading only while payments are not live (owner preview). Never charges, never emails.
export async function POST(req: Request) {
  if (paymentReady()) return json({ error: "Төлбөр идэвхтэй үед үнэгүй туршилт боломжгүй." }, 403);
  try { return json({ ...createNatalReading(validateNatalInput(await body(req))), preview: true }); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Мэдээллээ шалгана уу." }, 400); }
}

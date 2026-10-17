import { createReport } from "@/lib/numerology";
import { json } from "@/lib/server";
export async function GET() { return json({ ...createReport({ name: "Ану", birthday: "1995-06-13" }), preview: true }); }

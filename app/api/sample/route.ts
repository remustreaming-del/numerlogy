import { createReport } from "@/lib/numerology";
import { json } from "@/lib/server";
export async function GET(req: Request) { return json({ ...createReport({ name: "Anu", birthday: "1995-06-13", language: new URL(req.url).searchParams.get("lang") === "mn" ? "mn" : "en" }), preview: true }); }

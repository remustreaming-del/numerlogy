import { createReport } from "@/lib/numerology";
import { json } from "@/lib/server";
export async function GET() { return json({ ...createReport({ fatherName: "Бат", fatherBirthday: "1961-04-24", name: "Ану", birthday: "1995-06-13" }), preview: true }); }

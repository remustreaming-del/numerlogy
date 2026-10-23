import { json, paymentReady, price } from "@/lib/server";
export async function GET() { return json({ live: paymentReady(), price: price(), etsgiinPrice: price("etsgiin-kod"), natalPrice: price("natal") }); }

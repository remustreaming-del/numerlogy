import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, serviceTokens } from "@/db/schema";
import { timingSafeEqual } from "node:crypto";

export function setting(key: string) { return (env as Record<string, unknown>)[key] as string | undefined; }
export function paymentReady() { return setting("PAYMENTS_ENABLED") === "true" && ["QPAY_CLIENT_ID", "QPAY_CLIENT_SECRET", "QPAY_INVOICE_CODE", "PUBLIC_ORIGIN"].every(key => !!setting(key)); }
// Single fixed price for every report; not configurable at runtime.
export const PRICE_MNT = 5000;
export function price() { return PRICE_MNT; }
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
export async function hash(value: string) { return Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))).toString("hex"); }
export async function matches(value: string, expected: string) { const actual = await hash(value); return timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); }
export function sameOrigin(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) throw new Error("Энэ эх үүсвэрээс хүсэлт хүлээн авах боломжгүй.");
}
export async function body(req: Request) {
  sameOrigin(req);
  if (!req.headers.get("content-type")?.includes("application/json")) throw new Error("Мэдээллийн формат буруу байна.");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Хүсэлтийн мэдээлэл дутуу байна.");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 4096) { await reader.cancel(); throw new Error("Хүсэлтийн хэмжээ хэтэрсэн байна."); } chunks.push(value); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function authorizedOrder(req: Request, id: string) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || token.length > 200) return null;
  const order = await getDb().select().from(orders).where(eq(orders.id, id)).get();
  return order && await matches(token, order.accessHash) ? order : null;
}
const baseUrl = () => setting("QPAY_SANDBOX") === "true" ? "https://merchant-sandbox.qpay.mn" : "https://merchant.qpay.mn";
type AuthResult = { access_token: string; refresh_token: string; expires_in: number };
async function token() {
  const db = getDb();
  const id = `${baseUrl()}:${setting("QPAY_CLIENT_ID")}`;
  const saved = await db.select().from(serviceTokens).where(eq(serviceTokens.id, id)).get();
  if (saved && saved.expiresAt > Date.now() + 60000) return saved.token;
  const refresh = saved?.refreshToken;
  let response = await fetch(`${baseUrl()}/v2/auth/${refresh ? "refresh" : "token"}`, {
    method: "POST", signal: AbortSignal.timeout(15000),
    headers: { Authorization: refresh ? `Bearer ${refresh}` : `Basic ${Buffer.from(`${setting("QPAY_CLIENT_ID")}:${setting("QPAY_CLIENT_SECRET")}`).toString("base64")}` },
  });
  if (refresh && response.status === 401) response = await fetch(`${baseUrl()}/v2/auth/token`, { method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${Buffer.from(`${setting("QPAY_CLIENT_ID")}:${setting("QPAY_CLIENT_SECRET")}`).toString("base64")}` } });
  if (!response.ok) throw new Error("QPay authentication failed");
  const auth = await response.json() as AuthResult;
  if (!auth.access_token || !Number.isFinite(auth.expires_in) || auth.expires_in <= 0) throw new Error("Invalid QPay authentication response");
  // QPay deployments may return an absolute Unix expiry or a duration in seconds.
  const expiresAt = auth.expires_in > 1_000_000_000 ? auth.expires_in * 1000 : Date.now() + auth.expires_in * 1000;
  const values = { id, token: auth.access_token, refreshToken: auth.refresh_token || "", expiresAt };
  await db.insert(serviceTokens).values(values).onConflictDoUpdate({ target: serviceTokens.id, set: values });
  return auth.access_token;
}
export async function qpay<T>(path: string, payload: unknown): Promise<T> {
  const accessToken = await token();
  const response = await fetch(`${baseUrl()}${path}`, { method: "POST", signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`QPay returned ${response.status}`);
  return response.json() as Promise<T>;
}
export type Invoice = { invoice_id: string; qr_image: string; urls: { name: string; description: string; link: string; logo: string }[] };

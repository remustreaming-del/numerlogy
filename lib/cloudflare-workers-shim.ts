// Netlify/Next.js stand-in for the `cloudflare:workers` module.
// Settings come from process.env; the D1 binding does not exist here, so
// payment routes stay disabled until PAYMENTS_ENABLED is set with a database.
export const env = process.env as unknown as Record<string, unknown> & { DB?: D1Database };

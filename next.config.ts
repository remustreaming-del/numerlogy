import type { NextConfig } from "next";

// Only Netlify (plain Next.js) needs the shim; the Cloudflare/vinext build
// resolves `cloudflare:workers` natively.
const shim = "./lib/cloudflare-workers-shim.ts";

const nextConfig: NextConfig = process.env.NETLIFY
  ? { turbopack: { resolveAlias: { "cloudflare:workers": shim } } }
  : {};

export default nextConfig;

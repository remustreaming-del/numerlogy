import type { NextConfig } from "next";

const shim = "./lib/cloudflare-workers-shim.ts";

const nextConfig: NextConfig = {
  turbopack: { resolveAlias: { "cloudflare:workers": shim } },
  webpack(config) {
    config.resolve.alias["cloudflare:workers"] = new URL(shim, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    return config;
  },
};

export default nextConfig;

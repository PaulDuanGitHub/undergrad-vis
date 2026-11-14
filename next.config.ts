import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is mounted at https://xianzhaoduan.com/undergrad-vis/ by
  // Cloudflare Workers static assets (`assets.base_path` in wrangler.jsonc).
  // `basePath` makes every `_next` URL and the public assets carry the same
  // prefix; the exported files themselves stay at the root of `out/`.
  output: "export",
  basePath: "/undergrad-vis",
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ["192.168.18.8", "*.local"],
};

export default nextConfig;

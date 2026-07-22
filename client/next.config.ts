import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // The optimizer fetches upstream images server-side and hard-blocks any
    // URL resolving to a private/loopback IP (SSRF guard) — since ASSETS_URL
    // points at nginx via localhost, that fetch always resolves to the
    // frontend container itself. Skip optimization instead of fighting it.
    unoptimized: true,
  },
};

export default nextConfig;

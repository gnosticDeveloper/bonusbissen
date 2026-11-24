import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow 2 MB images plus multipart/Server Action overhead.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  images: {
    // The optimizer fetches upstream images server-side and hard-blocks any
    // URL resolving to a private/loopback IP (SSRF guard) — since ASSETS_URL
    // points at nginx via localhost, that fetch always resolves to the
    // frontend container itself. Skip optimization instead of fighting it.
    unoptimized: true,
  },
  // DEV ONLY, do not uncomment this since it is not stable on production.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackRustReactCompiler
  // // Enable the React Compiler
  // reactCompiler: true,
  // experimental: {
  //   // Use the Rust port instead of the Babel transform
  //   turbopackRustReactCompiler: true,
  // },
  allowedDevOrigins: ['192.168.1.223'],
  // DEV ONLY: proxy uploaded images to the backend (DevUploadsConfig) so they
  // load from the same origin as the page. With the dev profile's relative
  // assets URL ("/uploads/"), images then work from any device on the LAN,
  // not just from localhost. In production nginx / Cloudinary serve them.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const backend = process.env.BACKEND_URL ?? "http://localhost:8080";
    return [{ source: "/uploads/:path*", destination: `${backend}/uploads/:path*` }];
  },
};

export default nextConfig;

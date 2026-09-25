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
  // DEV ONLY, do not uncomment this since it is not stable on production.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackRustReactCompiler
  // // Enable the React Compiler
  // reactCompiler: true,
  // experimental: {
  //   // Use the Rust port instead of the Babel transform
  //   turbopackRustReactCompiler: true,
  // },
};

export default nextConfig;

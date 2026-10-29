import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Without this Next first strips a trailing slash and only then runs middleware, so
  // /bill/demo-7719/ would redirect twice. Slash and no-slash both serve the page.
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

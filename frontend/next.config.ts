import type { NextConfig } from "next";
import { SITE_URL } from "./src/lib/site";

const nextConfig: NextConfig = {
  // Only the exact old production host moves; Vercel preview and local hosts stay put.
  // Next carries the query string to the destination on its own.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "scholar-lens-kappa.vercel.app" }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

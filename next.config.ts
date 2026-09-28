import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (Vercel ignores this).
  output: "standalone",
  images: {
    // Photos are already resized to WebP when uploaded, so no second optimisation pass is needed.
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Customer photos are shrunk in the browser first; this is a safety margin.
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["sharp", "heic-convert"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin, booking steps, cancel links and the design variants are not for search engines.
      disallow: ["/admin", "/api", "/v2", "/v3", "/v4", "/en/v2", "/en/v3", "/en/v4", "/otkazvane", "/en/cancel"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}

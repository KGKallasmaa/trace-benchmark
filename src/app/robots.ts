import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/cron", "/.well-known/workflow/"],
    },
    sitemap: "https://trace.context.dev/sitemap.xml",
    host: "https://trace.context.dev",
  };
}

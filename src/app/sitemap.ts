import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://trace.context.dev/", changeFrequency: "daily", priority: 1 }];
}

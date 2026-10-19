import type { MetadataRoute } from "next";

// Spec 004: keep the admin area and the API out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
  };
}

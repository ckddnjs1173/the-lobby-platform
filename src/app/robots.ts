import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PRODUCTION_BASE_URL ||
    "https://the-lobby-platform-ten.vercel.app"
  ).replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/jobs/", "/talent-pool", "/privacy", "/terms"],
        disallow: ["/api/", "/candidate/", "/b2b-admin/", "/login", "/register"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

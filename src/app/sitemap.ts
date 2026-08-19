import type { MetadataRoute } from "next";

import { listPublicJobs } from "../lib/server/publicJobService";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PRODUCTION_BASE_URL ||
    "https://the-lobby-platform-ten.vercel.app"
  ).replace(/\/$/, "");

  const jobs = await listPublicJobs();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/talent-pool`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${siteUrl}/jobs/${encodeURIComponent(job.jobId)}`,
    lastModified: job.updatedAt || job.createdAt || undefined,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticEntries, ...jobEntries];
}

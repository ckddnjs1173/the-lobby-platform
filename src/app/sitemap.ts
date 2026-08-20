import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { listPublicJobs } from "../lib/server/publicJobService";

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PRODUCTION_BASE_URL ||
    "https://the-lobby-platform-ten.vercel.app"
  ).replace(/\/$/, "");
}

function staticEntries(siteUrl: string): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/talent-pool`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Next.js metadata routes are cached/prerendered by default. The job list is
  // external Firestore data, so resolve it at request time instead of making a
  // production build depend on database quota/availability.
  await connection();

  const siteUrl = getSiteUrl();
  const baseEntries = staticEntries(siteUrl);

  try {
    const jobs = await listPublicJobs();
    const jobEntries: MetadataRoute.Sitemap = jobs.map((job) => ({
      url: `${siteUrl}/jobs/${encodeURIComponent(job.jobId)}`,
      lastModified: job.updatedAt || job.createdAt || undefined,
      changeFrequency: "daily",
      priority: 0.9,
    }));

    return [...baseEntries, ...jobEntries];
  } catch (error) {
    console.error("Dynamic sitemap job lookup failed; serving static entries:", error);
    return baseEntries;
  }
}

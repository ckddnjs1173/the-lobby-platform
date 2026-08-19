import type { Metadata } from "next";

import SaveJobFloatingButton from "../../../components/candidate/SaveJobFloatingButton";
import JobOperationalDetailsPanel from "../../../components/public/JobOperationalDetailsPanel";
import { getPublicJob } from "../../../lib/server/publicJobService";

interface JobLayoutProps {
  children: React.ReactNode;
  params: Promise<{ jobId: string }>;
}

function buildDescription(job: {
  title: string;
  displayCompany: string;
  location: string;
  employmentType: string;
  description: string;
}): string {
  const summary = [
    job.displayCompany,
    job.title,
    job.location,
    job.employmentType,
  ].filter(Boolean).join(" · ");
  const detail = job.description.replace(/\s+/g, " ").trim();
  return `${summary}${detail ? ` | ${detail}` : ""}`.slice(0, 155);
}

export async function generateMetadata({ params }: JobLayoutProps): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getPublicJob(jobId);

  if (!job) {
    return {
      title: "채용공고 | The Lobby",
      description: "The Lobby 리셉션·프론트·VIP 고객서비스 채용공고",
      robots: { index: false, follow: true },
    };
  }

  const title = `${job.title} | ${job.displayCompany} | The Lobby`;
  const description = buildDescription(job);

  return {
    title,
    description,
    alternates: {
      canonical: `/jobs/${encodeURIComponent(job.jobId)}`,
    },
    openGraph: {
      type: "website",
      title,
      description,
    },
  };
}

export default async function JobDetailLayout({ children, params }: JobLayoutProps) {
  const { jobId } = await params;
  const job = await getPublicJob(jobId);

  const structuredData = job && job.createdAt
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: [
          job.description,
          job.requirements.length
            ? `지원자격: ${job.requirements.join(" / ")}`
            : "",
          job.preferredQualifications.length
            ? `우대사항: ${job.preferredQualifications.join(" / ")}`
            : "",
        ].filter(Boolean).join("\n"),
        datePosted: job.createdAt,
        ...(job.applicationDeadline
          ? { validThrough: `${job.applicationDeadline}T23:59:59+09:00` }
          : {}),
        ...(job.employmentType
          ? { employmentType: job.employmentType }
          : {}),
        ...(job.workHours ? { workHours: job.workHours } : {}),
        ...(job.benefits?.length
          ? { jobBenefits: job.benefits.join(", ") }
          : {}),
        hiringOrganization: {
          "@type": "Organization",
          name: job.displayCompany,
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            ...(job.detailedLocation
              ? { streetAddress: job.detailedLocation }
              : {}),
            addressLocality: job.location || "대한민국",
            addressCountry: "KR",
          },
        },
      }
    : null;

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      {children}
      {job ? <JobOperationalDetailsPanel job={job} /> : null}
      {job ? <SaveJobFloatingButton jobId={job.jobId} /> : null}
    </>
  );
}

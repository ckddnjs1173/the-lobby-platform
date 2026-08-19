import type { Metadata } from "next";

import SaveJobFloatingButton from "../../../components/candidate/SaveJobFloatingButton";
import JobOperationalDetailsPanel from "../../../components/public/JobOperationalDetailsPanel";
import type { PublicJobView } from "../../../lib/publicJobTypes";
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

function schemaEmploymentType(value: string): string | string[] | undefined {
  const normalized = value.toLocaleLowerCase("ko-KR");
  const types = new Set<string>();

  if (normalized.includes("정규") || normalized.includes("full")) {
    types.add("FULL_TIME");
  }
  if (
    normalized.includes("파트") ||
    normalized.includes("아르바이트") ||
    normalized.includes("알바") ||
    normalized.includes("part")
  ) {
    types.add("PART_TIME");
  }
  if (normalized.includes("계약") || normalized.includes("temporary")) {
    types.add("TEMPORARY");
  }
  if (normalized.includes("파견") || normalized.includes("contractor")) {
    types.add("CONTRACTOR");
  }
  if (normalized.includes("인턴") || normalized.includes("intern")) {
    types.add("INTERN");
  }

  const result = Array.from(types);
  if (result.length === 0) return undefined;
  return result.length === 1 ? result[0] : result;
}

function fullStructuredDescription(job: PublicJobView): string {
  const lines = [
    job.description,
    job.requirements.length
      ? `지원자격: ${job.requirements.join(" / ")}`
      : "",
    job.preferredQualifications.length
      ? `우대사항: ${job.preferredQualifications.join(" / ")}`
      : "",
    job.workSchedule ? `근무요일: ${job.workSchedule}` : "",
    job.workHours ? `근무시간: ${job.workHours}` : "",
    job.breakTime ? `휴게시간: ${job.breakTime}` : "",
    job.experienceLevel ? `경력조건: ${job.experienceLevel}` : "",
    job.educationLevel ? `학력조건: ${job.educationLevel}` : "",
    job.contractPeriod ? `계약기간: ${job.contractPeriod}` : "",
    job.conversionOpportunity
      ? `정규직 전환: ${job.conversionOpportunity}`
      : "",
    job.headcount ? `모집인원: ${job.headcount}` : "",
    job.nearbyTransit ? `인근 교통: ${job.nearbyTransit}` : "",
    job.detailedLocation ? `상세 근무지: ${job.detailedLocation}` : "",
    job.benefits?.length
      ? `복리후생: ${job.benefits.join(" / ")}`
      : "",
  ].filter(Boolean);

  return lines.join("\n");
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
  const employmentType = job
    ? schemaEmploymentType(job.employmentType)
    : undefined;

  const structuredData = job && job.createdAt
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        identifier: {
          "@type": "PropertyValue",
          name: job.displayCompany,
          value: job.jobId,
        },
        title: job.title,
        description: fullStructuredDescription(job),
        datePosted: job.createdAt,
        ...(job.applicationDeadline
          ? { validThrough: `${job.applicationDeadline}T23:59:59+09:00` }
          : {}),
        ...(employmentType ? { employmentType } : {}),
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

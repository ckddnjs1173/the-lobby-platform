import type { Metadata } from "next";

import SaveJobFloatingButton from "../../../components/candidate/SaveJobFloatingButton";
import type { PublicJobView } from "../../../lib/publicJobTypes";
import { getPublicJob } from "../../../lib/server/publicJobService";

interface JobLayoutProps {
  children: React.ReactNode;
  params: Promise<{ jobId: string }>;
}

function buildDescription(job: {
  title: string;
  displayCompany: string;
  workplaceName?: string;
  location: string;
  employmentType: string;
  description: string;
}): string {
  const summary = [
    job.workplaceName || job.displayCompany,
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

  if (normalized.includes("정규") || normalized.includes("full")) types.add("FULL_TIME");
  if (
    normalized.includes("파트") ||
    normalized.includes("아르바이트") ||
    normalized.includes("알바") ||
    normalized.includes("part")
  ) types.add("PART_TIME");
  if (normalized.includes("계약") || normalized.includes("temporary")) types.add("TEMPORARY");
  if (normalized.includes("파견") || normalized.includes("contractor")) types.add("CONTRACTOR");
  if (normalized.includes("인턴") || normalized.includes("intern")) types.add("INTERN");

  const result = Array.from(types);
  if (result.length === 0) return undefined;
  return result.length === 1 ? result[0] : result;
}

function fullStructuredDescription(job: PublicJobView): string {
  const lines = [
    job.workplaceName ? `근무처: ${job.workplaceName}` : "",
    job.employingCompany ? `소속회사: ${job.employingCompany}` : "",
    job.description,
    job.requirements.length ? `지원자격: ${job.requirements.join(" / ")}` : "",
    job.preferredQualifications.length ? `우대사항: ${job.preferredQualifications.join(" / ")}` : "",
    job.salaryBase ? `기본급여: ${job.salaryBase}` : job.salary ? `급여: ${job.salary}` : "",
    job.salaryIncentive ? `성과급: ${job.salaryIncentive}` : "",
    job.salaryAllowances ? `기타수당: ${job.salaryAllowances}` : "",
    job.severancePay ? `퇴직금: ${job.severancePay}` : "",
    job.workSchedule ? `근무요일: ${job.workSchedule}` : "",
    job.workHours ? `근무시간: ${job.workHours}` : "",
    job.breakTime ? `휴게시간: ${job.breakTime}` : "",
    job.experienceLevel ? `경력조건: ${job.experienceLevel}` : "",
    job.educationLevel ? `학력조건: ${job.educationLevel}` : "",
    job.contractPeriod ? `계약기간: ${job.contractPeriod}` : "",
    job.conversionOpportunity ? `정규직 전환: ${job.conversionOpportunity}` : "",
    job.headcount ? `모집인원: ${job.headcount}` : "",
    job.interviewSchedule ? `면접일정: ${job.interviewSchedule}` : "",
    job.expectedStartDate ? `입사예정일: ${job.expectedStartDate}` : "",
    job.hiringScheduleNote ? `채용일정 비고: ${job.hiringScheduleNote}` : "",
    job.nearbyTransit ? `인근 교통: ${job.nearbyTransit}` : "",
    job.detailedLocation ? `상세 근무지: ${job.detailedLocation}` : "",
    job.benefits?.length ? `복리후생: ${job.benefits.join(" / ")}` : "",
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

  const title = `${job.title} | ${job.workplaceName || job.displayCompany} | The Lobby`;
  const description = buildDescription(job);

  return {
    title,
    description,
    alternates: { canonical: `/jobs/${encodeURIComponent(job.jobId)}` },
    openGraph: { type: "website", title, description },
  };
}

export default async function JobDetailLayout({ children, params }: JobLayoutProps) {
  const { jobId } = await params;
  const job = await getPublicJob(jobId);
  const employmentType = job ? schemaEmploymentType(job.employmentType) : undefined;

  const structuredData = job && job.createdAt
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        identifier: {
          "@type": "PropertyValue",
          name: job.employingCompany || job.displayCompany,
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
        ...(job.benefits?.length ? { jobBenefits: job.benefits.join(", ") } : {}),
        hiringOrganization: {
          "@type": "Organization",
          name: job.employingCompany || job.displayCompany,
        },
        jobLocation: {
          "@type": "Place",
          name: job.workplaceName || job.displayCompany,
          address: {
            "@type": "PostalAddress",
            ...(job.detailedLocation ? { streetAddress: job.detailedLocation } : {}),
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
      {job ? <SaveJobFloatingButton jobId={job.jobId} /> : null}
    </>
  );
}

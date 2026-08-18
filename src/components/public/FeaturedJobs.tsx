"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../../lib/firebase";
import type { Job } from "../../types";

const JOB_IMAGES = {
  corporate:
    "https://images.unsplash.com/photo-1775447665921-87fb172bf115?auto=format&fit=crop&w=1400&q=86",
  hotel:
    "https://images.unsplash.com/photo-1758193783649-13371d7fb8dd?auto=format&fit=crop&w=1400&q=86",
  clinic:
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=86",
  showroom:
    "https://images.unsplash.com/photo-1676288176820-a5a954d81e6e?auto=format&fit=crop&w=1400&q=86",
  lounge:
    "https://images.unsplash.com/photo-1758448511255-ac2a24a135d7?auto=format&fit=crop&w=1400&q=86",
} as const;

function getTimestampMillis(value: unknown): number {
  if (typeof value !== "object" || value === null) {
    return 0;
  }

  const timestamp = value as { toMillis?: () => number };

  if (typeof timestamp.toMillis !== "function") {
    return 0;
  }

  try {
    return timestamp.toMillis();
  } catch {
    return 0;
  }
}

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function compactText(value: string, maxLength: number): string {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "협의";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

function imageForJob(job: Job): string {
  const text = `${job.title} ${job.company} ${job.displayCompany}`.toLocaleLowerCase(
    "ko-KR"
  );

  if (
    text.includes("자동차") ||
    text.includes("전시장") ||
    text.includes("쇼룸") ||
    text.includes("딜러") ||
    text.includes("모터")
  ) {
    return JOB_IMAGES.showroom;
  }

  if (
    text.includes("병원") ||
    text.includes("의원") ||
    text.includes("클리닉") ||
    text.includes("clinic") ||
    text.includes("medical")
  ) {
    return JOB_IMAGES.clinic;
  }

  if (
    text.includes("호텔") ||
    text.includes("리조트") ||
    text.includes("프론트") ||
    text.includes("컨시어지") ||
    text.includes("hotel")
  ) {
    return JOB_IMAGES.hotel;
  }

  if (
    text.includes("vip") ||
    text.includes("라운지") ||
    text.includes("의전") ||
    text.includes("lounge")
  ) {
    return JOB_IMAGES.lounge;
  }

  return JOB_IMAGES.corporate;
}

function formatLocation(value: string): string {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "협의";
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const first = tokens[0] || "";
  const second = tokens[1] || "";
  const regionPrefix = /^(서울|경기|인천|부산|대구|대전|광주|울산|세종|제주|강원|충북|충남|전북|전남|경북|경남)/;

  if (regionPrefix.test(first) && second) {
    return `${first} ${second}`;
  }

  return compactText(normalized, 18);
}

function formatEmploymentType(value: string): string {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "협의";
  }

  const employment =
    normalized.includes("정규")
      ? "정규직"
      : normalized.includes("파견")
        ? "파견계약직"
        : normalized.includes("계약")
          ? "계약직"
          : normalized.includes("인턴")
            ? "인턴"
            : normalized.includes("아르바이트") || normalized.includes("알바")
              ? "아르바이트"
              : "";

  const durationMatch = normalized.match(/(?:최초\s*)?(\d+)\s*년/);

  if (employment && durationMatch && employment !== "정규직") {
    return `${employment} · ${durationMatch[1]}년`;
  }

  if (employment) {
    return employment;
  }

  const firstSegment = normalized.split(/[·/|]/)[0]?.trim() || normalized;
  return compactText(firstSegment, 16);
}

function formatSalary(value: string): string {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "협의";
  }

  const monthly = normalized.match(
    /월\s*[0-9,.]+\s*(?:만원|원)(?:\s*이상)?/
  );

  if (monthly?.[0]) {
    return monthly[0].replace(/\s+/g, " ").trim();
  }

  const annual = normalized.match(
    /(?:연봉|연)\s*[0-9,.]+\s*(?:만원|원)?(?:\s*이상)?/
  );

  if (annual?.[0]) {
    return annual[0].replace(/\s+/g, " ").trim();
  }

  const firstSegment = normalized.split(/[·|]/)[0]?.trim() || normalized;
  return compactText(firstSegment, 20);
}

function gridClass(count: number): string {
  if (count === 1) {
    return "grid max-w-[430px] gap-4";
  }

  if (count === 2) {
    return "grid gap-4 md:grid-cols-2 xl:max-w-[900px]";
  }

  if (count === 3) {
    return "grid gap-4 md:grid-cols-2 xl:grid-cols-3";
  }

  return "grid gap-4 md:grid-cols-2 xl:grid-cols-4";
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M5 12h13M14 7l5 5-5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FeaturedJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const jobsQuery = query(
      collection(db, "jobs"),
      where("status", "==", "OPEN")
    );

    return onSnapshot(
      jobsQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map(
            (document) =>
              ({
                jobId: document.id,
                ...document.data(),
              }) as Job
          )
          .sort(
            (a, b) =>
              getTimestampMillis(b.createdAt) -
              getTimestampMillis(a.createdAt)
          );

        setJobs(items);
        setLoading(false);
      },
      () => {
        setJobs([]);
        setLoading(false);
      }
    );
  }, []);

  const featuredJobs = useMemo(() => jobs.slice(0, 4), [jobs]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-brand-line bg-white shadow-card"
          >
            <div className="h-44 animate-pulse bg-brand-cream/70" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-24 animate-pulse rounded bg-brand-cream" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-brand-cream" />
              <div className="h-3 w-full animate-pulse rounded bg-brand-ivory" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (featuredJobs.length === 0) {
    return (
      <div className="rounded-xl border border-brand-line bg-white px-6 py-12 text-center shadow-card">
        <p className="font-editorial text-2xl text-brand-espresso">
          새로운 포지션을 준비하고 있습니다.
        </p>
        <p className="mt-2 text-sm text-brand-muted">
          오픈 공고가 등록되면 이곳에서 가장 먼저 확인할 수 있습니다.
        </p>
        <Link
          href="/jobs"
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-bronze"
        >
          채용공고 전체 보기
          <ArrowIcon />
        </Link>
      </div>
    );
  }

  return (
    <div className={gridClass(featuredJobs.length)}>
      {featuredJobs.map((job) => {
        const company =
          normalizeText(job.displayCompany) ||
          normalizeText(job.company) ||
          "The Lobby Partner";

        return (
          <Link
            key={job.jobId}
            href="/jobs"
            className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-brand-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-gold/35 hover:shadow-soft"
          >
            <div className="relative h-48 overflow-hidden bg-brand-cream">
              <div
                className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.035]"
                style={{ backgroundImage: `url('${imageForJob(job)}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/70 via-brand-espresso/5 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-white/35 bg-white/92 px-3 py-1 text-[9px] font-bold tracking-[0.1em] text-brand-bronze backdrop-blur">
                RECOMMENDED
              </div>
              <div className="absolute bottom-4 left-4 right-4 min-w-0 text-white">
                <p className="truncate text-[10px] font-semibold text-white/75">
                  {company}
                </p>
                <h3 className="mt-1 line-clamp-2 break-keep text-[16px] font-bold leading-snug sm:text-[17px]">
                  {job.title}
                </h3>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <dl className="grid gap-2.5 text-[11px] text-brand-muted sm:text-xs">
                <div className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3">
                  <dt>근무지</dt>
                  <dd className="truncate text-right font-semibold text-brand-ink">
                    {formatLocation(job.location)}
                  </dd>
                </div>
                <div className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3">
                  <dt>근무형태</dt>
                  <dd className="truncate text-right font-semibold text-brand-ink">
                    {formatEmploymentType(job.employmentType)}
                  </dd>
                </div>
                <div className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3">
                  <dt>급여</dt>
                  <dd className="truncate text-right font-semibold text-brand-ink">
                    {formatSalary(job.salary)}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex items-center justify-between border-t border-brand-line pt-4 text-xs font-bold text-brand-bronze">
                <span className="mt-5">공고 살펴보기</span>
                <span className="mt-5">
                  <ArrowIcon />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

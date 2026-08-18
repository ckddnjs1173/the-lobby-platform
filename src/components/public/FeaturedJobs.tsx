"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../../lib/firebase";
import type { Job } from "../../types";

const JOB_IMAGES = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=86",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=86",
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=86",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=86",
] as const;

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

function imageForJob(job: Job, index: number): string {
  const text = `${job.title} ${job.company} ${job.displayCompany}`.toLocaleLowerCase("ko-KR");

  if (text.includes("호텔") || text.includes("프론트") || text.includes("컨시어지")) {
    return JOB_IMAGES[1];
  }

  if (text.includes("라운지") || text.includes("vip") || text.includes("서비스")) {
    return JOB_IMAGES[2];
  }

  if (text.includes("전시장") || text.includes("쇼룸") || text.includes("자동차")) {
    return JOB_IMAGES[3];
  }

  return JOB_IMAGES[index % JOB_IMAGES.length];
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
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

  const featuredJobs = useMemo(
    () => jobs.slice(0, 4),
    [jobs]
  );

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-card">
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
      <div className="rounded-2xl border border-brand-line bg-white px-6 py-12 text-center shadow-card">
        <p className="font-editorial text-2xl text-brand-espresso">새로운 포지션을 준비하고 있습니다.</p>
        <p className="mt-2 text-sm text-brand-muted">오픈 공고가 등록되면 이곳에서 가장 먼저 확인할 수 있습니다.</p>
        <Link href="/jobs" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-bronze">
          채용공고 전체 보기
          <ArrowIcon />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {featuredJobs.map((job, index) => {
        const company = job.displayCompany?.trim() || job.company?.trim() || "The Lobby Partner";

        return (
          <Link
            key={job.jobId}
            href="/jobs"
            className="group overflow-hidden rounded-2xl border border-brand-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-gold/35 hover:shadow-soft"
          >
            <div className="relative h-44 overflow-hidden bg-brand-cream">
              <div
                className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.035]"
                style={{ backgroundImage: `url('${imageForJob(job, index)}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/55 via-transparent to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/90 px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-brand-bronze backdrop-blur">
                RECOMMENDED
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-[11px] font-semibold text-white/75">{company}</p>
                <h3 className="mt-1 line-clamp-2 text-[17px] font-bold leading-snug">{job.title}</h3>
              </div>
            </div>

            <div className="p-5">
              <div className="grid gap-2 text-xs text-brand-muted">
                <div className="flex items-center justify-between gap-3">
                  <span>근무지</span>
                  <span className="truncate font-semibold text-brand-ink">{job.location || "협의"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>근무형태</span>
                  <span className="truncate font-semibold text-brand-ink">{job.employmentType || "협의"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>급여</span>
                  <span className="truncate font-semibold text-brand-ink">{job.salary || "협의"}</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-brand-line pt-4 text-xs font-bold text-brand-bronze">
                공고 살펴보기
                <ArrowIcon />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

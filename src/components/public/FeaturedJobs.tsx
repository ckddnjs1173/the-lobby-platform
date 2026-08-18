"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../../lib/firebase";
import {
  formatJobEmploymentType,
  formatJobLocation,
  formatJobSalary,
  getJobDisplayCompany,
  getJobImage,
  getJobTimestampMillis,
} from "../../lib/jobPresentation";
import type { Job } from "../../types";

function gridClass(count: number): string {
  if (count === 1) return "grid max-w-[430px] gap-4";
  if (count === 2) return "grid gap-4 md:grid-cols-2 xl:max-w-[900px]";
  if (count === 3) return "grid gap-4 md:grid-cols-2 xl:grid-cols-3";
  return "grid gap-4 md:grid-cols-2 xl:grid-cols-4";
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
    const jobsQuery = query(collection(db, "jobs"), where("status", "==", "OPEN"));

    return onSnapshot(
      jobsQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map((document) => ({ jobId: document.id, ...document.data() }) as Job)
          .sort(
            (a, b) =>
              getJobTimestampMillis(b.createdAt) - getJobTimestampMillis(a.createdAt)
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
          <div key={index} className="overflow-hidden rounded-xl border border-brand-line bg-white shadow-card">
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
    <div className={gridClass(featuredJobs.length)}>
      {featuredJobs.map((job) => {
        const company = getJobDisplayCompany(job);

        return (
          <Link
            key={job.jobId}
            href={`/jobs/${job.jobId}`}
            className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-brand-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-gold/35 hover:shadow-soft"
          >
            <div className="relative h-48 overflow-hidden bg-brand-cream">
              <div
                className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.035]"
                style={{ backgroundImage: `url('${getJobImage(job)}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/70 via-brand-espresso/5 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-white/35 bg-white/92 px-3 py-1 text-[9px] font-bold tracking-[0.1em] text-brand-bronze backdrop-blur">
                RECOMMENDED
              </div>
              <div className="absolute bottom-4 left-4 right-4 min-w-0 text-white">
                <p className="truncate text-[10px] font-semibold text-white/75">{company}</p>
                <h3 className="mt-1 line-clamp-2 break-keep text-[16px] font-bold leading-snug sm:text-[17px]">{job.title}</h3>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <dl className="grid gap-2.5 text-[11px] text-brand-muted sm:text-xs">
                <div className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3">
                  <dt>근무지</dt>
                  <dd className="truncate text-right font-semibold text-brand-ink">{formatJobLocation(job.location)}</dd>
                </div>
                <div className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3">
                  <dt>근무형태</dt>
                  <dd className="truncate text-right font-semibold text-brand-ink">{formatJobEmploymentType(job.employmentType)}</dd>
                </div>
                <div className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3">
                  <dt>급여</dt>
                  <dd className="truncate text-right font-semibold text-brand-ink">{formatJobSalary(job.salary)}</dd>
                </div>
              </dl>

              <div className="mt-auto flex items-center justify-between border-t border-brand-line pt-4 text-xs font-bold text-brand-bronze">
                <span className="mt-5">공고 상세보기</span>
                <span className="mt-5"><ArrowIcon /></span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

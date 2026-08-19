"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  formatJobEmploymentType,
  formatJobLocation,
  formatJobSalary,
  getJobDisplayCompany,
  getJobImage,
} from "../../lib/jobPresentation";
import { fetchPublicJobs } from "../../lib/publicJobApi";
import type { PublicJobView } from "../../lib/publicJobTypes";

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

function TalentPoolCard() {
  return (
    <Link
      href="/talent-pool"
      className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-xl bg-brand-espresso p-6 text-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-brand-gold/20" />
      <div className="absolute -right-7 -top-7 h-36 w-36 rounded-full border border-brand-gold/15" />
      <p className="relative text-[9px] font-bold uppercase tracking-[0.2em] text-brand-cream/65">Talent Pool</p>
      <h3 className="font-editorial relative mt-5 break-keep text-[28px] font-bold leading-[1.35] tracking-[-0.035em]">
        맞는 공고가 없어도 프로필은 먼저 준비할 수 있습니다.
      </h3>
      <p className="relative mt-5 break-keep text-[12px] leading-6 text-white/65">
        리셉션·프론트·고객서비스 커리어 프로필을 한 번 등록하고, 새로운 공고를 볼 때 그대로 활용하세요.
      </p>
      <div className="relative mt-7 grid gap-2.5 text-[11px] text-white/70">
        <span>· 공고 없이 등록 가능</span>
        <span>· AI 이력서 구조화 또는 직접 입력</span>
        <span>· 등록 후 Candidate Portal에서 수정</span>
      </div>
      <span className="relative mt-auto flex items-center justify-between border-t border-white/15 pt-5 text-[12px] font-bold text-brand-cream">
        인재풀 알아보기
        <ArrowIcon />
      </span>
    </Link>
  );
}

export default function FeaturedJobs() {
  const [jobs, setJobs] = useState<PublicJobView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchPublicJobs()
      .then((items) => {
        if (!cancelled) setJobs(items);
      })
      .catch((error) => {
        console.error("Featured public jobs load failed:", error);
        if (!cancelled) setJobs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-[390px] flex-col justify-center rounded-xl border border-brand-line bg-white px-7 py-12 shadow-card sm:px-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Open Positions</p>
          <h3 className="font-editorial mt-4 max-w-[620px] break-keep text-[30px] font-bold leading-[1.35] tracking-[-0.03em] text-brand-espresso sm:text-[34px]">
            현재 공개된 포지션을 준비하고 있습니다.
          </h3>
          <p className="mt-4 max-w-[620px] break-keep text-[13px] leading-6 text-brand-muted">
            공고 수를 부풀리기보다 실제 지원 가능한 포지션만 공개합니다. 지금 맞는 공고가 없다면 인재풀 프로필을 먼저 만들어두세요.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/jobs" className="inline-flex items-center gap-2 rounded-lg border border-brand-line bg-brand-light px-5 py-3 text-[12px] font-bold text-brand-bronze">
              채용공고 전체 보기
              <ArrowIcon />
            </Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-brand-bronze px-5 py-3 text-[12px] font-bold text-white">
              인재풀 등록 시작
              <ArrowIcon />
            </Link>
          </div>
        </div>
        <TalentPoolCard />
      </div>
    );
  }

  const showTalentPoolCard = featuredJobs.length < 4;
  const visibleCardCount = featuredJobs.length + (showTalentPoolCard ? 1 : 0);

  return (
    <div className={gridClass(visibleCardCount)}>
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
                OPEN POSITION
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

      {showTalentPoolCard ? <TalentPoolCard /> : null}
    </div>
  );
}

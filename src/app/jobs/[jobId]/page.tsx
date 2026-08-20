"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CandidateHeader from "../../../components/candidate/CandidateHeader";
import {
  CandidatePortalApiError,
  fetchCandidatePortalApplications,
} from "../../../lib/candidatePortalApi";
import { ApplicationApiError, applyToJob } from "../../../lib/applicationApi";
import { auth } from "../../../lib/firebase";
import {
  formatJobEmploymentType,
  formatJobLocation,
  formatJobSalary,
  getJobCategory,
  getJobCategoryLabel,
  getJobDisplayCompany,
  getJobImage,
} from "../../../lib/jobPresentation";
import { fetchPublicJob, fetchPublicJobs } from "../../../lib/publicJobApi";
import type { PublicJobView } from "../../../lib/publicJobTypes";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-4 border-b border-brand-line py-3.5 last:border-b-0">
      <dt className="text-[11px] font-semibold text-brand-muted">{label}</dt>
      <dd className="break-keep text-[12px] font-bold leading-5 text-brand-ink">{value}</dd>
    </div>
  );
}

function ConditionCard({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-brand-line bg-white px-4 py-3.5">
      <p className="text-[10px] font-bold text-brand-muted">{label}</p>
      <p className="mt-1.5 break-keep text-[13px] font-bold leading-5 text-brand-espresso">{value}</p>
    </div>
  );
}

function SalaryLine({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 border-b border-brand-line py-3 last:border-b-0 sm:grid-cols-[100px_minmax(0,1fr)] sm:gap-4">
      <span className="text-[11px] font-semibold text-brand-muted">{label}</span>
      <span className="break-keep text-[13px] font-bold leading-6 text-brand-ink">{value}</span>
    </div>
  );
}

function primarySalary(job: PublicJobView): string {
  return job.salaryBase || formatJobSalary(job.salary);
}

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const jobId = typeof params.jobId === "string" ? params.jobId : "";

  const [job, setJob] = useState<PublicJobView | null>(null);
  const [allJobs, setAllJobs] = useState<PublicJobView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    setIsAuthenticated(Boolean(user));
    if (!user) {
      setIsApplied(false);
      return;
    }

    try {
      const applications = await fetchCandidatePortalApplications();
      setIsApplied(applications.some((application) => application.jobId === jobId));
    } catch (error) {
      if (error instanceof CandidatePortalApiError && error.code === "CANDIDATE_NOT_FOUND") {
        setIsApplied(false);
        return;
      }
      console.error("Candidate application-state restore failed:", error);
    }
  }), [jobId]);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchPublicJob(jobId)
      .then((item) => {
        if (!cancelled) setJob(item);
      })
      .catch((error) => {
        console.error("Public job detail load failed:", error);
        if (!cancelled) setJob(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    let cancelled = false;
    fetchPublicJobs()
      .then((items) => {
        if (!cancelled) setAllJobs(items);
      })
      .catch((error) => {
        console.error("Related public jobs load failed:", error);
        if (!cancelled) setAllJobs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const relatedJobs = useMemo(() => {
    if (!job) return [];
    const category = getJobCategory(job);
    const sameCategory = allJobs.filter(
      (item) => item.jobId !== job.jobId && getJobCategory(item) === category
    );
    const fallback = allJobs.filter(
      (item) => item.jobId !== job.jobId && !sameCategory.some((same) => same.jobId === item.jobId)
    );
    return [...sameCategory, ...fallback].slice(0, 3);
  }, [allJobs, job]);

  const handleApply = async () => {
    if (!job) return;
    if (!isAuthenticated) {
      toast("로그인 후 Candidate 프로필로 지원할 수 있습니다.");
      router.push("/login");
      return;
    }
    if (isApplied) {
      toast("이미 지원한 공고입니다.");
      return;
    }

    setApplying(true);
    try {
      await applyToJob(job.jobId);
      setIsApplied(true);
      toast.success("지원이 완료되었습니다. 지원현황에서 진행 상태를 확인할 수 있습니다.");
    } catch (error) {
      if (error instanceof ApplicationApiError) {
        if (error.code === "CANDIDATE_NOT_FOUND") {
          toast.error("지원 전에 Candidate 프로필 등록을 완료해주세요.");
          router.push("/register");
          return;
        }
        if (error.code === "DUPLICATE_APPLICATION") {
          setIsApplied(true);
          toast("이미 지원한 공고입니다.");
          return;
        }
        if (
          error.status === 401 ||
          error.code === "AUTH_REQUIRED" ||
          error.code === "AUTH_TOKEN_MISSING" ||
          error.code === "INVALID_ID_TOKEN"
        ) {
          router.push("/login");
          return;
        }
        toast.error(error.message);
        return;
      }
      console.error("Candidate apply failed:", error);
      toast.error("지원 처리 중 오류가 발생했습니다.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light">
        <CandidateHeader />
        <div className="flex min-h-screen items-center justify-center pt-20 text-sm text-brand-muted">채용공고를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-brand-light">
        <CandidateHeader />
        <main className="mx-auto max-w-3xl px-5 pb-16 pt-32 text-center sm:px-8">
          <div className="rounded-xl border border-brand-line bg-white px-6 py-16 shadow-card">
            <p className="font-editorial text-3xl text-brand-espresso">현재 확인할 수 없는 공고입니다.</p>
            <p className="mt-3 text-sm text-brand-muted">마감되었거나 존재하지 않는 채용공고일 수 있습니다.</p>
            <Link href="/jobs" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-brand-bronze px-5 py-3 text-xs font-bold text-white">
              채용공고 목록으로 <ArrowIcon />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const company = getJobDisplayCompany(job);
  const workplace = job.workplaceName || company;
  const categoryLabel = getJobCategoryLabel(getJobCategory(job));
  const salary = primarySalary(job);
  const hasStructuredSalary = Boolean(
    job.salaryBase || job.salaryIncentive || job.salaryAllowances || job.severancePay
  );
  const hasHiringSchedule = Boolean(
    job.applicationDeadline || job.interviewSchedule || job.expectedStartDate || job.hiringScheduleNote
  );

  return (
    <div className="candidate-surface min-h-screen bg-brand-light">
      <CandidateHeader />

      <main className="mx-auto max-w-[1460px] px-5 pb-16 pt-28 sm:px-8 lg:px-10">
        <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold text-brand-muted">
          <Link href="/" className="hover:text-brand-bronze">홈</Link>
          <span>›</span>
          <Link href="/jobs" className="hover:text-brand-bronze">채용공고</Link>
          <span>›</span>
          <span className="text-brand-ink">공고 상세</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-brand-line bg-white shadow-card">
              <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                <div className="p-7 sm:p-9">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-brand-gold/30 bg-brand-ivory px-3 py-1 text-[9px] font-bold text-brand-bronze">{categoryLabel}</span>
                    <span className="text-[10px] font-semibold text-brand-muted">현재 채용 중</span>
                  </div>
                  <p className="mt-6 text-sm font-bold text-brand-bronze">{workplace}</p>
                  <h1 className="font-editorial mt-2 break-keep text-[36px] leading-[1.25] tracking-[-0.045em] text-brand-espresso sm:text-[42px]">{job.title}</h1>

                  <dl className="mt-7 max-w-2xl border-y border-brand-line">
                    <InfoRow label="근무처" value={workplace} />
                    <InfoRow label="소속" value={job.employingCompany} />
                    <InfoRow label="고용형태" value={formatJobEmploymentType(job.employmentType)} />
                    <InfoRow label="근무지" value={job.detailedLocation || formatJobLocation(job.location)} />
                    <InfoRow label="근무일정" value={[job.workSchedule, job.workHours].filter(Boolean).join(" · ") || undefined} />
                    <InfoRow label="급여" value={salary} />
                  </dl>
                </div>

                <div className="relative min-h-[290px] overflow-hidden border-t border-brand-line lg:border-l lg:border-t-0">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${getJobImage(job)}')` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/45 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 rounded-lg border border-white/35 bg-brand-espresso/72 px-4 py-3 text-white backdrop-blur">
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/60">J&amp;C Recruiting</p>
                    <p className="mt-1 text-xs font-semibold">지원 전 근무조건과 고용관계를 확인하세요.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-brand-line bg-brand-ivory/55 p-6 shadow-card sm:p-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Employment Summary</p>
              <h2 className="font-editorial mt-2 text-[28px] text-brand-espresso">근무·고용 핵심조건</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <ConditionCard label="근무요일" value={job.workSchedule} />
                <ConditionCard label="근무시간" value={job.workHours} />
                <ConditionCard label="휴게시간" value={job.breakTime} />
                <ConditionCard label="계약기간" value={job.contractPeriod} />
                <ConditionCard label="모집인원" value={job.headcount} />
                <ConditionCard label="인근 교통" value={job.nearbyTransit} />
                <ConditionCard label="경력조건" value={job.experienceLevel} />
                <ConditionCard label="학력조건" value={job.educationLevel} />
                <ConditionCard label="정규직 전환" value={job.conversionOpportunity} />
              </div>
            </section>

            {hasStructuredSalary ? (
              <section className="rounded-xl border border-brand-line bg-white p-7 shadow-card sm:p-9">
                <h2 className="font-editorial text-[26px] text-brand-espresso">급여조건</h2>
                <div className="mt-4">
                  <SalaryLine label="기본급여" value={job.salaryBase || formatJobSalary(job.salary)} />
                  <SalaryLine label="성과급" value={job.salaryIncentive} />
                  <SalaryLine label="기타수당" value={job.salaryAllowances} />
                  <SalaryLine label="퇴직금" value={job.severancePay} />
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-brand-line bg-white p-7 shadow-card sm:p-9">
              <div className="grid gap-9 lg:grid-cols-2">
                <div>
                  <h2 className="font-editorial text-[25px] text-brand-espresso">담당업무</h2>
                  <p className="mt-4 whitespace-pre-line break-keep text-[13px] leading-7 text-brand-ink/80">{job.description || "상세 업무 내용은 담당 리크루터를 통해 안내드립니다."}</p>
                </div>
                <div>
                  <h2 className="font-editorial text-[25px] text-brand-espresso">지원자격</h2>
                  {job.requirements.length > 0 ? (
                    <ul className="mt-4 space-y-2.5 text-[13px] leading-6 text-brand-ink/80">
                      {job.requirements.map((item) => (
                        <li key={item} className="flex gap-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand-bronze" />{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-[13px] text-brand-muted">상세 자격요건은 담당 리크루터를 통해 안내드립니다.</p>
                  )}
                </div>
              </div>

              <div className="mt-9 border-t border-brand-line pt-8">
                <h2 className="font-editorial text-[25px] text-brand-espresso">우대사항</h2>
                {job.preferredQualifications.length > 0 ? (
                  <ul className="mt-4 grid gap-2.5 text-[13px] leading-6 text-brand-ink/80 sm:grid-cols-2">
                    {job.preferredQualifications.map((item) => (
                      <li key={item} className="flex gap-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand-gold" />{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-[13px] text-brand-muted">별도 우대사항이 등록되지 않았습니다.</p>
                )}
              </div>
            </section>

            {job.benefits?.length ? (
              <section className="rounded-xl border border-brand-line bg-white p-7 shadow-card sm:p-9">
                <h2 className="font-editorial text-[25px] text-brand-espresso">복리후생</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.benefits.map((benefit) => (
                    <span key={benefit} className="rounded-full border border-brand-line bg-brand-light px-3 py-2 text-[11px] font-semibold text-brand-ink">{benefit}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {hasHiringSchedule ? (
              <section className="rounded-xl border border-brand-line bg-white p-7 shadow-card sm:p-9">
                <h2 className="font-editorial text-[25px] text-brand-espresso">채용일정</h2>
                <dl className="mt-4 border-y border-brand-line">
                  <InfoRow label="지원 마감" value={job.applicationDeadline} />
                  <InfoRow label="면접일정" value={job.interviewSchedule} />
                  <InfoRow label="입사예정" value={job.expectedStartDate} />
                  <InfoRow label="안내" value={job.hiringScheduleNote} />
                </dl>
              </section>
            ) : null}

            <section className="rounded-xl border border-brand-line bg-white p-7 shadow-card sm:p-9">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-bronze">Selection Flow</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-5">
                {["지원", "서류검토", "연락", "면접", "최종결과"].map((step, index) => (
                  <div key={step} className="flex items-center gap-2 rounded-lg border border-brand-line bg-brand-light px-3 py-3 text-[11px] font-bold text-brand-ink">
                    <span className="font-editorial text-brand-bronze">0{index + 1}</span>{step}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-5 text-brand-muted">지원 후 진행상황은 Candidate Portal에서 확인할 수 있습니다.</p>
            </section>
          </div>

          <aside className="space-y-5">
            <div className="sticky top-24 rounded-xl border border-brand-line bg-white p-6 shadow-card">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Quick Apply</p>
              <h2 className="font-editorial mt-3 text-[25px] text-brand-espresso">간편 지원</h2>
              <p className="mt-2 text-xs leading-5 text-brand-muted">Candidate 프로필 하나로 지원할 수 있습니다.</p>

              <dl className="mt-5 border-y border-brand-line py-1">
                <InfoRow label="근무처" value={workplace} />
                <InfoRow label="소속" value={job.employingCompany} />
                <InfoRow label="고용" value={formatJobEmploymentType(job.employmentType)} />
                <InfoRow label="급여" value={salary} />
              </dl>

              <button
                type="button"
                onClick={() => void handleApply()}
                disabled={applying || isApplied}
                className="mt-5 w-full rounded-lg bg-brand-bronze py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:cursor-not-allowed disabled:opacity-55"
              >
                {applying ? "지원 중..." : isApplied ? "지원 완료" : isAuthenticated ? "이 포지션에 지원하기" : "로그인 후 지원"}
              </button>

              <Link href="/jobs" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-line py-3 text-xs font-bold text-brand-bronze transition hover:bg-brand-ivory">
                다른 공고 보기 <ArrowIcon />
              </Link>

              <div className="mt-5 rounded-lg border border-brand-line bg-brand-light p-4 text-[10px] leading-5 text-brand-muted">
                <strong className="block text-[11px] text-brand-espresso">J&amp;C Recruiting Desk</strong>
                지원 후 등록된 연락처를 기준으로 채용 담당자가 안내합니다.
              </div>
            </div>

            {relatedJobs.length > 0 ? (
              <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-brand-espresso">다른 채용공고</h2>
                  <Link href="/jobs" className="text-[10px] font-bold text-brand-bronze">더보기 →</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {relatedJobs.map((item) => (
                    <Link key={item.jobId} href={`/jobs/${item.jobId}`} className="group flex gap-3 rounded-lg border border-brand-line p-2.5 transition hover:border-brand-gold/45 hover:bg-brand-ivory/45">
                      <div className="h-16 w-20 shrink-0 rounded-md bg-cover bg-center" style={{ backgroundImage: `url('${getJobImage(item)}')` }} />
                      <div className="min-w-0 py-0.5">
                        <p className="truncate text-[10px] text-brand-muted">{item.workplaceName || getJobDisplayCompany(item)}</p>
                        <p className="mt-1 line-clamp-2 break-keep text-[11px] font-bold leading-4 text-brand-ink group-hover:text-brand-bronze">{item.title}</p>
                        <p className="mt-1 text-[9px] text-brand-muted">{formatJobLocation(item.location)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}

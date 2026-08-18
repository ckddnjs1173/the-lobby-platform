"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import PublicHeader from "../../components/public/PublicHeader";
import { CandidatePortalApiError, fetchCandidatePortalApplications } from "../../lib/candidatePortalApi";
import { auth } from "../../lib/firebase";
import { ApplicationApiError, applyToJob } from "../../lib/applicationApi";
import {
  formatJobEmploymentType,
  formatJobLocation,
  formatJobSalary,
  getJobCategory,
  getJobCategoryLabel,
  getJobDisplayCompany,
  getJobImage,
  normalizeJobText,
  type JobVisualCategory,
} from "../../lib/jobPresentation";
import { fetchPublicJobs } from "../../lib/publicJobApi";
import type { PublicJobView } from "../../lib/publicJobTypes";

const CATEGORY_OPTIONS: Array<{ value: "ALL" | JobVisualCategory; label: string }> = [
  { value: "ALL", label: "전체 보기" },
  { value: "corporate", label: "기업 리셉션" },
  { value: "clinic", label: "병원 · 클리닉" },
  { value: "hotel", label: "호텔 프론트" },
  { value: "showroom", label: "전시장 · 쇼룸" },
  { value: "lounge", label: "VIP 라운지" },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<PublicJobView[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(() => new Set());
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<"ALL" | JobVisualCategory>("ALL");
  const [location, setLocation] = useState("ALL");
  const [employment, setEmployment] = useState("ALL");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category");
    const validCategory = CATEGORY_OPTIONS.some(
      (option) => option.value !== "ALL" && option.value === requestedCategory
    );

    setKeyword(params.get("q") || "");
    setCategory(validCategory ? (requestedCategory as JobVisualCategory) : "ALL");
    setLocation(params.get("location") || "ALL");
    setEmployment(params.get("employment") || "ALL");
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setIsAuthenticated(Boolean(user));
      if (!user) {
        setAppliedJobIds(new Set());
        return;
      }

      try {
        const applications = await fetchCandidatePortalApplications();
        setAppliedJobIds(new Set(applications.map((application) => application.jobId)));
      } catch (error) {
        if (
          error instanceof CandidatePortalApiError &&
          error.code === "CANDIDATE_NOT_FOUND"
        ) {
          setAppliedJobIds(new Set());
          return;
        }
        console.error("Candidate application-state restore failed:", error);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchPublicJobs()
      .then((items) => {
        if (!cancelled) setJobs(items);
      })
      .catch((error) => {
        console.error("Public jobs load failed:", error);
        if (!cancelled) {
          setJobs([]);
          toast.error("채용 공고를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const locationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          jobs
            .map((job) => formatJobLocation(job.location).split(" ")[0])
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(b, "ko-KR")
      ),
    [jobs]
  );

  const employmentOptions = useMemo(
    () =>
      Array.from(new Set(jobs.map((job) => formatJobEmploymentType(job.employmentType)))).sort((a, b) =>
        a.localeCompare(b, "ko-KR")
      ),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("ko-KR");

    return jobs.filter((job) => {
      if (category !== "ALL" && getJobCategory(job) !== category) return false;
      if (
        location !== "ALL" &&
        !formatJobLocation(job.location).startsWith(location)
      ) return false;
      if (
        employment !== "ALL" &&
        formatJobEmploymentType(job.employmentType) !== employment
      ) return false;

      if (!normalizedKeyword) return true;

      const haystack = [
        job.title,
        job.displayCompany,
        job.location,
        job.employmentType,
        job.description,
      ]
        .map((value) => normalizeJobText(value))
        .join(" ")
        .toLocaleLowerCase("ko-KR");

      return haystack.includes(normalizedKeyword);
    });
  }, [category, employment, jobs, keyword, location]);

  const syncFiltersToUrl = (
    nextCategory: "ALL" | JobVisualCategory = category
  ) => {
    const params = new URLSearchParams();
    const normalizedKeyword = keyword.trim();

    if (normalizedKeyword) params.set("q", normalizedKeyword);
    if (nextCategory !== "ALL") params.set("category", nextCategory);
    if (location !== "ALL") params.set("location", location);
    if (employment !== "ALL") params.set("employment", employment);

    const query = params.toString();
    router.replace(query ? `/jobs?${query}` : "/jobs", { scroll: false });
  };

  const handleApply = async (jobId: string) => {
    if (!isAuthenticated) {
      toast("로그인 후 Candidate 프로필로 지원할 수 있습니다.");
      router.push("/login");
      return;
    }

    if (appliedJobIds.has(jobId)) {
      toast("이미 지원한 공고입니다.");
      return;
    }

    setApplyingJobId(jobId);

    try {
      await applyToJob(jobId);
      setAppliedJobIds((previous) => {
        const next = new Set(previous);
        next.add(jobId);
        return next;
      });
      toast.success("지원이 완료되었습니다. 지원현황에서 진행 상태를 확인할 수 있습니다.");
    } catch (error) {
      if (error instanceof ApplicationApiError) {
        if (error.code === "CANDIDATE_NOT_FOUND") {
          toast.error("지원 전에 Candidate 프로필 등록을 완료해주세요.");
          router.push("/register");
          return;
        }
        if (error.code === "DUPLICATE_APPLICATION") {
          setAppliedJobIds((previous) => {
            const next = new Set(previous);
            next.add(jobId);
            return next;
          });
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
      setApplyingJobId(null);
    }
  };

  return (
    <main className="min-h-screen bg-brand-light text-brand-ink">
      <PublicHeader />

      <section className="border-b border-brand-line bg-white/35">
        <div className="mx-auto max-w-[1460px] px-5 pb-10 pt-14 sm:px-8 lg:px-10 lg:pb-12 lg:pt-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-brand-bronze">Recommended Jobs</p>
          <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="font-editorial text-[42px] leading-tight tracking-[-0.045em] text-brand-espresso sm:text-[52px]">추천 채용 / 채용공고 탐색</h1>
              <p className="mt-4 text-sm leading-6 text-brand-muted">The Lobby가 엄선한 리셉션·고객서비스 포지션을 확인하고 간편하게 지원하세요.</p>
            </div>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => router.push("/candidate")}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-brand-gold/35 bg-white px-5 py-3 text-xs font-bold text-brand-bronze transition hover:border-brand-gold/60 hover:bg-brand-ivory"
              >
                내 지원현황 보기 <ArrowIcon />
              </button>
            ) : null}
          </div>

          <div className="mt-9 grid overflow-hidden rounded-xl border border-brand-line bg-white shadow-card lg:grid-cols-[1.3fr_0.8fr_0.8fr_76px]">
            <label className="flex min-h-[72px] items-center gap-3 border-b border-brand-line px-5 lg:border-b-0 lg:border-r">
              <span className="text-brand-bronze"><SearchIcon /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-brand-muted">키워드</span>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      syncFiltersToUrl();
                    }
                  }}
                  placeholder="직무, 회사, 지역 검색"
                  className="mt-1 w-full bg-transparent text-sm font-semibold text-brand-espresso outline-none placeholder:font-normal placeholder:text-brand-muted/65"
                />
              </span>
            </label>

            <label className="border-b border-brand-line px-5 py-3.5 lg:border-b-0 lg:border-r">
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-brand-muted">지역</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 w-full cursor-pointer bg-transparent text-sm font-semibold text-brand-espresso outline-none">
                <option value="ALL">전체 지역</option>
                {locationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>

            <label className="px-5 py-3.5 lg:border-r">
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-brand-muted">근무형태</span>
              <select value={employment} onChange={(event) => setEmployment(event.target.value)} className="mt-1 w-full cursor-pointer bg-transparent text-sm font-semibold text-brand-espresso outline-none">
                <option value="ALL">전체 형태</option>
                {employmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>

            <button type="button" onClick={() => syncFiltersToUrl()} aria-label="채용공고 검색" className="flex min-h-[64px] items-center justify-center bg-brand-bronze text-white transition hover:bg-brand-espresso lg:min-h-0">
              <SearchIcon />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((option) => {
              const active = category === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setCategory(option.value);
                    syncFiltersToUrl(option.value);
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${active ? "border-brand-bronze bg-brand-bronze text-white" : "border-brand-line bg-white text-brand-ink hover:border-brand-gold/50 hover:text-brand-bronze"}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1460px] px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
        <div className="mb-6 flex items-center justify-between border-b border-brand-line pb-4">
          <div className="flex items-center gap-5 text-sm">
            <span className="font-bold text-brand-espresso">추천 채용</span>
            <span className="text-brand-muted">신규 채용</span>
            <span className="hidden text-brand-muted sm:inline">리셉션 · 고객서비스</span>
          </div>
          <p className="text-xs text-brand-muted">총 <span className="font-bold text-brand-bronze">{filteredJobs.length}</span>건 · 최신순</p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-brand-line bg-white shadow-card">
                <div className="h-48 animate-pulse bg-brand-cream" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-24 animate-pulse rounded bg-brand-cream" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-brand-cream" />
                  <div className="h-3 w-full animate-pulse rounded bg-brand-ivory" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-brand-line bg-white px-6 py-20 text-center shadow-card">
            <p className="font-editorial text-3xl text-brand-espresso">조건에 맞는 공고가 없습니다.</p>
            <p className="mt-3 text-sm text-brand-muted">검색어나 필터를 변경해서 다시 확인해보세요.</p>
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setCategory("ALL");
                setLocation("ALL");
                setEmployment("ALL");
                router.replace("/jobs", { scroll: false });
              }}
              className="mt-6 rounded-lg border border-brand-gold/35 bg-brand-light px-5 py-3 text-xs font-bold text-brand-bronze"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredJobs.map((job) => {
              const isApplying = applyingJobId === job.jobId;
              const isApplied = appliedJobIds.has(job.jobId);
              const company = getJobDisplayCompany(job);
              const categoryLabel = getJobCategoryLabel(getJobCategory(job));

              return (
                <article key={job.jobId} className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-brand-line bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-gold/35 hover:shadow-soft">
                  <Link href={`/jobs/${job.jobId}`} className="relative block h-48 overflow-hidden bg-brand-cream">
                    <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.035]" style={{ backgroundImage: `url('${getJobImage(job)}')` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/75 via-brand-espresso/5 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full border border-white/35 bg-white/92 px-3 py-1 text-[9px] font-bold tracking-[0.08em] text-brand-bronze backdrop-blur">{categoryLabel}</div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="truncate text-[10px] font-semibold text-white/70">{company}</p>
                      <h2 className="mt-1 line-clamp-2 break-keep text-[17px] font-bold leading-snug">{job.title}</h2>
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <dl className="grid gap-2.5 text-xs text-brand-muted">
                      <div className="flex items-center justify-between gap-4"><dt>근무지</dt><dd className="truncate font-semibold text-brand-ink">{formatJobLocation(job.location)}</dd></div>
                      <div className="flex items-center justify-between gap-4"><dt>근무형태</dt><dd className="truncate font-semibold text-brand-ink">{formatJobEmploymentType(job.employmentType)}</dd></div>
                      <div className="flex items-center justify-between gap-4"><dt>급여</dt><dd className="truncate font-semibold text-brand-ink">{formatJobSalary(job.salary)}</dd></div>
                    </dl>

                    <p className="mt-4 line-clamp-2 min-h-[44px] break-keep text-[12px] leading-[22px] text-brand-muted">
                      {normalizeJobText(job.description) || "The Lobby가 엄선한 리셉션·고객서비스 포지션입니다."}
                    </p>

                    <div className="mt-auto grid grid-cols-[0.8fr_1.2fr] gap-2 border-t border-brand-line pt-4">
                      <Link href={`/jobs/${job.jobId}`} className="flex items-center justify-center rounded-lg border border-brand-line px-3 py-3 text-[11px] font-bold text-brand-bronze transition hover:bg-brand-ivory">
                        상세보기
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleApply(job.jobId)}
                        disabled={isApplying || isApplied}
                        className={`flex items-center justify-between rounded-lg px-4 py-3 text-[11px] font-bold transition ${isApplied ? "cursor-default bg-brand-success/10 text-brand-success" : "bg-brand-espresso text-white hover:bg-brand-bronze disabled:cursor-wait disabled:opacity-60"}`}
                      >
                        <span>{isApplying ? "지원 중..." : isApplied ? "지원 완료" : isAuthenticated ? "간편 지원" : "로그인 후 지원"}</span>
                        <ArrowIcon />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            <aside className="relative flex min-h-[380px] flex-col overflow-hidden rounded-xl bg-brand-espresso p-7 text-white shadow-card">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-brand-gold/20" />
              <div className="absolute -right-7 -top-7 h-36 w-36 rounded-full border border-brand-gold/15" />
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-brand-cream/65">The Lobby Curator Note</p>
              <h3 className="font-editorial mt-5 break-keep text-[30px] leading-[1.35] tracking-[-0.04em]">모든 공고는 직무와 근무조건을 확인하고 연결합니다.</h3>
              <div className="mt-8 grid gap-4 text-xs text-white/70">
                <p>01 · 리셉션·고객서비스 직무 중심</p>
                <p>02 · 지원 이력과 진행상태 연동</p>
                <p>03 · 전문 리크루터 채용 지원</p>
              </div>
              <button type="button" onClick={() => router.push("/register")} className="mt-auto flex items-center justify-between border-t border-white/15 pt-5 text-xs font-bold text-brand-cream">
                프로필 등록하기 <ArrowIcon />
              </button>
            </aside>
          </div>
        )}
      </section>

      <footer className="border-t border-brand-line bg-white/45">
        <div className="mx-auto flex max-w-[1460px] flex-col gap-3 px-5 py-8 text-xs text-brand-muted sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div><span className="font-editorial text-lg tracking-[0.1em] text-brand-espresso">THE LOBBY</span><span className="ml-3">Premium Reception Career Studio</span></div>
          <p>Reception · Hospitality · Customer Service Recruiting</p>
        </div>
      </footer>
    </main>
  );
}

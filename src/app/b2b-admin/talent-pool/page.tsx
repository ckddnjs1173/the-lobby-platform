"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useB2BSession } from "../../../components/b2b-admin/B2BSessionContext";
import {
  fetchGlobalTalentPool,
  GlobalTalentPoolApiError,
  type GlobalTalentPoolItem,
  type GlobalTalentPoolPagination,
} from "../../../lib/globalTalentPoolApi";
import { fetchB2BJobs, type B2BJobView } from "../../../lib/jobApi";
import {
  buildTalentMatchSignals,
  countMatchedSignals,
} from "../../../lib/talentMatchSignals";
import {
  createTalentOpportunityViaApi,
  TalentOpportunityApiError,
} from "../../../lib/talentOpportunityApi";

const PAGE_SIZE = 20;

const STATUS_LABELS = {
  ACTIVE: "적극 구직",
  OPEN: "제안 검토",
  NOT_LOOKING: "구직 안 함",
} as const;

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-xs">
      <span className="font-semibold text-brand-muted">{label}</span>
      <span className="break-keep font-bold text-brand-espresso">{value || "미입력"}</span>
    </div>
  );
}

export default function GlobalTalentPoolPage() {
  const session = useB2BSession();
  const [items, setItems] = useState<GlobalTalentPoolItem[]>([]);
  const [jobs, setJobs] = useState<B2BJobView[]>([]);
  const [loading, setLoading] = useState(true);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [jobsLoadError, setJobsLoadError] = useState<string | null>(null);
  const [poolReloadKey, setPoolReloadKey] = useState(0);
  const [jobsReloadKey, setJobsReloadKey] = useState(0);
  const [queryText, setQueryText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [offerJobId, setOfferJobId] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [matchJobId, setMatchJobId] = useState("");
  const [pagination, setPagination] = useState<GlobalTalentPoolPagination>({
    total: 0,
    limit: PAGE_SIZE,
    hasMore: false,
    nextCursor: null,
  });

  useEffect(() => {
    if (session.role !== "ADMIN") return;
    let cancelled = false;
    setJobsLoadError(null);
    fetchB2BJobs()
      .then((result) => {
        if (!cancelled) setJobs(result);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Talent opportunity job list failed:", error);
        setJobs([]);
        setJobsLoadError("OPEN 포지션 목록을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [jobsReloadKey, session.role]);

  useEffect(() => {
    if (session.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPoolError(null);

    fetchGlobalTalentPool({
      cursor: searchQuery ? null : cursor,
      query: searchQuery || null,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setPagination(result.pagination);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Global talent pool load failed:", error);
        const message =
          error instanceof GlobalTalentPoolApiError
            ? error.message
            : "J&C 공개 인재풀을 불러오지 못했습니다.";
        setItems([]);
        setPoolError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session.role, cursor, poolReloadKey, searchQuery]);

  const openJobs = useMemo(
    () => jobs.filter((job) => job.status === "OPEN"),
    [jobs]
  );

  const selectedMatchJob = useMemo(
    () => openJobs.find((job) => job.jobId === matchJobId) || null,
    [matchJobId, openJobs]
  );

  useEffect(() => {
    if (openJobs.length === 0) {
      if (matchJobId) setMatchJobId("");
      return;
    }
    if (!openJobs.some((job) => job.jobId === matchJobId)) {
      setMatchJobId(openJobs[0].jobId);
    }
  }, [matchJobId, openJobs]);

  if (session.role !== "ADMIN") {
    return (
      <section className="rounded-xl border border-brand-line bg-white px-6 py-16 text-center shadow-card">
        <p className="font-editorial text-3xl text-brand-espresso">J&C 공개 인재풀</p>
        <p className="mt-3 text-sm text-brand-muted">후보자가 직접 공개에 동의한 프로필은 ADMIN 계정에서만 조회할 수 있습니다.</p>
      </section>
    );
  }

  const searching = Boolean(searchQuery);
  const pageNumber = cursorHistory.length + 1;

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = queryText.trim();
    if (!normalized) {
      setSearchQuery("");
      setCursor(null);
      setCursorHistory([]);
      return;
    }
    if (normalized.length < 2) {
      toast.error("검색어는 2자 이상 입력해주세요.");
      return;
    }
    setSearchQuery(normalized);
    setCursor(null);
    setCursorHistory([]);
  };

  const clearSearch = () => {
    setQueryText("");
    setSearchQuery("");
    setCursor(null);
    setCursorHistory([]);
  };

  const nextPage = () => {
    if (loading || searching || !pagination.hasMore || !pagination.nextCursor) return;
    setCursorHistory((previous) => [...previous, cursor]);
    setCursor(pagination.nextCursor);
  };

  const previousPage = () => {
    if (loading || searching || cursorHistory.length === 0) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((previous) => previous.slice(0, -1));
    setCursor(previousCursor);
  };

  const openOfferComposer = (candidateId: string) => {
    setActiveCandidateId(candidateId);
    setOfferJobId(selectedMatchJob?.jobId || openJobs[0]?.jobId || "");
    setOfferNote("");
  };

  const createOffer = async (candidate: GlobalTalentPoolItem) => {
    if (!offerJobId || creatingOffer) {
      if (!offerJobId) toast.error("제안할 공개 포지션을 선택해주세요.");
      return;
    }

    setCreatingOffer(true);
    try {
      const result = await createTalentOpportunityViaApi({
        candidateId: candidate.candidateId,
        jobId: offerJobId,
        note: offerNote,
      });
      toast.success(`${candidate.name} 후보자에게 ${result.jobTitle} 검토 제안을 생성했습니다.`);
      setActiveCandidateId(null);
      setOfferJobId("");
      setOfferNote("");
    } catch (error) {
      console.error("Talent opportunity create failed:", error);
      toast.error(
        error instanceof TalentOpportunityApiError
          ? error.message
          : "채용 제안을 생성하지 못했습니다."
      );
    } finally {
      setCreatingOffer(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-brand-espresso">J&C 공개 인재풀</h1>
            <span className="rounded-full border border-brand-gold/30 bg-brand-ivory px-2.5 py-1 text-[10px] font-bold text-brand-bronze">ADMIN ONLY</span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">
            The Lobby에 직접 가입하고 J&C 인재풀 공개에 동의한 B2C 후보자입니다. 조직별 직접등록 후보자와 분리해 관리합니다.
          </p>
        </div>
        <div className="rounded-lg border border-brand-line bg-white px-4 py-3 text-xs text-brand-muted shadow-card">
          공개 동의 후보자 <strong className="ml-1 text-brand-espresso">{poolError ? "—" : `${pagination.total}명`}</strong>
        </div>
      </div>

      <section className="rounded-xl border border-brand-line bg-white p-4 shadow-card sm:p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="이름, 연락처, 희망직무, 지역, 헤드라인, 스킬 검색"
            className="min-w-0 flex-1 rounded-lg border border-brand-line px-4 py-3 text-sm outline-none focus:border-brand-bronze"
          />
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-espresso px-5 py-3 text-xs font-bold text-white disabled:opacity-45">검색</button>
          {searching ? <button type="button" onClick={clearSearch} className="rounded-lg border border-brand-line px-4 py-3 text-xs font-bold text-brand-muted">초기화</button> : null}
        </form>
        <p className="mt-3 text-[11px] leading-5 text-brand-muted">
          일반 RECRUITER와 기업별 Candidate Pool에는 자동 노출되지 않습니다. 포지션 제안도 실제 지원으로 바로 생성되지 않고 후보자가 직접 수락한 뒤에만 지원 내역으로 전환됩니다.
        </p>
      </section>

      <section className="rounded-xl border border-brand-gold/30 bg-brand-ivory/60 p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-bronze">Rule Match</p>
            <h2 className="mt-1 text-base font-bold text-brand-espresso">포지션 기준 빠른 매칭 신호</h2>
            <p className="mt-1 max-w-3xl text-[12px] leading-5 text-brand-muted">
              AI 점수가 아니라 후보자가 직접 입력한 희망조건과 현재 OPEN 포지션을 비교한 설명 가능한 신호입니다. 이 신호만으로 자동 추천·지원·제안하지 않습니다.
            </p>
            {jobsLoadError ? (
              <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-line bg-white px-3 py-2 text-xs text-brand-muted">
                <span>{jobsLoadError}</span>
                <button type="button" onClick={() => setJobsReloadKey((value) => value + 1)} className="font-bold text-brand-bronze">다시 불러오기</button>
              </div>
            ) : null}
          </div>
          <label className="min-w-0 lg:w-[420px]">
            <span className="mb-1.5 block text-[11px] font-bold text-brand-muted">비교할 OPEN 포지션</span>
            <select
              value={matchJobId}
              onChange={(event) => setMatchJobId(event.target.value)}
              disabled={openJobs.length === 0}
              className="w-full rounded-lg border border-brand-line bg-white px-3 py-3 text-xs font-bold text-brand-espresso disabled:opacity-50"
            >
              {openJobs.length === 0 ? <option value="">{jobsLoadError ? "포지션 목록 오류" : "공개 포지션 없음"}</option> : null}
              {openJobs.map((job) => (
                <option key={`match-${job.jobId}`} value={job.jobId}>
                  {job.displayCompany || job.company} · {job.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedMatchJob ? (
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-brand-muted">
            <span className="rounded-full border border-brand-line bg-white px-3 py-1.5">직무 · {selectedMatchJob.title}</span>
            <span className="rounded-full border border-brand-line bg-white px-3 py-1.5">지역 · {selectedMatchJob.location || "미입력"}</span>
            <span className="rounded-full border border-brand-line bg-white px-3 py-1.5">고용 · {selectedMatchJob.employmentType || "미입력"}</span>
          </div>
        ) : null}
      </section>

      {loading ? (
        <div role="status" aria-live="polite" className="rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">공개 인재풀을 불러오는 중입니다...</div>
      ) : poolError ? (
        <div role="alert" className="rounded-xl border border-brand-line bg-white px-6 py-16 text-center shadow-card">
          <p className="text-sm font-bold text-brand-espresso">J&C 공개 인재풀을 불러오지 못했습니다.</p>
          <p className="mt-2 text-xs text-brand-muted">{poolError}</p>
          <button type="button" onClick={() => { setLoading(true); setPoolReloadKey((value) => value + 1); }} className="mt-5 rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white">다시 불러오기</button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-line bg-white py-20 text-center shadow-card">
          <p className="text-sm font-bold text-brand-espresso">{searching ? "검색 조건에 맞는 후보자가 없습니다." : "아직 공개 동의한 후보자가 없습니다."}</p>
          <p className="mt-2 text-xs text-brand-muted">후보자가 인재풀 설정에서 공개에 동의하면 이곳에 나타납니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((candidate) => {
            const matchSignals = selectedMatchJob
              ? buildTalentMatchSignals(candidate, selectedMatchJob)
              : [];
            const matchedCount = countMatchedSignals(matchSignals);

            return (
              <article key={candidate.candidateId} className="rounded-xl border border-brand-line bg-white p-5 shadow-card sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-brand-espresso">{candidate.name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${candidate.jobSearchStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : candidate.jobSearchStatus === "NOT_LOOKING" ? "bg-slate-100 text-slate-500" : "bg-brand-ivory text-brand-bronze"}`}>{STATUS_LABELS[candidate.jobSearchStatus]}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-brand-ink">{candidate.headline || "등록된 프로필 헤드라인 없음"}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted"><span>{candidate.phone}</span><span className="break-all">{candidate.email}</span></div>
                  </div>
                  <div className="shrink-0 text-right"><p className="font-editorial text-3xl text-brand-espresso">{candidate.profileCompleteness}%</p><p className="text-[10px] text-brand-muted">프로필 완성도</p></div>
                </div>

                <div className="mt-5 grid gap-3 rounded-xl border border-brand-line bg-brand-light p-4 sm:grid-cols-2">
                  <PreferenceRow label="희망 직무" value={candidate.desiredJob} />
                  <PreferenceRow label="희망 지역" value={candidate.desiredLocation} />
                  <PreferenceRow label="희망 급여" value={candidate.desiredSalary} />
                  <PreferenceRow label="고용 형태" value={candidate.desiredEmploymentType} />
                  <PreferenceRow label="입사 가능" value={candidate.availableFrom} />
                  <PreferenceRow label="최근 갱신" value={formatDate(candidate.updatedAt)} />
                </div>

                {selectedMatchJob ? (
                  <div className="mt-4 rounded-xl border border-brand-gold/25 bg-brand-ivory/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-bronze">Match Signals</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-espresso">{matchedCount}/{matchSignals.length}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {matchSignals.map((signal) => (
                        <span
                          key={`${candidate.candidateId}-${signal.key}`}
                          className={`rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${
                            signal.matched
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-brand-line bg-white text-brand-muted"
                          }`}
                        >
                          {signal.matched ? "✓ " : "· "}{signal.label}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-brand-muted">신호가 많아도 자동 지원되지 않으며, 실제 포지션 제안은 ADMIN 검토 후 후보자 수락 절차를 거칩니다.</p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {candidate.skills.length ? candidate.skills.slice(0, 8).map((skill) => <span key={`${candidate.candidateId}-${skill}`} className="rounded-full border border-brand-line bg-white px-2.5 py-1 text-[11px] text-brand-muted">{skill}</span>) : <span className="text-xs text-brand-muted">등록된 스킬 없음</span>}
                </div>

                {activeCandidateId === candidate.candidateId ? (
                  <div className="mt-5 rounded-xl border border-brand-gold/35 bg-brand-ivory p-4">
                    <p className="text-xs font-bold text-brand-espresso">후보자 검토 제안 만들기</p>
                    <p className="mt-1 text-[11px] leading-5 text-brand-muted">후보자에게 먼저 제안만 전달합니다. 후보자가 수락해야 실제 지원 파이프라인에 들어갑니다.</p>
                    <select value={offerJobId} onChange={(event) => setOfferJobId(event.target.value)} className="mt-3 w-full rounded-lg border border-brand-line bg-white px-3 py-3 text-xs font-bold text-brand-espresso">
                      <option value="">공개 포지션 선택</option>
                      {openJobs.map((job) => <option key={job.jobId} value={job.jobId}>{job.displayCompany || job.company} · {job.title}</option>)}
                    </select>
                    <textarea value={offerNote} onChange={(event) => setOfferNote(event.target.value)} maxLength={1000} placeholder="후보자에게 보여줄 검토 메모 (선택)" className="mt-2 min-h-20 w-full resize-y rounded-lg border border-brand-line bg-white px-3 py-3 text-xs leading-5 text-brand-ink" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => setActiveCandidateId(null)} disabled={creatingOffer} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-[11px] font-bold text-brand-muted">취소</button>
                      <button type="button" onClick={() => void createOffer(candidate)} disabled={creatingOffer || !offerJobId} className="rounded-lg bg-brand-bronze px-4 py-2 text-[11px] font-bold text-white disabled:opacity-45">{creatingOffer ? "생성 중..." : "채용 제안 생성"}</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col gap-3 border-t border-brand-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] leading-5 text-brand-muted">공개 동의를 근거로 J&C 내부에서만 검토합니다. 기업 지원 처리 전 후보자의 명시적 수락이 필요합니다.</p>
                    <button type="button" onClick={() => openOfferComposer(candidate.candidateId)} disabled={openJobs.length === 0 || candidate.jobSearchStatus === "NOT_LOOKING"} className="shrink-0 rounded-lg bg-brand-espresso px-4 py-2.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">{openJobs.length === 0 ? "공개 포지션 없음" : candidate.jobSearchStatus === "NOT_LOOKING" ? "현재 구직 안 함" : "포지션 제안"}</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!searching && !loading && pagination.total > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-brand-line bg-white px-4 py-3 shadow-card">
          <button type="button" onClick={previousPage} disabled={cursorHistory.length === 0} className="rounded-lg border border-brand-line px-4 py-2 text-xs font-bold text-brand-muted disabled:opacity-35">이전</button>
          <span className="text-xs text-brand-muted">{pageNumber}페이지</span>
          <button type="button" onClick={nextPage} disabled={!pagination.hasMore || !pagination.nextCursor} className="rounded-lg border border-brand-line px-4 py-2 text-xs font-bold text-brand-bronze disabled:opacity-35">다음</button>
        </div>
      ) : null}
    </div>
  );
}

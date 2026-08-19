"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useB2BSession } from "../../../components/b2b-admin/B2BSessionContext";
import {
  CandidatePoolApiError,
  fetchCandidatePoolPage,
  type CandidatePoolItem,
  type CandidatePoolPagination,
} from "../../../lib/candidatePoolApi";

const PAGE_SIZE = 20;

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

export default function CandidatePoolPage() {
  const session = useB2BSession();
  const [candidates, setCandidates] = useState<CandidatePoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [pagination, setPagination] = useState<CandidatePoolPagination>({
    total: 0,
    limit: PAGE_SIZE,
    hasMore: false,
    nextCursor: null,
  });

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
    setQueryText("");
    setSearchQuery("");
  }, [session.organizationId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchCandidatePoolPage(session.organizationId, {
      cursor: searchQuery ? null : cursor,
      limit: PAGE_SIZE,
      query: searchQuery || null,
    })
      .then((result) => {
        if (cancelled) return;
        setCandidates(result.items);
        setPagination(result.pagination);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Candidate pool load failed:", error);
        toast.error(
          error instanceof CandidatePoolApiError
            ? error.message
            : "후보자 풀을 불러오지 못했습니다."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session.organizationId, cursor, searchQuery]);

  const pageNumber = cursorHistory.length + 1;
  const searching = Boolean(searchQuery);

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
      toast.error("후보자 검색어는 2자 이상 입력해주세요.");
      return;
    }

    setCursor(null);
    setCursorHistory([]);
    setSearchQuery(normalized);
  };

  const clearSearch = () => {
    setQueryText("");
    setSearchQuery("");
    setCursor(null);
    setCursorHistory([]);
  };

  const handleNextPage = () => {
    if (
      loading ||
      searching ||
      !pagination.hasMore ||
      !pagination.nextCursor
    ) return;

    setCursorHistory((current) => [...current, cursor]);
    setCursor(pagination.nextCursor);
  };

  const handlePreviousPage = () => {
    if (loading || searching || cursorHistory.length === 0) return;

    const previousCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((current) => current.slice(0, -1));
    setCursor(previousCursor);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">후보자 풀</h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {session.organizationId || session.role}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            직접 발굴한 후보자를 조직 전체 Talent Pool에서 검색하고 다시 활용합니다.
          </p>
        </div>

        <a
          href="/b2b-admin/candidates/new"
          className="inline-flex items-center justify-center rounded-lg bg-brand-navy px-4 py-2 text-sm font-bold text-brand-gold shadow-sm hover:opacity-90"
        >
          + 후보자 직접등록
        </a>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-600">
            {searching ? (
              <>
                조직 전체 검색 <span className="font-bold text-brand-navy">{pagination.total}명</span>
                <span className="ml-2 text-xs text-slate-400">“{searchQuery}”</span>
              </>
            ) : (
              <>
                전체 <span className="font-bold text-brand-navy">{pagination.total}명</span>
                {" · "}{pageNumber}페이지 <span className="font-bold text-brand-navy">{candidates.length}명</span>
              </>
            )}
          </div>

          <form onSubmit={handleSearch} className="flex w-full gap-2 lg:w-[520px]">
            <input
              type="search"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="이름, 이메일, 연락처, 헤드라인, 스킬 검색"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              검색
            </button>
            {searching ? (
              <button
                type="button"
                onClick={clearSearch}
                disabled={loading}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
              >
                초기화
              </button>
            ) : null}
          </form>
        </div>

        <p className="text-[11px] leading-5 text-slate-500">
          검색은 현재 페이지가 아니라 조직의 최신 후보자 최대 500명을 서버에서 조회해 최대 50건을 반환합니다. 대규모 Talent Pool 전환 시 전용 검색 인덱스로 교체할 수 있도록 검색 경계는 서버에 유지합니다.
        </p>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">후보자 풀을 불러오는 중입니다...</div>
        ) : candidates.length === 0 ? (
          <div className="space-y-2 py-16 text-center">
            <div className="text-sm font-semibold text-slate-500">표시할 후보자가 없습니다.</div>
            <p className="text-xs text-slate-400">
              {searching
                ? "조직 Talent Pool에서 검색 조건에 맞는 후보자를 찾지 못했습니다."
                : "후보자를 직접등록하면 이 Talent Pool에서 다시 찾을 수 있습니다."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {candidates.map((candidate) => (
                <article key={`mobile-${candidate.candidateId}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a href={`/b2b-admin/candidates/${encodeURIComponent(candidate.candidateId)}`} className="text-base font-bold text-slate-900">{candidate.name}</a>
                      <p className="mt-1 text-xs text-slate-500">{candidate.phone}</p>
                      <p className="mt-0.5 break-all text-xs text-slate-400">{candidate.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-brand-navy">{candidate.profileCompleteness}%</p>
                      <p className="text-[11px] text-slate-400">{candidate.accountStatus}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-700">{candidate.headline || "등록된 헤드라인 없음"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {candidate.skills.length > 0 ? candidate.skills.slice(0, 5).map((skill) => (
                        <span key={`mobile-${candidate.candidateId}-${skill}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">{skill}</span>
                      )) : <span className="text-xs text-slate-400">등록된 스킬 없음</span>}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="text-[11px] text-slate-500">
                      <p>등록 · {candidate.createdByName || candidate.createdBy}</p>
                      <p className="mt-1">갱신 · {formatDate(candidate.updatedAt || candidate.createdAt)}</p>
                    </div>
                    <a href={`/b2b-admin/candidates/${encodeURIComponent(candidate.candidateId)}`} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-brand-navy">상세 / 수정</a>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="py-3 pr-4 font-semibold">후보자</th>
                  <th className="py-3 pr-4 font-semibold">헤드라인 / 스킬</th>
                  <th className="py-3 pr-4 font-semibold">프로필</th>
                  <th className="py-3 pr-4 font-semibold">등록자</th>
                  <th className="py-3 pr-4 font-semibold">최근 갱신</th>
                  <th className="py-3 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.candidateId} className="border-b border-slate-100 align-top last:border-0">
                    <td className="min-w-52 py-4 pr-4">
                      <a
                        href={`/b2b-admin/candidates/${encodeURIComponent(candidate.candidateId)}`}
                        className="font-bold text-slate-900 hover:text-brand-navy hover:underline"
                      >
                        {candidate.name}
                      </a>
                      <div className="mt-1 text-xs text-slate-500">{candidate.phone}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{candidate.email}</div>
                    </td>
                    <td className="min-w-64 py-4 pr-4">
                      <div className="text-xs font-semibold text-slate-700">
                        {candidate.headline || "등록된 헤드라인 없음"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {candidate.skills.length > 0 ? (
                          candidate.skills.slice(0, 5).map((skill) => (
                            <span key={`${candidate.candidateId}-${skill}`} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">등록된 스킬 없음</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-4 pr-4">
                      <div className="font-bold text-brand-navy">{candidate.profileCompleteness}%</div>
                      <div className="mt-1 text-[11px] text-slate-400">{candidate.accountStatus}</div>
                    </td>
                    <td className="whitespace-nowrap py-4 pr-4 text-xs text-slate-500">
                      {candidate.createdByName || candidate.createdBy}
                    </td>
                    <td className="whitespace-nowrap py-4 pr-4 text-xs text-slate-500">
                      {formatDate(candidate.updatedAt || candidate.createdAt)}
                    </td>
                    <td className="whitespace-nowrap py-4">
                      <a
                        href={`/b2b-admin/candidates/${encodeURIComponent(candidate.candidateId)}`}
                        className="inline-flex rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-brand-navy hover:bg-slate-50"
                      >
                        상세 / 수정
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}

        {!loading && !searching && pagination.total > 0 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">페이지 {pageNumber} · 페이지당 최대 {pagination.limit}명</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={cursorHistory.length === 0}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-brand-navy disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!pagination.hasMore || !pagination.nextCursor}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-brand-navy disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          </div>
        ) : null}

        {!loading && searching && pagination.hasMore ? (
          <p className="border-t border-slate-100 pt-4 text-xs text-amber-700">
            검색 결과가 50건을 초과했습니다. 검색어를 더 구체적으로 입력해주세요.
          </p>
        ) : null}
      </section>
    </div>
  );
}

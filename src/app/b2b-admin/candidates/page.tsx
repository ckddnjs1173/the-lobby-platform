"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  useB2BSession,
} from "../../../components/b2b-admin/B2BSessionContext";

import {
  CandidatePoolApiError,
  fetchCandidatePoolPage,
  type CandidatePoolItem,
  type CandidatePoolPagination,
} from "../../../lib/candidatePoolApi";

const PAGE_SIZE = 20;

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

export default function CandidatePoolPage() {
  const session = useB2BSession();

  const [candidates, setCandidates] =
    useState<CandidatePoolItem[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [queryText, setQueryText] =
    useState("");
  const [cursor, setCursor] =
    useState<string | null>(null);
  const [cursorHistory, setCursorHistory] =
    useState<Array<string | null>>([]);
  const [pagination, setPagination] =
    useState<CandidatePoolPagination>({
      total: 0,
      limit: PAGE_SIZE,
      hasMore: false,
      nextCursor: null,
    });

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
    setQueryText("");
  }, [session.organizationId]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    fetchCandidatePoolPage(
      session.organizationId,
      {
        cursor,
        limit: PAGE_SIZE,
      }
    )
      .then((result) => {
        if (!cancelled) {
          setCandidates(result.items);
          setPagination(result.pagination);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Candidate pool load failed:",
          error
        );

        if (error instanceof CandidatePoolApiError) {
          toast.error(error.message);
        } else {
          toast.error(
            "후보자 풀을 불러오지 못했습니다."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session.organizationId, cursor]);

  const filteredCandidates = useMemo(
    () => {
      const normalized =
        queryText.trim().toLowerCase();

      if (!normalized) {
        return candidates;
      }

      return candidates.filter(
        (candidate) => {
          const searchTarget = [
            candidate.name,
            candidate.email,
            candidate.phone,
            candidate.headline,
            ...candidate.skills,
          ]
            .join(" ")
            .toLowerCase();

          return searchTarget.includes(normalized);
        }
      );
    },
    [candidates, queryText]
  );

  const pageNumber =
    cursorHistory.length + 1;

  const handleNextPage = () => {
    if (
      loading ||
      !pagination.hasMore ||
      !pagination.nextCursor
    ) {
      return;
    }

    setCursorHistory((current) => [
      ...current,
      cursor,
    ]);
    setCursor(pagination.nextCursor);
    setQueryText("");
  };

  const handlePreviousPage = () => {
    if (
      loading ||
      cursorHistory.length === 0
    ) {
      return;
    }

    const previousCursor =
      cursorHistory[
        cursorHistory.length - 1
      ];

    setCursorHistory((current) =>
      current.slice(0, -1)
    );
    setCursor(previousCursor);
    setQueryText("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              후보자 풀
            </h1>

            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
              {session.organizationId || session.role}
            </span>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            직접 발굴한 후보자를 검색하고 재활용할 수 있는 Talent Pool입니다.
          </p>
        </div>

        <a
          href="/b2b-admin/candidates/new"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-navy text-brand-gold text-sm font-bold shadow-sm hover:opacity-90"
        >
          + 후보자 직접등록
        </a>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            전체{" "}
            <span className="font-bold text-brand-navy">
              {pagination.total}명
            </span>
            {" · "}
            {pageNumber}페이지{" "}
            <span className="font-bold text-brand-navy">
              {candidates.length}명
            </span>
            {queryText.trim() ? (
              <>
                {" · "}페이지 검색{" "}
                <span className="font-bold text-brand-navy">
                  {filteredCandidates.length}명
                </span>
              </>
            ) : null}
          </div>

          <div className="w-full sm:w-96 space-y-1">
            <input
              type="search"
              value={queryText}
              onChange={(event) =>
                setQueryText(event.target.value)
              }
              placeholder="현재 페이지에서 이름, 이메일, 연락처, 헤드라인, 스킬 검색"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
            />
            <div className="text-[10px] text-slate-400 sm:text-right">
              빠른 필터는 현재 페이지의 최대 {PAGE_SIZE}명을 대상으로 합니다.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">
            후보자 풀을 불러오는 중입니다...
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="text-sm font-semibold text-slate-500">
              표시할 후보자가 없습니다.
            </div>
            <p className="text-xs text-slate-400">
              {queryText.trim()
                ? "현재 페이지에서 검색 조건에 맞는 후보자가 없습니다."
                : "후보자를 직접등록하면 이 Talent Pool에서 다시 찾을 수 있습니다."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {filteredCandidates.map(
                  (candidate) => (
                    <tr
                      key={candidate.candidateId}
                      className="border-b border-slate-100 last:border-0 align-top"
                    >
                      <td className="py-4 pr-4 min-w-52">
                        <a
                          href={`/b2b-admin/candidates/${encodeURIComponent(
                            candidate.candidateId
                          )}`}
                          className="font-bold text-slate-900 hover:text-brand-navy hover:underline"
                        >
                          {candidate.name}
                        </a>
                        <div className="text-xs text-slate-500 mt-1">
                          {candidate.phone}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {candidate.email}
                        </div>
                      </td>

                      <td className="py-4 pr-4 min-w-64">
                        <div className="text-xs font-semibold text-slate-700">
                          {candidate.headline || "등록된 헤드라인 없음"}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidate.skills.length > 0 ? (
                            candidate.skills.slice(0, 5).map(
                              (skill) => (
                                <span
                                  key={`${candidate.candidateId}-${skill}`}
                                  className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-600"
                                >
                                  {skill}
                                </span>
                              )
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              등록된 스킬 없음
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 pr-4 whitespace-nowrap">
                        <div className="font-bold text-brand-navy">
                          {candidate.profileCompleteness}%
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {candidate.accountStatus}
                        </div>
                      </td>

                      <td className="py-4 pr-4 text-xs text-slate-500 whitespace-nowrap">
                        {candidate.createdByName ||
                          candidate.createdBy}
                      </td>

                      <td className="py-4 pr-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(
                          candidate.updatedAt ||
                          candidate.createdAt
                        )}
                      </td>

                      <td className="py-4 whitespace-nowrap">
                        <a
                          href={`/b2b-admin/candidates/${encodeURIComponent(
                            candidate.candidateId
                          )}`}
                          className="inline-flex px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-brand-navy hover:bg-slate-50"
                        >
                          상세 / 수정
                        </a>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.total > 0 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-400">
              페이지 {pageNumber}
              {" · "}
              페이지당 최대 {pagination.limit}명
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={cursorHistory.length === 0}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-brand-navy disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                이전
              </button>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={
                  !pagination.hasMore ||
                  !pagination.nextCursor
                }
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-brand-navy disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CandidateHeader from "../../../components/candidate/CandidateHeader";
import { auth } from "../../../lib/firebase";
import {
  fetchCandidateTalentOpportunities,
  respondToTalentOpportunityViaApi,
  TalentOpportunityApiError,
} from "../../../lib/talentOpportunityApi";
import type { TalentOpportunityView } from "../../../lib/talentOpportunityTypes";

const STATUS_LABEL = {
  PROPOSED: "응답 대기",
  DECLINED: "제안 거절",
  CONVERTED: "지원 진행",
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

export default function CandidateOpportunitiesPage() {
  const router = useRouter();
  const [items, setItems] = useState<TalentOpportunityView[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        const opportunities = await fetchCandidateTalentOpportunities();
        setItems(opportunities);
      } catch (error) {
        console.error("Candidate opportunities load failed:", error);
        if (
          error instanceof TalentOpportunityApiError &&
          error.code === "CANDIDATE_NOT_FOUND"
        ) {
          router.replace("/register");
          return;
        }
        toast.error(
          error instanceof TalentOpportunityApiError
            ? error.message
            : "채용 제안을 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const respond = async (
    opportunityId: string,
    decision: "ACCEPT" | "DECLINE"
  ) => {
    if (workingId) return;
    setWorkingId(opportunityId);
    try {
      const updated = await respondToTalentOpportunityViaApi(
        opportunityId,
        decision
      );
      setItems((previous) =>
        previous.map((item) =>
          item.opportunityId === opportunityId ? updated : item
        )
      );
      if (decision === "ACCEPT") {
        toast.success("제안을 수락했습니다. 지원현황에 포지션이 추가되었습니다.");
      } else {
        toast.success("제안을 거절했습니다.");
      }
    } catch (error) {
      console.error("Talent opportunity response failed:", error);
      toast.error(
        error instanceof TalentOpportunityApiError
          ? error.message
          : "채용 제안 응답을 처리하지 못했습니다."
      );
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="candidate-surface min-h-screen bg-brand-light text-brand-ink">
      <CandidateHeader />
      <main className="mx-auto max-w-[1120px] px-5 pb-20 pt-28 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-bronze">Career Opportunities</p>
            <h1 className="font-editorial mt-2 text-[38px] text-brand-espresso">받은 채용 제안</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">
              J&C가 인재풀 프로필을 보고 검토를 요청한 포지션입니다. 수락하기 전에는 실제 지원 내역이 생성되지 않습니다.
            </p>
          </div>
          <Link href="/talent-pool/settings" className="rounded-lg border border-brand-line bg-white px-4 py-3 text-xs font-bold text-brand-bronze">인재풀 설정</Link>
        </div>

        {loading ? (
          <div className="mt-7 rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">채용 제안을 불러오는 중입니다...</div>
        ) : items.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-brand-line bg-white px-6 py-20 text-center shadow-card">
            <p className="text-sm font-bold text-brand-espresso">현재 받은 채용 제안이 없습니다.</p>
            <p className="mt-2 text-xs leading-5 text-brand-muted">인재풀 공개를 켜두면 J&C가 조건이 맞는 포지션을 검토할 수 있습니다.</p>
          </div>
        ) : (
          <div className="mt-7 space-y-4">
            {items.map((item) => (
              <article key={item.opportunityId} className="rounded-xl border border-brand-line bg-white p-5 shadow-card sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-brand-gold/30 bg-brand-ivory px-2.5 py-1 text-[10px] font-bold text-brand-bronze">{STATUS_LABEL[item.status]}</span>
                      <span className="text-[10px] text-brand-muted">제안 {formatDate(item.createdAt)}</span>
                    </div>
                    <p className="mt-4 text-xs font-bold text-brand-bronze">{item.displayCompany}</p>
                    <h2 className="font-editorial mt-1 text-[28px] leading-tight text-brand-espresso">{item.jobTitle}</h2>
                  </div>
                  {item.status === "CONVERTED" ? (
                    <Link href="/candidate" className="shrink-0 rounded-lg bg-brand-bronze px-4 py-2.5 text-xs font-bold text-white">지원현황 보기</Link>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 rounded-xl border border-brand-line bg-brand-light p-4 text-xs sm:grid-cols-3">
                  <div><p className="font-bold text-brand-muted">근무지</p><p className="mt-1 font-semibold text-brand-espresso">{item.location || "협의"}</p></div>
                  <div><p className="font-bold text-brand-muted">고용형태</p><p className="mt-1 font-semibold text-brand-espresso">{item.employmentType || "협의"}</p></div>
                  <div><p className="font-bold text-brand-muted">급여</p><p className="mt-1 font-semibold text-brand-espresso">{item.salary || "협의"}</p></div>
                </div>

                {item.note ? (
                  <div className="mt-4 rounded-lg border border-brand-line bg-white px-4 py-3 text-xs leading-6 text-brand-muted">
                    <strong className="text-brand-espresso">J&C 메모</strong><br />{item.note}
                  </div>
                ) : null}

                {item.status === "PROPOSED" ? (
                  <div className="mt-5 flex flex-col gap-2 border-t border-brand-line pt-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => void respond(item.opportunityId, "DECLINE")} disabled={workingId !== null} className="rounded-lg border border-brand-line px-4 py-3 text-xs font-bold text-brand-muted disabled:opacity-45">이번 제안은 거절</button>
                    <button type="button" onClick={() => void respond(item.opportunityId, "ACCEPT")} disabled={workingId !== null} className="rounded-lg bg-brand-bronze px-5 py-3 text-xs font-bold text-white shadow-card disabled:opacity-45">{workingId === item.opportunityId ? "처리 중..." : "제안 수락하고 지원 진행"}</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

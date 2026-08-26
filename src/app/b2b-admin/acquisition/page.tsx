"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useB2BSession } from "../../../components/b2b-admin/B2BSessionContext";
import {
  AcquisitionAnalyticsApiError,
  fetchAcquisitionAnalytics,
  type AcquisitionAnalyticsView,
} from "../../../lib/acquisitionAnalyticsApi";

const EVENT_LABELS: Record<string, string> = {
  page_view: "페이지뷰",
  profile_created: "프로필 생성",
  talent_pool_settings_saved: "인재풀 설정 저장",
  talent_pool_opted_in: "인재풀 공개 ON",
  talent_pool_opted_out: "인재풀 공개 OFF",
  saved_job_added: "관심공고 저장",
  saved_job_removed: "관심공고 삭제",
  opportunity_created: "포지션 제안 생성",
  opportunity_accepted: "포지션 제안 수락",
  opportunity_declined: "포지션 제안 거절",
  application_submitted: "실제 지원 생성",
};

function Metric({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-muted">{label}</p>
      <p className="font-editorial mt-2 text-[34px] text-brand-espresso">
        {value.toLocaleString("ko-KR")}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-brand-muted">{caption}</p>
    </div>
  );
}

export default function AcquisitionAnalyticsPage() {
  const session = useB2BSession();
  const [data, setData] = useState<AcquisitionAnalyticsView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchAcquisitionAnalytics()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Acquisition analytics load failed:", error);
        toast.error(
          error instanceof AcquisitionAnalyticsApiError
            ? error.message
            : "공개 유입 분석을 불러오지 못했습니다."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session.role]);

  if (session.role !== "ADMIN") {
    return (
      <section className="rounded-xl border border-brand-line bg-white px-6 py-16 text-center shadow-card">
        <p className="font-editorial text-3xl text-brand-espresso">공개 유입 분석</p>
        <p className="mt-3 text-sm text-brand-muted">사이트 전체 유입 지표는 ADMIN 계정에서만 조회할 수 있습니다.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">
        공개 유입 지표를 불러오는 중입니다...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">
        표시할 유입 지표가 없습니다.
      </div>
    );
  }

  const funnel = data.funnel;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Acquisition & Conversion</p>
          <h1 className="mt-2 text-2xl font-bold text-brand-espresso">후보자 유입·전환 분석</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">
            개인 식별정보 없이 이벤트명·경로·시각만 집계합니다. 아래 수치는 최근 저장된 최대 2,000개 이벤트의 방향성 지표입니다.
          </p>
        </div>
        <div className="rounded-lg border border-brand-line bg-white px-4 py-3 text-xs text-brand-muted shadow-card">
          분석 표본 <strong className="ml-1 text-brand-espresso">{data.sampleSize.toLocaleString("ko-KR")}</strong>
        </div>
      </div>

      <section>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-brand-espresso">유입 퍼널</h2>
            <p className="mt-1 text-[11px] text-brand-muted">페이지뷰와 프로필 생성 흐름입니다.</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Home" value={funnel.homeViews} caption="홈 페이지뷰" />
          <Metric label="Talent Pool" value={funnel.talentPoolViews} caption="인재풀 안내 페이지뷰" />
          <Metric label="Register" value={funnel.registerViews} caption="프로필 등록 페이지뷰" />
          <Metric label="Profile Created" value={funnel.profileCreated} caption="신규 Candidate 프로필 생성" />
        </div>
      </section>

      <section className="rounded-xl border border-brand-line bg-brand-ivory/45 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-bold text-brand-espresso">인재풀 → 제안 → 지원 전환</h2>
          <p className="mt-1 text-[11px] leading-5 text-brand-muted">
            후보자 공개 동의 변화와 ADMIN 제안, 후보자 응답, 실제 ATS 지원 생성 건을 각각 분리해 집계합니다.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Metric label="Pool ON" value={funnel.talentPoolOptedIn} caption="공개 OFF → ON" />
          <Metric label="Pool OFF" value={funnel.talentPoolOptedOut} caption="공개 ON → OFF" />
          <Metric label="Proposed" value={funnel.opportunitiesCreated} caption="ADMIN 포지션 제안 생성" />
          <Metric label="Accepted" value={funnel.opportunitiesAccepted} caption="후보자 제안 수락" />
          <Metric label="Declined" value={funnel.opportunitiesDeclined} caption="후보자 제안 거절" />
          <Metric label="Applications" value={funnel.applicationsSubmitted} caption="직접 지원 + 제안 수락 지원" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-brand-espresso">관심·설정 행동</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Pool Settings" value={funnel.talentPoolSettingsSaved} caption="희망조건·공개설정 저장" />
          <Metric label="Saved Jobs" value={funnel.savedJobsAdded} caption="관심공고 저장" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-brand-espresso">이벤트별 발생량</h2>
          <div className="mt-4 divide-y divide-brand-line">
            {data.eventCounts.length ? (
              data.eventCounts.map((item) => (
                <div key={item.eventName} className="flex items-center justify-between gap-4 py-3 text-xs">
                  <span className="font-semibold text-brand-muted">{EVENT_LABELS[item.eventName] || item.eventName}</span>
                  <strong className="text-brand-espresso">{item.count.toLocaleString("ko-KR")}</strong>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-brand-muted">아직 이벤트가 없습니다.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-brand-espresso">상위 방문 경로</h2>
          <p className="mt-1 text-[11px] text-brand-muted">`page_view` 이벤트만 집계합니다.</p>
          <div className="mt-4 divide-y divide-brand-line">
            {data.topPaths.length ? (
              data.topPaths.map((item) => (
                <div key={item.path} className="flex items-center justify-between gap-4 py-3 text-xs">
                  <span className="min-w-0 truncate font-semibold text-brand-muted">{item.path}</span>
                  <strong className="shrink-0 text-brand-espresso">{item.count.toLocaleString("ko-KR")}</strong>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-brand-muted">아직 방문 경로 데이터가 없습니다.</p>
            )}
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-brand-line bg-brand-ivory/70 p-5 text-[11px] leading-6 text-brand-muted">
        이 분석은 세션이나 개인을 연결하지 않으므로 정확한 사용자별 전환율이 아니라 운영 방향을 보는 집계입니다. 전환 이벤트는 실제 서버 mutation 성공 이후에만 기록하며, 광고 최적화나 개인 프로파일링 용도로 사용하지 않습니다.
      </div>
    </div>
  );
}

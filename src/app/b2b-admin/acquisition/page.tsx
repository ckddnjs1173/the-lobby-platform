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
  saved_job_added: "관심공고 저장",
  saved_job_removed: "관심공고 삭제",
  application_submitted: "공고 지원",
};

function Metric({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-muted">{label}</p>
      <p className="font-editorial mt-2 text-[34px] text-brand-espresso">{value.toLocaleString("ko-KR")}</p>
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
    return <div className="rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">공개 유입 지표를 불러오는 중입니다...</div>;
  }

  if (!data) {
    return <div className="rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">표시할 유입 지표가 없습니다.</div>;
  }

  const funnel = data.funnel;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Acquisition</p>
          <h1 className="mt-2 text-2xl font-bold text-brand-espresso">공개 유입 분석</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">개인 식별정보 없이 이벤트명·경로·시각만 집계합니다. 아래 수치는 최근 저장된 최대 2,000개 이벤트의 방향성 지표입니다.</p>
        </div>
        <div className="rounded-lg border border-brand-line bg-white px-4 py-3 text-xs text-brand-muted shadow-card">분석 표본 <strong className="ml-1 text-brand-espresso">{data.sampleSize.toLocaleString("ko-KR")}</strong></div>
      </div>

      <section>
        <h2 className="text-sm font-bold text-brand-espresso">후보자 유입 퍼널</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Home" value={funnel.homeViews} caption="홈 페이지뷰" />
          <Metric label="Talent Pool" value={funnel.talentPoolViews} caption="인재풀 안내 페이지뷰" />
          <Metric label="Register" value={funnel.registerViews} caption="프로필 등록 페이지뷰" />
          <Metric label="Profile Created" value={funnel.profileCreated} caption="신규 Candidate 프로필 생성" />
          <Metric label="Pool Settings" value={funnel.talentPoolSettingsSaved} caption="희망조건·공개설정 저장" />
          <Metric label="Saved Jobs" value={funnel.savedJobsAdded} caption="관심공고 저장" />
          <Metric label="Applications" value={funnel.applicationsSubmitted} caption="후보자 직접 지원" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-brand-espresso">이벤트별 발생량</h2>
          <div className="mt-4 divide-y divide-brand-line">
            {data.eventCounts.length ? data.eventCounts.map((item) => (
              <div key={item.eventName} className="flex items-center justify-between gap-4 py-3 text-xs">
                <span className="font-semibold text-brand-muted">{EVENT_LABELS[item.eventName] || item.eventName}</span>
                <strong className="text-brand-espresso">{item.count.toLocaleString("ko-KR")}</strong>
              </div>
            )) : <p className="py-8 text-center text-xs text-brand-muted">아직 이벤트가 없습니다.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-brand-espresso">상위 방문 경로</h2>
          <div className="mt-4 divide-y divide-brand-line">
            {data.topPaths.length ? data.topPaths.map((item) => (
              <div key={item.path} className="flex items-center justify-between gap-4 py-3 text-xs">
                <span className="min-w-0 truncate font-semibold text-brand-muted">{item.path}</span>
                <strong className="shrink-0 text-brand-espresso">{item.count.toLocaleString("ko-KR")}</strong>
              </div>
            )) : <p className="py-8 text-center text-xs text-brand-muted">아직 방문 경로 데이터가 없습니다.</p>}
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-brand-line bg-brand-ivory/70 p-5 text-[11px] leading-6 text-brand-muted">
        이 분석은 세션이나 개인을 연결하지 않으므로 정확한 사용자별 전환율이 아니라 운영 방향을 보는 집계입니다. 광고 최적화나 개인 프로파일링 도구로 사용하지 않습니다.
      </div>
    </div>
  );
}

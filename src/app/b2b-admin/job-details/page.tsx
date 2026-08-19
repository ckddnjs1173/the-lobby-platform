"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  fetchB2BJobs,
  type B2BJobView,
} from "../../../lib/jobApi";
import {
  fetchJobOperationalDetails,
  JobOperationalDetailsApiError,
  type JobOperationalDetailsInput,
  updateJobOperationalDetailsViaApi,
} from "../../../lib/jobOperationalDetailsApi";

const EMPTY: JobOperationalDetailsInput = {
  workSchedule: "",
  workHours: "",
  breakTime: "",
  contractPeriod: "",
  conversionOpportunity: "",
  experienceLevel: "",
  educationLevel: "",
  headcount: "",
  benefits: [],
  nearbyTransit: "",
  detailedLocation: "",
  applicationDeadline: "",
};

function Field({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
}) {
  return (
    <label className="space-y-2 text-xs font-bold text-brand-muted">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-brand-line bg-white px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-bronze"
      />
    </label>
  );
}

export default function JobOperationalDetailsPage() {
  const [jobs, setJobs] = useState<B2BJobView[]>([]);
  const [jobId, setJobId] = useState("");
  const [form, setForm] = useState<JobOperationalDetailsInput>(EMPTY);
  const [benefitsText, setBenefitsText] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchB2BJobs()
      .then((items) => {
        if (cancelled) return;
        setJobs(items);
        const firstOpen = items.find((item) => item.status === "OPEN") || items[0];
        setJobId(firstOpen?.jobId || "");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Job details job list failed:", error);
        toast.error("공고 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoadingJobs(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!jobId) {
      setForm(EMPTY);
      setBenefitsText("");
      return;
    }

    let cancelled = false;
    setLoadingDetails(true);
    fetchJobOperationalDetails(jobId)
      .then((details) => {
        if (cancelled) return;
        setForm({
          workSchedule: details.workSchedule,
          workHours: details.workHours,
          breakTime: details.breakTime,
          contractPeriod: details.contractPeriod,
          conversionOpportunity: details.conversionOpportunity,
          experienceLevel: details.experienceLevel,
          educationLevel: details.educationLevel,
          headcount: details.headcount,
          benefits: details.benefits,
          nearbyTransit: details.nearbyTransit,
          detailedLocation: details.detailedLocation,
          applicationDeadline: details.applicationDeadline,
        });
        setBenefitsText(details.benefits.join("\n"));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Job details load failed:", error);
        toast.error(error instanceof JobOperationalDetailsApiError ? error.message : "공고 상세조건을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.jobId === jobId) || null,
    [jobId, jobs]
  );

  const update = <K extends keyof JobOperationalDetailsInput>(
    key: K,
    value: JobOperationalDetailsInput[K]
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleSave = async () => {
    if (!jobId || saving) return;
    const benefits = Array.from(new Set(
      benefitsText
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    ));

    setSaving(true);
    try {
      const saved = await updateJobOperationalDetailsViaApi(jobId, {
        ...form,
        benefits,
      });
      setForm({
        workSchedule: saved.workSchedule,
        workHours: saved.workHours,
        breakTime: saved.breakTime,
        contractPeriod: saved.contractPeriod,
        conversionOpportunity: saved.conversionOpportunity,
        experienceLevel: saved.experienceLevel,
        educationLevel: saved.educationLevel,
        headcount: saved.headcount,
        benefits: saved.benefits,
        nearbyTransit: saved.nearbyTransit,
        detailedLocation: saved.detailedLocation,
        applicationDeadline: saved.applicationDeadline,
      });
      setBenefitsText(saved.benefits.join("\n"));
      toast.success("공개 공고 상세조건을 저장했습니다.");
    } catch (error) {
      console.error("Job details save failed:", error);
      toast.error(error instanceof JobOperationalDetailsApiError ? error.message : "공고 상세조건 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Public Job Quality</p>
        <h1 className="mt-2 text-2xl font-bold text-brand-espresso">공고 상세조건</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">
          기본 포지션 데이터에 근무요일·시간·계약·복리후생·교통·마감일을 보완합니다. 입력한 값은 공개 공고 상세와 검색 구조화 데이터에 반영됩니다.
        </p>
      </div>

      <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card">
        <label className="text-xs font-bold text-brand-muted">수정할 포지션</label>
        <select
          value={jobId}
          onChange={(event) => setJobId(event.target.value)}
          disabled={loadingJobs}
          className="mt-2 w-full rounded-lg border border-brand-line bg-white px-4 py-3 text-sm font-bold text-brand-espresso outline-none focus:border-brand-bronze"
        >
          <option value="">포지션을 선택하세요</option>
          {jobs.map((job) => (
            <option key={job.jobId} value={job.jobId}>
              [{job.status}] {job.displayCompany || job.company} · {job.title}
            </option>
          ))}
        </select>
        {selectedJob ? (
          <div className="mt-4 grid gap-2 rounded-lg border border-brand-line bg-brand-light p-4 text-xs text-brand-muted sm:grid-cols-3">
            <span><strong className="text-brand-espresso">근무지</strong> · {selectedJob.location || "미입력"}</span>
            <span><strong className="text-brand-espresso">고용</strong> · {selectedJob.employmentType || "미입력"}</span>
            <span><strong className="text-brand-espresso">급여</strong> · {selectedJob.salary || "미입력"}</span>
          </div>
        ) : null}
      </section>

      {jobId ? (
        <section className="rounded-xl border border-brand-line bg-white p-5 shadow-card sm:p-7">
          {loadingDetails ? (
            <div className="py-16 text-center text-sm text-brand-muted">상세조건을 불러오는 중입니다...</div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <Field label="근무요일" value={form.workSchedule} placeholder="예: 주 5일 (월~금)" onChange={(value) => update("workSchedule", value)} />
                <Field label="근무시간" value={form.workHours} placeholder="예: 09:00~18:00" onChange={(value) => update("workHours", value)} />
                <Field label="휴게시간" value={form.breakTime} placeholder="예: 12:00~13:00" onChange={(value) => update("breakTime", value)} />
                <Field label="계약기간" value={form.contractPeriod} placeholder="예: 12개월" onChange={(value) => update("contractPeriod", value)} />
                <Field label="정규직 전환" value={form.conversionOpportunity} placeholder="예: 평가 후 전환 가능" onChange={(value) => update("conversionOpportunity", value)} />
                <Field label="경력조건" value={form.experienceLevel} placeholder="예: 신입·경력 2년 이상" onChange={(value) => update("experienceLevel", value)} />
                <Field label="학력조건" value={form.educationLevel} placeholder="예: 초대졸 이상" onChange={(value) => update("educationLevel", value)} />
                <Field label="모집인원" value={form.headcount} placeholder="예: 2명" onChange={(value) => update("headcount", value)} />
                <Field label="채용 마감일" type="date" value={form.applicationDeadline} placeholder="YYYY-MM-DD" onChange={(value) => update("applicationDeadline", value)} />
                <Field label="인근 교통" value={form.nearbyTransit} placeholder="예: 2호선 삼성역 도보 5분" onChange={(value) => update("nearbyTransit", value)} />
                <label className="space-y-2 text-xs font-bold text-brand-muted md:col-span-2">
                  상세 근무지
                  <input value={form.detailedLocation} onChange={(event) => update("detailedLocation", event.target.value)} placeholder="예: 서울 강남구 테헤란로 000" className="w-full rounded-lg border border-brand-line bg-white px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-bronze" />
                </label>
              </div>

              <label className="mt-5 block space-y-2 text-xs font-bold text-brand-muted">
                복리후생
                <textarea
                  value={benefitsText}
                  onChange={(event) => setBenefitsText(event.target.value)}
                  placeholder={"식대 지원\n유니폼 제공\n명절 선물\n건강검진"}
                  className="min-h-32 w-full resize-y rounded-lg border border-brand-line bg-white px-4 py-3 text-sm font-normal leading-6 text-brand-ink outline-none focus:border-brand-bronze"
                />
                <span className="block text-[10px] font-normal text-brand-muted">줄바꿈 또는 쉼표로 구분합니다.</span>
              </label>

              <div className="mt-7 flex flex-col gap-3 border-t border-brand-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-5 text-brand-muted">실제 채용조건과 일치하는 정보만 입력하세요. 빈 항목은 공개 화면에서 숨깁니다.</p>
                <button type="button" onClick={() => void handleSave()} disabled={saving} className="rounded-lg bg-brand-bronze px-5 py-3 text-xs font-bold text-white shadow-card disabled:opacity-45">{saving ? "저장 중..." : "상세조건 저장"}</button>
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-brand-line bg-white py-16 text-center text-sm text-brand-muted">수정할 포지션을 선택해주세요.</div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { fetchB2BJobs, type B2BJobView } from "../../../lib/jobApi";
import {
  fetchJobOperationalDetails,
  JobOperationalDetailsApiError,
  type JobOperationalDetailsInput,
  updateJobOperationalDetailsViaApi,
} from "../../../lib/jobOperationalDetailsApi";

const EMPTY: JobOperationalDetailsInput = {
  workplaceName: "",
  employingCompany: "",
  salaryBase: "",
  salaryIncentive: "",
  salaryAllowances: "",
  severancePay: "",
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
  interviewSchedule: "",
  expectedStartDate: "",
  hiringScheduleNote: "",
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

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="md:col-span-2 xl:col-span-3">
      <h2 className="text-sm font-bold text-brand-espresso">{title}</h2>
      <p className="mt-1 text-[11px] leading-5 text-brand-muted">{description}</p>
    </div>
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
        const next: JobOperationalDetailsInput = {
          workplaceName: details.workplaceName,
          employingCompany: details.employingCompany,
          salaryBase: details.salaryBase,
          salaryIncentive: details.salaryIncentive,
          salaryAllowances: details.salaryAllowances,
          severancePay: details.severancePay,
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
          interviewSchedule: details.interviewSchedule,
          expectedStartDate: details.expectedStartDate,
          hiringScheduleNote: details.hiringScheduleNote,
        };
        setForm(next);
        setBenefitsText(details.benefits.join("\n"));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Job details load failed:", error);
        toast.error(
          error instanceof JobOperationalDetailsApiError
            ? error.message
            : "공고 상세조건을 불러오지 못했습니다."
        );
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
    const benefits = Array.from(
      new Set(
        benefitsText
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );

    setSaving(true);
    try {
      const saved = await updateJobOperationalDetailsViaApi(jobId, {
        ...form,
        benefits,
      });
      const next: JobOperationalDetailsInput = {
        workplaceName: saved.workplaceName,
        employingCompany: saved.employingCompany,
        salaryBase: saved.salaryBase,
        salaryIncentive: saved.salaryIncentive,
        salaryAllowances: saved.salaryAllowances,
        severancePay: saved.severancePay,
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
        interviewSchedule: saved.interviewSchedule,
        expectedStartDate: saved.expectedStartDate,
        hiringScheduleNote: saved.hiringScheduleNote,
      };
      setForm(next);
      setBenefitsText(saved.benefits.join("\n"));
      toast.success("공개 공고 상세조건을 저장했습니다.");
    } catch (error) {
      console.error("Job details save failed:", error);
      toast.error(
        error instanceof JobOperationalDetailsApiError
          ? error.message
          : "공고 상세조건 저장에 실패했습니다."
      );
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
          후보자가 지원 전에 꼭 확인해야 하는 근무처·소속·급여·근무조건·채용일정을 구조화합니다. 실제 조건과 일치하는 정보만 입력합니다.
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
            <span><strong className="text-brand-espresso">기존 급여</strong> · {selectedJob.salary || "미입력"}</span>
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
                <SectionTitle title="근무처와 고용관계" description="브랜드·사업장과 실제 고용 소속을 분리해 후보자가 오해하지 않도록 표시합니다." />
                <Field label="근무처명" value={form.workplaceName} placeholder="예: 한성자동차㈜ 대전유성서비스센터" onChange={(value) => update("workplaceName", value)} />
                <Field label="실제 소속회사" value={form.employingCompany} placeholder="예: 제이앤씨㈜" onChange={(value) => update("employingCompany", value)} />
                <Field label="계약기간" value={form.contractPeriod} placeholder="예: 1년" onChange={(value) => update("contractPeriod", value)} />

                <SectionTitle title="급여조건" description="기본급과 성과급·수당·퇴직금을 한 문장에 합치지 않고 분리해서 보여줍니다." />
                <Field label="기본급여" value={form.salaryBase} placeholder="예: 월 2,337,510원" onChange={(value) => update("salaryBase", value)} />
                <Field label="성과급" value={form.salaryIncentive} placeholder="예: 월 성과 달성 시 66,700원 추가" onChange={(value) => update("salaryIncentive", value)} />
                <Field label="퇴직금" value={form.severancePay} placeholder="예: 퇴직금 별도 지급" onChange={(value) => update("severancePay", value)} />
                <label className="space-y-2 text-xs font-bold text-brand-muted md:col-span-2 xl:col-span-3">
                  기타수당
                  <textarea value={form.salaryAllowances} onChange={(event) => update("salaryAllowances", event.target.value)} placeholder="예: 연장근무 수당 별도 지급 / 미사용 연차수당 별도 지급" className="min-h-24 w-full resize-y rounded-lg border border-brand-line bg-white px-4 py-3 text-sm font-normal leading-6 text-brand-ink outline-none focus:border-brand-bronze" />
                </label>

                <SectionTitle title="근무조건" description="실제 출근 패턴과 시간을 후보자가 한눈에 판단할 수 있도록 입력합니다." />
                <Field label="근무요일" value={form.workSchedule} placeholder="예: 주 5일 (월~금) / 격주 토요일" onChange={(value) => update("workSchedule", value)} />
                <Field label="근무시간" value={form.workHours} placeholder="예: 월~금 08:30~17:30" onChange={(value) => update("workHours", value)} />
                <Field label="휴게시간" value={form.breakTime} placeholder="예: 60분" onChange={(value) => update("breakTime", value)} />
                <Field label="정규직 전환" value={form.conversionOpportunity} placeholder="예: 평가 후 전환 가능" onChange={(value) => update("conversionOpportunity", value)} />
                <Field label="경력조건" value={form.experienceLevel} placeholder="예: 신입·경력 무관" onChange={(value) => update("experienceLevel", value)} />
                <Field label="학력조건" value={form.educationLevel} placeholder="예: 학력 무관" onChange={(value) => update("educationLevel", value)} />
                <Field label="모집인원" value={form.headcount} placeholder="예: 1명" onChange={(value) => update("headcount", value)} />
                <Field label="인근 교통" value={form.nearbyTransit} placeholder="예: 지하철역 도보 5분" onChange={(value) => update("nearbyTransit", value)} />
                <label className="space-y-2 text-xs font-bold text-brand-muted md:col-span-2">
                  상세 근무지
                  <input value={form.detailedLocation} onChange={(event) => update("detailedLocation", event.target.value)} placeholder="예: 대전 유성구 북유성대로 352" className="w-full rounded-lg border border-brand-line bg-white px-4 py-3 text-sm font-normal text-brand-ink outline-none focus:border-brand-bronze" />
                </label>

                <SectionTitle title="채용일정" description="마감일이 지난 OPEN 공고는 공개 목록과 상세에서 자동 제외됩니다." />
                <Field label="채용 마감일" type="date" value={form.applicationDeadline} placeholder="YYYY-MM-DD" onChange={(value) => update("applicationDeadline", value)} />
                <Field label="입사 예정일" type="date" value={form.expectedStartDate} placeholder="YYYY-MM-DD" onChange={(value) => update("expectedStartDate", value)} />
                <Field label="면접일정" value={form.interviewSchedule} placeholder="예: 8월 18일~20일 예정" onChange={(value) => update("interviewSchedule", value)} />
                <label className="space-y-2 text-xs font-bold text-brand-muted md:col-span-2 xl:col-span-3">
                  채용일정 비고
                  <textarea value={form.hiringScheduleNote} onChange={(event) => update("hiringScheduleNote", event.target.value)} placeholder="예: 상기 일정은 채용 상황에 따라 변경될 수 있습니다." className="min-h-24 w-full resize-y rounded-lg border border-brand-line bg-white px-4 py-3 text-sm font-normal leading-6 text-brand-ink outline-none focus:border-brand-bronze" />
                </label>
              </div>

              <label className="mt-5 block space-y-2 text-xs font-bold text-brand-muted">
                복리후생
                <textarea
                  value={benefitsText}
                  onChange={(event) => setBenefitsText(event.target.value)}
                  placeholder={"4대보험 가입\n유니폼 지급\n경조휴가 및 경조사비 지원\n명절선물 지급"}
                  className="min-h-32 w-full resize-y rounded-lg border border-brand-line bg-white px-4 py-3 text-sm font-normal leading-6 text-brand-ink outline-none focus:border-brand-bronze"
                />
                <span className="block text-[10px] font-normal text-brand-muted">줄바꿈 또는 쉼표로 구분합니다.</span>
              </label>

              <div className="mt-7 flex flex-col gap-3 border-t border-brand-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-5 text-brand-muted">빈 항목은 공개 화면에서 숨깁니다. 실제 근로조건과 일치하지 않는 정보는 입력하지 않습니다.</p>
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

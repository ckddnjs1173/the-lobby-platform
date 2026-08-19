"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AiJdForm from "../../../components/b2b-admin/AiJdForm";
import { useB2BSession } from "../../../components/b2b-admin/B2BSessionContext";
import {
  JobApiError,
  createB2BJobViaApi,
  fetchB2BJobs,
  updateB2BJobViaApi,
  type B2BJobView,
  type CreateB2BJobInput,
} from "../../../lib/jobApi";
import type { JobDescriptionParseResult } from "../../../lib/jobDescriptionApi";
import {
  OrganizationApiError,
  fetchB2BOrganizations,
  type B2BOrganizationView,
} from "../../../lib/organizationApi";
import type { JobStatus } from "../../../types";

const STATUS_LABELS: Record<JobStatus, string> = {
  OPEN: "공개중",
  DRAFT: "작성중",
  CLOSED: "마감",
};

interface JobFormState {
  organizationId: string;
  company: string;
  displayCompany: string;
  title: string;
  description: string;
  requirements: string;
  preferredQualifications: string;
  salary: string;
  location: string;
  employmentType: string;
  status: JobStatus;
}

const EMPTY_FORM: JobFormState = {
  organizationId: "",
  company: "",
  displayCompany: "",
  title: "",
  description: "",
  requirements: "",
  preferredQualifications: "",
  salary: "협의",
  location: "",
  employmentType: "정규직",
  status: "DRAFT",
};

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function jobToForm(job: B2BJobView): JobFormState {
  return {
    organizationId: job.organizationId,
    company: job.company,
    displayCompany: job.displayCompany,
    title: job.title,
    description: job.description,
    requirements: job.requirements.join("\n"),
    preferredQualifications: job.preferredQualifications.join("\n"),
    salary: job.salary,
    location: job.location,
    employmentType: job.employmentType,
    status: job.status,
  };
}

function JobFields({
  form,
  setForm,
  organizations,
  showOrganization,
  allowClosed,
}: {
  form: JobFormState;
  setForm: React.Dispatch<React.SetStateAction<JobFormState>>;
  organizations: B2BOrganizationView[];
  showOrganization: boolean;
  allowClosed: boolean;
}) {
  const update = (key: keyof JobFormState, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: key === "status" ? (value as JobStatus) : value,
    }));
  };

  return (
    <div className="space-y-4">
      {showOrganization ? (
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-600">고객사 / 조직 *</span>
          <select
            value={form.organizationId}
            onChange={(event) => update("organizationId", event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">조직을 선택하세요</option>
            {organizations.map((organization) => (
              <option key={organization.organizationId} value={organization.organizationId}>
                {organization.name} · {organization.organizationId}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">실제 기업명 *</span>
          <input
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">화면 노출 기업명 *</span>
          <input
            value={form.displayCompany}
            onChange={(event) => update("displayCompany", event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">공고명 *</span>
        <input
          value={form.title}
          onChange={(event) => update("title", event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">공고 설명 *</span>
        <textarea
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          className="h-36 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">필수 요건 · 한 줄에 하나</span>
          <textarea
            value={form.requirements}
            onChange={(event) => update("requirements", event.target.value)}
            className="h-32 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">우대 사항 · 한 줄에 하나</span>
          <textarea
            value={form.preferredQualifications}
            onChange={(event) => update("preferredQualifications", event.target.value)}
            className="h-32 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">급여 *</span>
          <input
            value={form.salary}
            onChange={(event) => update("salary", event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">근무지 *</span>
          <input
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">고용 형태 *</span>
          <input
            value={form.employmentType}
            onChange={(event) => update("employmentType", event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">상태</span>
        <select
          value={form.status}
          onChange={(event) => update("status", event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="DRAFT">작성중</option>
          <option value="OPEN">공개중</option>
          {allowClosed ? <option value="CLOSED">마감</option> : null}
        </select>
      </label>
    </div>
  );
}

export default function B2BJobsPage() {
  const session = useB2BSession();
  const [jobs, setJobs] = useState<B2BJobView[]>([]);
  const [organizations, setOrganizations] = useState<B2BOrganizationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState(false);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<JobFormState>(EMPTY_FORM);

  const counts = useMemo(
    () =>
      jobs.reduce(
        (result, job) => {
          result[job.status] += 1;
          return result;
        },
        { OPEN: 0, DRAFT: 0, CLOSED: 0 } as Record<JobStatus, number>
      ),
    [jobs]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchB2BJobs(), fetchB2BOrganizations()])
      .then(([jobData, organizationData]) => {
        if (cancelled) return;
        setJobs(jobData);
        setOrganizations(organizationData.filter((item) => item.status !== "INACTIVE"));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("B2B job workspace load failed:", error);
        if (error instanceof JobApiError || error instanceof OrganizationApiError) {
          toast.error(error.message);
        } else {
          toast.error("공고 관리 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const validateForm = (target: JobFormState, requiresOrganization: boolean): boolean => {
    if (
      !target.company.trim() ||
      !target.displayCompany.trim() ||
      !target.title.trim() ||
      !target.description.trim() ||
      !target.salary.trim() ||
      !target.location.trim() ||
      !target.employmentType.trim()
    ) {
      toast.error("기업명, 노출 기업명, 공고명, 설명, 급여, 근무지, 고용 형태는 필수입니다.");
      return false;
    }
    if (requiresOrganization && !target.organizationId.trim()) {
      toast.error("공고를 생성할 고객사/조직을 선택해주세요.");
      return false;
    }
    return true;
  };

  const handleAiParsed = (parsed: JobDescriptionParseResult) => {
    setForm((previous) => ({
      ...previous,
      company: parsed.company,
      displayCompany: parsed.displayCompany || parsed.company,
      title: parsed.title,
      description: parsed.description,
      requirements: parsed.requirements.join("\n"),
      preferredQualifications: parsed.preferredQualifications.join("\n"),
      salary: parsed.salary || previous.salary,
      location: parsed.location,
      employmentType: parsed.employmentType || previous.employmentType,
    }));
    setAiFilled(true);
    window.requestAnimationFrame(() => {
      document.getElementById("job-standard-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleCreate = async () => {
    if (saving || !validateForm(form, session.role === "ADMIN")) return;

    const input: CreateB2BJobInput = {
      ...(session.role === "ADMIN" ? { organizationId: form.organizationId.trim() } : {}),
      company: form.company.trim(),
      displayCompany: form.displayCompany.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: splitLines(form.requirements),
      preferredQualifications: splitLines(form.preferredQualifications),
      salary: form.salary.trim(),
      location: form.location.trim(),
      employmentType: form.employmentType.trim(),
      status: form.status === "OPEN" ? "OPEN" : "DRAFT",
    };

    setSaving(true);
    try {
      const created = await createB2BJobViaApi(input);
      setJobs((previous) => [created, ...previous]);
      setForm(EMPTY_FORM);
      setAiFilled(false);
      setShowCreate(false);
      toast.success(
        created.status === "OPEN"
          ? "공고를 생성하고 공개했습니다."
          : "공고 초안을 저장했습니다."
      );
    } catch (error) {
      console.error("B2B job create failed:", error);
      toast.error(error instanceof JobApiError ? error.message : "공고 생성 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (job: B2BJobView) => {
    setEditingJobId(job.jobId);
    setEditForm(jobToForm(job));
    setShowCreate(false);
  };

  const handleEditSave = async () => {
    if (!editingJobId || saving || !validateForm(editForm, false)) return;

    setSaving(true);
    try {
      const updated = await updateB2BJobViaApi(editingJobId, {
        company: editForm.company.trim(),
        displayCompany: editForm.displayCompany.trim(),
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        requirements: splitLines(editForm.requirements),
        preferredQualifications: splitLines(editForm.preferredQualifications),
        salary: editForm.salary.trim(),
        location: editForm.location.trim(),
        employmentType: editForm.employmentType.trim(),
        status: editForm.status,
      });
      setJobs((previous) =>
        previous.map((item) => (item.jobId === updated.jobId ? updated : item))
      );
      setEditingJobId(null);
      toast.success("공고 내용을 수정했습니다.");
    } catch (error) {
      console.error("B2B job update failed:", error);
      toast.error(error instanceof JobApiError ? error.message : "공고 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (job: B2BJobView, status: JobStatus) => {
    if (job.status === status) return;
    setUpdatingJobId(job.jobId);
    try {
      const updated = await updateB2BJobViaApi(job.jobId, { status });
      setJobs((previous) =>
        previous.map((item) => (item.jobId === updated.jobId ? updated : item))
      );
      toast.success("공고 상태를 변경했습니다.");
    } catch (error) {
      console.error("B2B job status update failed:", error);
      toast.error(error instanceof JobApiError ? error.message : "공고 상태 변경 중 오류가 발생했습니다.");
    } finally {
      setUpdatingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공고 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            받은 공고문 AI 양식화부터 검토, 초안 저장, 공개, 마감까지 한 화면에서 운영합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((value) => !value);
            setEditingJobId(null);
            setAiFilled(false);
          }}
          className="rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-bold text-brand-gold shadow-sm"
        >
          {showCreate ? "작성 닫기" : "+ 새 공고"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["OPEN", "DRAFT", "CLOSED"] as JobStatus[]).map((status) => (
          <div key={status} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-400">{STATUS_LABELS[status]}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{counts[status]}</div>
          </div>
        ))}
      </div>

      {showCreate ? (
        <div className="space-y-4">
          <AiJdForm onParsed={handleAiParsed} disabled={saving} />

          <section
            id="job-standard-form"
            className="scroll-mt-24 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                  Standard Job Form
                </p>
                <h2 className="mt-1 text-base font-bold text-slate-900">The Lobby 표준 공고 양식</h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {aiFilled
                    ? "AI 변환 결과가 채워졌습니다. 원문과 대조해 누락·오류를 수정한 뒤 저장하세요."
                    : "직접 입력하거나 위에서 공고문을 AI 양식화하면 이 폼에 자동으로 채워집니다."}
                </p>
              </div>
              {aiFilled ? (
                <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
                  AI 양식화 완료 · 검토 필요
                </span>
              ) : null}
            </div>

            {session.role === "ADMIN" && organizations.length === 0 && !loading ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                선택 가능한 조직이 없습니다. organizations 컬렉션의 고객사 정보를 먼저 확인해주세요.
              </div>
            ) : null}

            <JobFields
              form={form}
              setForm={setForm}
              organizations={organizations}
              showOrganization={session.role === "ADMIN"}
              allowClosed={false}
            />

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-5 text-slate-400">
                작성중은 외부에 노출되지 않습니다. 공개중으로 저장한 공고만 구직자 채용공고에 노출됩니다.
              </p>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={saving || (session.role === "ADMIN" && organizations.length === 0)}
                className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-bold text-brand-gold disabled:opacity-50"
              >
                {saving
                  ? "저장 중..."
                  : form.status === "OPEN"
                    ? "검토 완료 · 공고 공개"
                    : "검토 완료 · 초안 저장"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {editingJobId ? (
        <section className="space-y-5 rounded-2xl border border-brand-gold/30 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">공고 수정</h2>
              <p className="mt-1 text-xs text-slate-400">
                공개 중인 공고도 내용과 상태를 수정할 수 있습니다. 조직은 변경할 수 없습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingJobId(null)}
              className="text-xs font-bold text-slate-500"
            >
              수정 닫기
            </button>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            조직: <span className="font-mono font-bold text-slate-700">{editForm.organizationId}</span>
          </div>
          <JobFields
            form={editForm}
            setForm={setEditForm}
            organizations={organizations}
            showOrganization={false}
            allowClosed
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingJobId(null)}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleEditSave()}
              disabled={saving}
              className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-bold text-brand-gold disabled:opacity-50"
            >
              {saving ? "수정 저장 중..." : "변경사항 저장"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">공고 목록을 불러오는 중입니다...</div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">등록된 공고가 없습니다.</div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {jobs.map((job) => (
                <article key={`mobile-${job.jobId}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-keep text-base font-bold leading-snug text-slate-900">{job.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{job.displayCompany}</p>
                    </div>
                    <select
                      value={job.status}
                      disabled={updatingJobId === job.jobId || saving}
                      onChange={(event) => void handleStatusChange(job, event.target.value as JobStatus)}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold"
                    >
                      <option value="OPEN">공개중</option>
                      <option value="DRAFT">작성중</option>
                      <option value="CLOSED">마감</option>
                    </select>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
                    <div><dt className="text-slate-400">근무지</dt><dd className="mt-1 font-semibold text-slate-700">{job.location}</dd></div>
                    <div><dt className="text-slate-400">고용형태</dt><dd className="mt-1 font-semibold text-slate-700">{job.employmentType}</dd></div>
                    <div className="col-span-2"><dt className="text-slate-400">급여</dt><dd className="mt-1 font-semibold text-slate-700">{job.salary}</dd></div>
                  </dl>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="min-w-0 text-[11px] text-slate-400">
                      <p>수정 {formatDate(job.updatedAt)}</p>
                      <p className="mt-1 truncate">{job.organizationId}</p>
                    </div>
                    <button type="button" onClick={() => startEdit(job)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-brand-navy">내용 수정</button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                  <th className="px-5 py-3">공고</th>
                  <th className="px-5 py-3">근무조건</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">수정일</th>
                  <th className="px-5 py-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {jobs.map((job) => (
                  <tr key={job.jobId} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{job.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{job.displayCompany}</div>
                      <div className="mt-1 text-[10px] font-mono text-slate-400">
                        {job.organizationId} · {job.jobId}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <div>{job.location}</div>
                      <div className="mt-1">{job.employmentType} · {job.salary}</div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={job.status}
                        disabled={updatingJobId === job.jobId || saving}
                        onChange={(event) =>
                          void handleStatusChange(job, event.target.value as JobStatus)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <option value="OPEN">공개중</option>
                        <option value="DRAFT">작성중</option>
                        <option value="CLOSED">마감</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{formatDate(job.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => startEdit(job)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-brand-navy hover:bg-slate-50"
                      >
                        내용 수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

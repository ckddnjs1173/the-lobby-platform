"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useB2BSession } from "../../../components/b2b-admin/B2BSessionContext";
import {
  JobApiError,
  createB2BJobViaApi,
  fetchB2BJobs,
  updateB2BJobViaApi,
  type B2BJobView,
  type CreateB2BJobInput,
} from "../../../lib/jobApi";
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
  showOrganization,
  allowClosed,
}: {
  form: JobFormState;
  setForm: React.Dispatch<React.SetStateAction<JobFormState>>;
  showOrganization: boolean;
  allowClosed: boolean;
}) {
  const update = (key: keyof JobFormState, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {showOrganization ? (
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-600">조직 ID *</span>
          <input
            value={form.organizationId}
            onChange={(event) => update("organizationId", event.target.value)}
            placeholder="조직 ID"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">실제 기업명 *</span>
          <input value={form.company} onChange={(event) => update("company", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">화면 노출 기업명 *</span>
          <input value={form.displayCompany} onChange={(event) => update("displayCompany", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">공고명 *</span>
        <input value={form.title} onChange={(event) => update("title", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">공고 설명 *</span>
        <textarea value={form.description} onChange={(event) => update("description", event.target.value)} className="h-32 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">필수 요건 · 한 줄에 하나</span>
          <textarea value={form.requirements} onChange={(event) => update("requirements", event.target.value)} className="h-28 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">우대 사항 · 한 줄에 하나</span>
          <textarea value={form.preferredQualifications} onChange={(event) => update("preferredQualifications", event.target.value)} className="h-28 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">급여 *</span>
          <input value={form.salary} onChange={(event) => update("salary", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">근무지 *</span>
          <input value={form.location} onChange={(event) => update("location", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-600">고용 형태 *</span>
          <input value={form.employmentType} onChange={(event) => update("employmentType", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">상태</span>
        <select value={form.status} onChange={(event) => update("status", event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
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
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
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

    fetchB2BJobs()
      .then((data) => {
        if (!cancelled) setJobs(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("B2B jobs load failed:", error);
        toast.error(error instanceof JobApiError ? error.message : "공고 목록을 불러오지 못했습니다.");
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
      toast.error("ADMIN은 공고를 생성할 조직 ID를 입력해야 합니다.");
      return false;
    }

    return true;
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
      setShowCreate(false);
      toast.success(created.status === "OPEN" ? "공고를 생성하고 공개했습니다." : "공고 초안을 저장했습니다.");
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

      setJobs((previous) => previous.map((item) => item.jobId === updated.jobId ? updated : item));
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
      setJobs((previous) => previous.map((item) => item.jobId === updated.jobId ? updated : item));
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
          <p className="mt-1 text-sm text-slate-500">공고 생성, 내용 수정, 공개, 마감까지 한 화면에서 운영합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((value) => !value);
            setEditingJobId(null);
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
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">새 채용 공고</h2>
            <p className="mt-1 text-xs text-slate-400">OPEN으로 저장하면 Public Job API를 통해 B2C에 노출됩니다.</p>
          </div>
          <JobFields form={form} setForm={setForm} showOrganization={session.role === "ADMIN"} allowClosed={false} />
          <div className="flex justify-end">
            <button type="button" onClick={() => void handleCreate()} disabled={saving} className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-bold text-brand-gold disabled:opacity-50">
              {saving ? "저장 중..." : "공고 저장"}
            </button>
          </div>
        </section>
      ) : null}

      {editingJobId ? (
        <section className="space-y-5 rounded-2xl border border-brand-gold/30 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">공고 수정</h2>
              <p className="mt-1 text-xs text-slate-400">공개 중인 공고도 내용과 상태를 수정할 수 있습니다. 조직은 변경할 수 없습니다.</p>
            </div>
            <button type="button" onClick={() => setEditingJobId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-800">수정 닫기</button>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            조직: <span className="font-mono font-bold text-slate-700">{editForm.organizationId}</span>
          </div>
          <JobFields form={editForm} setForm={setEditForm} showOrganization={false} allowClosed />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditingJobId(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">취소</button>
            <button type="button" onClick={() => void handleEditSave()} disabled={saving} className="rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-bold text-brand-gold disabled:opacity-50">
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
          <div className="overflow-x-auto">
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
                      <div className="mt-1 text-[10px] font-mono text-slate-400">{job.organizationId} · {job.jobId}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <div>{job.location}</div>
                      <div className="mt-1">{job.employmentType} · {job.salary}</div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={job.status}
                        disabled={updatingJobId === job.jobId || saving}
                        onChange={(event) => void handleStatusChange(job, event.target.value as JobStatus)}
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
        )}
      </section>
    </div>
  );
}

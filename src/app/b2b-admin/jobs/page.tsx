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
  JobApiError,
  createB2BJobViaApi,
  fetchB2BJobs,
  updateB2BJobViaApi,
  type B2BJobView,
  type CreateB2BJobInput,
} from "../../../lib/jobApi";

import type {
  JobStatus,
} from "../../../types";

const STATUS_LABELS: Record<JobStatus, string> = {
  OPEN: "공개중",
  DRAFT: "작성중",
  CLOSED: "마감",
};

const EMPTY_FORM = {
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
  status: "DRAFT" as "DRAFT" | "OPEN",
};

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function B2BJobsPage() {
  const session = useB2BSession();

  const [jobs, setJobs] =
    useState<B2BJobView[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showCreate, setShowCreate] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [updatingJobId, setUpdatingJobId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const counts = useMemo(() => {
    return jobs.reduce(
      (accumulator, job) => {
        accumulator[job.status] += 1;
        return accumulator;
      },
      {
        OPEN: 0,
        DRAFT: 0,
        CLOSED: 0,
      } as Record<JobStatus, number>
    );
  }, [jobs]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    fetchB2BJobs()
      .then((data) => {
        if (!cancelled) {
          setJobs(data);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "B2B jobs load failed:",
          error
        );

        if (error instanceof JobApiError) {
          toast.error(error.message);
        } else {
          toast.error(
            "공고 목록을 불러오지 못했습니다."
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
  }, []);

  const updateForm = (
    key: keyof typeof EMPTY_FORM,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleCreate = async () => {
    if (
      !form.company.trim() ||
      !form.title.trim() ||
      !form.description.trim() ||
      !form.location.trim()
    ) {
      toast.error(
        "기업명, 공고명, 설명, 근무지는 필수입니다."
      );
      return;
    }

    if (
      session.role === "ADMIN" &&
      !form.organizationId.trim()
    ) {
      toast.error(
        "ADMIN은 공고를 생성할 조직 ID를 입력해야 합니다."
      );
      return;
    }

    const input: CreateB2BJobInput = {
      ...(session.role === "ADMIN"
        ? {
            organizationId: form.organizationId.trim(),
          }
        : {}),
      company: form.company.trim(),
      displayCompany:
        form.displayCompany.trim() ||
        form.company.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: splitLines(form.requirements),
      preferredQualifications: splitLines(
        form.preferredQualifications
      ),
      salary: form.salary.trim() || "협의",
      location: form.location.trim(),
      employmentType:
        form.employmentType.trim() || "정규직",
      status: form.status,
    };

    setSaving(true);

    try {
      const created =
        await createB2BJobViaApi(input);

      setJobs((previous) => [
        created,
        ...previous,
      ]);

      setForm(EMPTY_FORM);
      setShowCreate(false);

      toast.success(
        created.status === "OPEN"
          ? "공고를 생성하고 공개했습니다."
          : "공고 초안을 저장했습니다."
      );
    } catch (error) {
      console.error(
        "B2B job create failed:",
        error
      );

      if (error instanceof JobApiError) {
        toast.error(error.message);
      } else {
        toast.error(
          "공고 생성 중 오류가 발생했습니다."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    job: B2BJobView,
    status: JobStatus
  ) => {
    if (job.status === status) {
      return;
    }

    setUpdatingJobId(job.jobId);

    try {
      const updated =
        await updateB2BJobViaApi(
          job.jobId,
          {
            status,
          }
        );

      setJobs((previous) =>
        previous.map((item) =>
          item.jobId === updated.jobId
            ? updated
            : item
        )
      );

      toast.success(
        "공고 상태를 변경했습니다."
      );
    } catch (error) {
      console.error(
        "B2B job status update failed:",
        error
      );

      if (error instanceof JobApiError) {
        toast.error(error.message);
      } else {
        toast.error(
          "공고 상태 변경 중 오류가 발생했습니다."
        );
      }
    } finally {
      setUpdatingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            공고 관리
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            서버 권한 검증을 통해 공고 생성, 공개, 마감을 관리합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="px-4 py-2.5 rounded-xl bg-brand-navy text-brand-gold text-sm font-bold shadow-sm"
        >
          {showCreate ? "작성 닫기" : "+ 새 공고"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["OPEN", "DRAFT", "CLOSED"] as JobStatus[]).map(
          (status) => (
            <div
              key={status}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="text-xs font-semibold text-slate-400">
                {STATUS_LABELS[status]}
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {counts[status]}
              </div>
            </div>
          )
        )}
      </div>

      {showCreate ? (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              새 채용 공고
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              OPEN으로 저장하면 B2C 공고 목록에 즉시 노출됩니다.
            </p>
          </div>

          {session.role === "ADMIN" ? (
            <input
              value={form.organizationId}
              onChange={(event) =>
                updateForm(
                  "organizationId",
                  event.target.value
                )
              }
              placeholder="조직 ID *"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={form.company}
              onChange={(event) =>
                updateForm("company", event.target.value)
              }
              placeholder="실제 기업명 *"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            <input
              value={form.displayCompany}
              onChange={(event) =>
                updateForm("displayCompany", event.target.value)
              }
              placeholder="화면 노출 기업명 (비우면 실제 기업명)"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <input
            value={form.title}
            onChange={(event) =>
              updateForm("title", event.target.value)
            }
            placeholder="공고명 *"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
          />

          <textarea
            value={form.description}
            onChange={(event) =>
              updateForm("description", event.target.value)
            }
            placeholder="공고 설명 *"
            className="w-full h-28 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <textarea
              value={form.requirements}
              onChange={(event) =>
                updateForm("requirements", event.target.value)
              }
              placeholder={"필수 요건 (한 줄에 하나)\n예: 고객 응대 경력 1년 이상"}
              className="h-28 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
            />
            <textarea
              value={form.preferredQualifications}
              onChange={(event) =>
                updateForm(
                  "preferredQualifications",
                  event.target.value
                )
              }
              placeholder={"우대 사항 (한 줄에 하나)\n예: 수입차 서비스센터 경력"}
              className="h-28 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <input
              value={form.salary}
              onChange={(event) =>
                updateForm("salary", event.target.value)
              }
              placeholder="급여 *"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            <input
              value={form.location}
              onChange={(event) =>
                updateForm("location", event.target.value)
              }
              placeholder="근무지 *"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            <input
              value={form.employmentType}
              onChange={(event) =>
                updateForm("employmentType", event.target.value)
              }
              placeholder="고용 형태 *"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
            <select
              value={form.status}
              onChange={(event) =>
                updateForm("status", event.target.value)
              }
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              <option value="DRAFT">초안으로 저장</option>
              <option value="OPEN">즉시 공개</option>
            </select>

            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-brand-navy text-brand-gold text-sm font-bold disabled:opacity-50"
            >
              {saving ? "저장 중..." : "공고 저장"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">
            공고 목록을 불러오는 중입니다...
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            등록된 공고가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                  <th className="py-3 px-5">공고</th>
                  <th className="py-3 px-5">근무조건</th>
                  <th className="py-3 px-5">상태</th>
                  <th className="py-3 px-5">수정일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {jobs.map((job) => (
                  <tr key={job.jobId} className="hover:bg-slate-50/70">
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900">
                        {job.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {job.displayCompany}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        {job.organizationId} · {job.jobId}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-600">
                      <div>{job.location}</div>
                      <div className="mt-1">
                        {job.employmentType} · {job.salary}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <select
                        value={job.status}
                        disabled={updatingJobId === job.jobId}
                        onChange={(event) =>
                          handleStatusChange(
                            job,
                            event.target.value as JobStatus
                          )
                        }
                        className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="OPEN">공개중</option>
                        <option value="DRAFT">작성중</option>
                        <option value="CLOSED">마감</option>
                      </select>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      {formatDate(job.updatedAt)}
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

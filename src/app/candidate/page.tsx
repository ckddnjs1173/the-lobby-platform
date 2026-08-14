"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import toast from "react-hot-toast";

import CandidateHeader from "../../components/candidate/CandidateHeader";

import {
  CandidatePortalApiError,
  fetchCandidatePortalApplications,
  fetchCandidatePortalProfile,
  updateCandidatePortalProfileViaApi,
} from "../../lib/candidatePortalApi";

import type {
  CandidatePortalApplicationView,
  CandidatePortalProfileView,
} from "../../lib/candidatePortalTypes";

import {
  auth,
} from "../../lib/firebase";

import type {
  ApplicationStage,
  CareerItem,
  EducationItem,
} from "../../types";

interface ProfileFormState {
  name: string;
  phone: string;
  headline: string;
  careerSummary: string;
  skills: string;
  careers: CareerItem[];
  education: EducationItem[];
}

const STAGE_COPY: Record<
  ApplicationStage,
  {
    label: string;
    description: string;
  }
> = {
  NEW: {
    label: "지원 접수",
    description:
      "지원서가 정상 접수되었습니다.",
  },
  REVIEWING: {
    label: "검토 중",
    description:
      "담당자가 프로필을 검토하고 있습니다.",
  },
  CONTACTED: {
    label: "연락 진행",
    description:
      "담당자 연락이 진행된 지원 건입니다.",
  },
  RECOMMEND_PENDING: {
    label: "추천 준비",
    description:
      "고객사 추천을 준비하고 있습니다.",
  },
  RECOMMENDED: {
    label: "기업 추천",
    description:
      "고객사에 프로필이 전달되었습니다.",
  },
  DOCUMENT_SCREEN: {
    label: "서류 전형",
    description:
      "고객사 서류 검토가 진행 중입니다.",
  },
  INTERVIEW: {
    label: "면접 진행",
    description:
      "면접 단계가 진행 중입니다.",
  },
  OFFER: {
    label: "처우 협의",
    description:
      "최종 조건을 조율하고 있습니다.",
  },
  HIRED: {
    label: "입사 확정",
    description:
      "채용이 확정되었습니다. 축하드립니다!",
  },
  HOLD: {
    label: "진행 보류",
    description:
      "채용 절차가 잠시 보류된 상태입니다.",
  },
  REJECTED: {
    label: "전형 종료",
    description:
      "이번 채용 절차가 종료되었습니다.",
  },
  CANCELED: {
    label: "지원 취소",
    description:
      "지원이 취소된 건입니다.",
  },
};

const METHOD_LABELS = {
  ONSITE: "대면 면접",
  VIDEO: "화상 면접",
  PHONE: "전화 면접",
} as const;

function profileToForm(
  profile: CandidatePortalProfileView
): ProfileFormState {
  return {
    name: profile.name,
    phone: profile.phone,
    headline: profile.headline,
    careerSummary: profile.careerSummary,
    skills: profile.skills.join(", "),
    careers: profile.careers,
    education: profile.education,
  };
}

function normalizeSkills(
  value: string
): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

export default function CandidatePortalPage() {
  const router = useRouter();
  const [profile, setProfile] =
    useState<CandidatePortalProfileView | null>(null);
  const [applications, setApplications] =
    useState<CandidatePortalApplicationView[]>([]);
  const [form, setForm] =
    useState<ProfileFormState | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [editing, setEditing] =
    useState(false);

  const loadPortal = useCallback(async () => {
    setLoading(true);

    try {
      const [profileData, applicationData] =
        await Promise.all([
          fetchCandidatePortalProfile(),
          fetchCandidatePortalApplications(),
        ]);

      setProfile(profileData);
      setForm(profileToForm(profileData));
      setApplications(applicationData);
    } catch (error) {
      console.error(
        "Candidate portal load failed:",
        error
      );

      if (
        error instanceof CandidatePortalApiError &&
        error.code === "CANDIDATE_NOT_FOUND"
      ) {
        router.replace("/register");
        return;
      }

      if (
        error instanceof CandidatePortalApiError &&
        (error.code === "AUTH_REQUIRED" ||
          error.status === 401)
      ) {
        router.replace("/login");
        return;
      }

      toast.error(
        error instanceof CandidatePortalApiError
          ? error.message
          : "Candidate Portal을 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          setLoading(false);
          router.replace("/login");
          return;
        }

        void loadPortal();
      }
    );
  }, [loadPortal, router]);

  const updateCareer = (
    index: number,
    field: keyof CareerItem,
    value: string
  ) => {
    setForm((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        careers: previous.careers.map(
          (career, careerIndex) =>
            careerIndex === index
              ? {
                  ...career,
                  [field]: value,
                }
              : career
        ),
      };
    });
  };

  const updateEducation = (
    index: number,
    field: keyof EducationItem,
    value: string
  ) => {
    setForm((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        education: previous.education.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        ),
      };
    });
  };

  const handleSave = async () => {
    if (!form || saving) {
      return;
    }

    if (
      !form.name.trim() ||
      !form.phone.trim()
    ) {
      toast.error(
        "이름과 연락처는 필수 입력 항목입니다."
      );
      return;
    }

    setSaving(true);

    try {
      const updated =
        await updateCandidatePortalProfileViaApi({
          name: form.name.trim(),
          phone: form.phone.trim(),
          headline: form.headline.trim(),
          careerSummary:
            form.careerSummary.trim(),
          skills: normalizeSkills(form.skills),
          careers: form.careers,
          education: form.education,
        });

      setProfile(updated);
      setForm(profileToForm(updated));
      setEditing(false);
      toast.success(
        "프로필을 업데이트했습니다."
      );
    } catch (error) {
      console.error(
        "Candidate profile update failed:",
        error
      );

      toast.error(
        error instanceof CandidatePortalApiError
          ? error.message
          : "프로필 저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <CandidateHeader />
        <div className="flex min-h-screen items-center justify-center pt-16 text-sm font-medium text-slate-400">
          내 커리어 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (!profile || !form) {
    return (
      <div className="min-h-screen bg-slate-50">
        <CandidateHeader />
        <div className="mx-auto max-w-xl px-4 pb-12 pt-28 text-center text-sm text-slate-500">
          Candidate 프로필을 확인할 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CandidateHeader />

      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-24 sm:px-6">
        <section className="overflow-hidden rounded-3xl bg-brand-navy p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
                Candidate Portal
              </div>
              <h1 className="text-3xl font-extrabold">
                {profile.name}님의 커리어 로비
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                프로필을 최신 상태로 유지하고 지원 현황과 예정 면접을 한 곳에서 확인하세요.
              </p>
            </div>

            <Link
              href="/jobs"
              className="rounded-xl bg-brand-gold px-5 py-3 text-center text-sm font-bold text-brand-navy hover:bg-yellow-400"
            >
              새 채용기회 보기
            </Link>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  내 프로필
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  이메일은 로그인 계정과 연결되어 있어 여기서 변경하지 않습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (editing) {
                    setForm(profileToForm(profile));
                  }
                  setEditing(!editing);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {editing ? "취소" : "프로필 수정"}
              </button>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600">
                <span>프로필 완성도</span>
                <span className="text-brand-navy">
                  {profile.profileCompleteness}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-gold transition-all"
                  style={{
                    width:
                      `${profile.profileCompleteness}%`,
                  }}
                />
              </div>
            </div>

            {editing ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-bold text-slate-700">
                    이름
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          name: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                    />
                  </label>

                  <label className="space-y-1 text-xs font-bold text-slate-700">
                    연락처
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                    />
                  </label>
                </div>

                <label className="block space-y-1 text-xs font-bold text-slate-700">
                  프로필 헤드라인
                  <input
                    value={form.headline}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        headline: event.target.value,
                      })
                    }
                    maxLength={200}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                  />
                </label>

                <label className="block space-y-1 text-xs font-bold text-slate-700">
                  경력 요약
                  <textarea
                    value={form.careerSummary}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        careerSummary:
                          event.target.value,
                      })
                    }
                    maxLength={3000}
                    className="min-h-28 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal leading-6 outline-none focus:border-brand-navy"
                  />
                </label>

                <label className="block space-y-1 text-xs font-bold text-slate-700">
                  핵심 스킬
                  <input
                    value={form.skills}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        skills: event.target.value,
                      })
                    }
                    placeholder="고객응대, VIP응대, 안내데스크"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-navy"
                  />
                </label>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-700">
                      경력
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          careers: [
                            ...form.careers,
                            {
                              companyName: "",
                              role: "",
                              period: "",
                              description: "",
                            },
                          ],
                        })
                      }
                      className="text-xs font-bold text-brand-navy"
                    >
                      + 경력 추가
                    </button>
                  </div>

                  {form.careers.map((career, index) => (
                    <div
                      key={`career-${index}`}
                      className="space-y-2 rounded-xl border border-slate-200 p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={career.companyName}
                          onChange={(event) =>
                            updateCareer(
                              index,
                              "companyName",
                              event.target.value
                            )
                          }
                          placeholder="회사명"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-navy"
                        />
                        <input
                          value={career.role}
                          onChange={(event) =>
                            updateCareer(
                              index,
                              "role",
                              event.target.value
                            )
                          }
                          placeholder="직무"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-navy"
                        />
                        <input
                          value={career.period}
                          onChange={(event) =>
                            updateCareer(
                              index,
                              "period",
                              event.target.value
                            )
                          }
                          placeholder="2023.01 - 현재"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-navy"
                        />
                      </div>
                      <textarea
                        value={career.description}
                        onChange={(event) =>
                          updateCareer(
                            index,
                            "description",
                            event.target.value
                          )
                        }
                        placeholder="주요 업무"
                        className="min-h-16 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-navy"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            careers:
                              form.careers.filter(
                                (_, itemIndex) =>
                                  itemIndex !== index
                              ),
                          })
                        }
                        className="text-[11px] font-semibold text-rose-600"
                      >
                        경력 삭제
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-700">
                      학력
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          education: [
                            ...form.education,
                            {
                              schoolName: "",
                              major: "",
                              degree: "",
                              period: "",
                            },
                          ],
                        })
                      }
                      className="text-xs font-bold text-brand-navy"
                    >
                      + 학력 추가
                    </button>
                  </div>

                  {form.education.map((item, index) => (
                    <div
                      key={`education-${index}`}
                      className="space-y-2 rounded-xl border border-slate-200 p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={item.schoolName}
                          onChange={(event) =>
                            updateEducation(
                              index,
                              "schoolName",
                              event.target.value
                            )
                          }
                          placeholder="학교명"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-navy"
                        />
                        <input
                          value={item.major || ""}
                          onChange={(event) =>
                            updateEducation(
                              index,
                              "major",
                              event.target.value
                            )
                          }
                          placeholder="전공"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-navy"
                        />
                        <input
                          value={item.degree || ""}
                          onChange={(event) =>
                            updateEducation(
                              index,
                              "degree",
                              event.target.value
                            )
                          }
                          placeholder="학위"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-navy"
                        />
                        <input
                          value={item.period || ""}
                          onChange={(event) =>
                            updateEducation(
                              index,
                              "period",
                              event.target.value
                            )
                          }
                          placeholder="2019.03 - 2023.02"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-navy"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            education:
                              form.education.filter(
                                (_, itemIndex) =>
                                  itemIndex !== index
                              ),
                          })
                        }
                        className="text-[11px] font-semibold text-rose-600"
                      >
                        학력 삭제
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="w-full rounded-xl bg-brand-navy py-3 text-sm font-bold text-brand-gold hover:bg-slate-900 disabled:opacity-50"
                >
                  {saving
                    ? "저장 중..."
                    : "프로필 저장"}
                </button>
              </div>
            ) : (
              <div className="space-y-5 text-sm">
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    이메일
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {profile.email}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    연락처
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {profile.phone}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    헤드라인
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {profile.headline || "아직 등록되지 않았습니다."}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">
                    핵심 스킬
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.skills.length > 0 ? (
                      profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        등록된 스킬이 없습니다.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  내 지원현황
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  지원한 포지션의 현재 진행 상태와 예정 면접을 확인할 수 있습니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {applications.length}건
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  아직 지원한 채용공고가 없습니다.
                </p>
                <Link
                  href="/jobs"
                  className="mt-4 inline-flex rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-brand-gold"
                >
                  채용공고 둘러보기
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((application) => {
                  const stageCopy =
                    STAGE_COPY[application.stage];

                  return (
                    <article
                      key={application.applicationId}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-brand-navy">
                            {application.company}
                          </div>
                          <h3 className="mt-1 text-base font-extrabold text-slate-900">
                            {application.jobTitle}
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            지원일 {formatDate(application.appliedAt)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-brand-gold/15 px-3 py-1 text-xs font-bold text-brand-navy">
                          {stageCopy.label}
                        </span>
                      </div>

                      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                        {stageCopy.description}
                      </p>

                      {application.nextInterview ? (
                        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
                          <div className="font-extrabold">
                            다음 면접 일정
                          </div>
                          <div className="mt-1 leading-5">
                            {formatDateTime(
                              application.nextInterview.scheduledAt
                            )}
                            {" · "}
                            {METHOD_LABELS[
                              application.nextInterview.method
                            ]}
                          </div>
                          {application.nextInterview.location ? (
                            <div className="mt-1 break-all text-indigo-700">
                              장소/접속: {application.nextInterview.location}
                            </div>
                          ) : null}
                          {application.nextInterview.interviewer ? (
                            <div className="mt-1 text-indigo-700">
                              면접관: {application.nextInterview.interviewer}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {application.stage === "HIRED" &&
                      application.plannedStartDate ? (
                        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                          입사 예정일 {application.plannedStartDate}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

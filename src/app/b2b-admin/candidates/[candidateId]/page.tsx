"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import toast from "react-hot-toast";

import {
  CandidateCrmApiError,
  fetchCandidateCrmDetail,
  updateCandidateCrmDetail,
  type CandidateCrmDetail,
} from "../../../../lib/candidateCrmApi";

import type {
  CareerItem,
  EducationItem,
} from "../../../../types";

function formatDateTime(
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
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

export default function CandidateCrmDetailPage() {
  const params = useParams<{
    candidateId: string;
  }>();
  const router = useRouter();

  const candidateId =
    typeof params.candidateId === "string"
      ? params.candidateId
      : "";

  const [candidate, setCandidate] =
    useState<CandidateCrmDetail | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [careerSummary, setCareerSummary] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [careers, setCareers] =
    useState<CareerItem[]>([]);
  const [education, setEducation] =
    useState<EducationItem[]>([]);

  useEffect(() => {
    if (!candidateId) {
      return;
    }

    let cancelled = false;

    setLoading(true);

    fetchCandidateCrmDetail(candidateId)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setCandidate(data);
        setName(data.name);
        setPhone(data.phone);
        setEmail(data.email);
        setHeadline(data.headline);
        setCareerSummary(data.careerSummary);
        setSkillsText(data.skills.join(", "));
        setCareers(data.careers);
        setEducation(data.education);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Candidate CRM detail load failed:",
          error
        );

        if (error instanceof CandidateCrmApiError) {
          toast.error(error.message);
        } else {
          toast.error(
            "후보자 상세 정보를 불러오지 못했습니다."
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
  }, [candidateId]);

  const skills = useMemo(
    () =>
      skillsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [skillsText]
  );

  const updateCareer = (
    index: number,
    field: keyof CareerItem,
    value: string
  ) => {
    setCareers((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addCareer = () => {
    if (careers.length >= 30) {
      toast.error(
        "경력은 최대 30개까지 등록할 수 있습니다."
      );
      return;
    }

    setCareers((current) => [
      ...current,
      {
        companyName: "",
        role: "",
        period: "",
        description: "",
      },
    ]);
  };

  const removeCareer = (
    index: number
  ) => {
    setCareers((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const updateEducation = (
    index: number,
    field: keyof EducationItem,
    value: string
  ) => {
    setEducation((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addEducation = () => {
    if (education.length >= 20) {
      toast.error(
        "학력은 최대 20개까지 등록할 수 있습니다."
      );
      return;
    }

    setEducation((current) => [
      ...current,
      {
        schoolName: "",
        major: "",
        degree: "",
        period: "",
      },
    ]);
  };

  const removeEducation = (
    index: number
  ) => {
    setEducation((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const handleSave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !name.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      toast.error(
        "이름, 연락처, 이메일은 필수입니다."
      );
      return;
    }

    if (
      careers.some(
        (item) =>
          !item.companyName.trim() ||
          !item.role.trim()
      )
    ) {
      toast.error(
        "경력의 회사명과 직무는 필수입니다."
      );
      return;
    }

    if (
      education.some(
        (item) =>
          !item.schoolName.trim()
      )
    ) {
      toast.error(
        "학력의 학교명은 필수입니다."
      );
      return;
    }

    setSaving(true);

    try {
      const result = await updateCandidateCrmDetail(
        candidateId,
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          headline: headline.trim(),
          careerSummary: careerSummary.trim(),
          skills,
          careers: careers.map(
            (item) => ({
              companyName:
                item.companyName.trim(),
              role:
                item.role.trim(),
              period:
                item.period.trim(),
              description:
                item.description.trim(),
            })
          ),
          education: education.map(
            (item) => ({
              schoolName:
                item.schoolName.trim(),
              major:
                item.major?.trim() || "",
              degree:
                item.degree?.trim() || "",
              period:
                item.period?.trim() || "",
            })
          ),
        }
      );

      setCandidate(result.candidate);
      setName(result.candidate.name);
      setPhone(result.candidate.phone);
      setEmail(result.candidate.email);
      setHeadline(result.candidate.headline);
      setCareerSummary(result.candidate.careerSummary);
      setSkillsText(result.candidate.skills.join(", "));
      setCareers(result.candidate.careers);
      setEducation(result.candidate.education);

      if (result.changed) {
        toast.success(
          "후보자 프로필을 수정하고 Audit Trail을 기록했습니다."
        );
      } else {
        toast.success(
          "변경된 내용이 없습니다."
        );
      }
    } catch (error) {
      console.error(
        "Candidate CRM update failed:",
        error
      );

      if (error instanceof CandidateCrmApiError) {
        toast.error(error.message);
      } else {
        toast.error(
          "후보자 정보를 수정하지 못했습니다."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-sm text-slate-400">
        후보자 상세 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-500">
          후보자 정보를 표시할 수 없습니다.
        </p>
        <button
          type="button"
          onClick={() => router.push("/b2b-admin/candidates")}
          className="px-4 py-2 rounded-lg bg-brand-navy text-brand-gold text-sm font-bold"
        >
          후보자 풀로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/b2b-admin/candidates")}
            className="text-xs font-semibold text-slate-500 hover:text-brand-navy"
          >
            ← 후보자 풀
          </button>

          <div className="flex items-center gap-2 mt-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {candidate.name}
            </h1>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
              {candidate.accountStatus}
            </span>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            Candidate CRM 상세 정보와 프로필을 관리합니다.
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">
            프로필 완성도
          </div>
          <div className="text-2xl font-black text-brand-navy">
            {candidate.profileCompleteness}%
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6"
        >
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                기본 정보
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                변경된 연락처는 기존 지원 건의 Candidate Snapshot에도 동기화됩니다.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">
                  이름
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-navy"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">
                  연락처
                </span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={50}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-navy"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-slate-600">
                이메일
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-navy"
              />
            </label>
          </section>

          <section className="space-y-4 pt-5 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              프로필
            </h2>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-slate-600">
                헤드라인
              </span>
              <input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={200}
                placeholder="예: 호텔 리셉션 5년 / VIP 응대"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-navy"
              />
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-slate-600">
                경력 요약
              </span>
              <textarea
                value={careerSummary}
                onChange={(event) => setCareerSummary(event.target.value)}
                maxLength={3000}
                rows={7}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-navy resize-y"
              />
              <span className="block text-right text-[10px] text-slate-400">
                {careerSummary.length}/3000
              </span>
            </label>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-slate-600">
                스킬
              </span>
              <input
                value={skillsText}
                onChange={(event) => setSkillsText(event.target.value)}
                placeholder="고객응대, 안내데스크, 영어"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-navy"
              />
              <span className="text-[10px] text-slate-400">
                쉼표로 구분 · 최대 20개
              </span>
            </label>
          </section>

          <section className="space-y-4 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  경력
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  회사명과 직무는 필수입니다. 최대 30개까지 등록할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={addCareer}
                className="shrink-0 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-brand-navy hover:bg-slate-50"
              >
                + 경력 추가
              </button>
            </div>

            {careers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                등록된 경력이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {careers.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        경력 {index + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeCareer(index)
                        }
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">
                          회사명 *
                        </span>
                        <input
                          value={item.companyName}
                          onChange={(event) =>
                            updateCareer(
                              index,
                              "companyName",
                              event.target.value
                            )
                          }
                          maxLength={200}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-brand-navy"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">
                          직무 *
                        </span>
                        <input
                          value={item.role}
                          onChange={(event) =>
                            updateCareer(
                              index,
                              "role",
                              event.target.value
                            )
                          }
                          maxLength={200}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-brand-navy"
                        />
                      </label>
                    </div>

                    <label className="space-y-1 block">
                      <span className="text-xs font-semibold text-slate-600">
                        재직 기간
                      </span>
                      <input
                        value={item.period}
                        onChange={(event) =>
                          updateCareer(
                            index,
                            "period",
                            event.target.value
                          )
                        }
                        maxLength={100}
                        placeholder="예: 2023.07 - 현재"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-brand-navy"
                      />
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-xs font-semibold text-slate-600">
                        주요 업무
                      </span>
                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          updateCareer(
                            index,
                            "description",
                            event.target.value
                          )
                        }
                        maxLength={2000}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-brand-navy resize-y"
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  학력
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  학교명은 필수입니다. 최대 20개까지 등록할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={addEducation}
                className="shrink-0 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-brand-navy hover:bg-slate-50"
              >
                + 학력 추가
              </button>
            </div>

            {education.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                등록된 학력이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {education.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        학력 {index + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeEducation(index)
                        }
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700"
                      >
                        삭제
                      </button>
                    </div>

                    <label className="space-y-1 block">
                      <span className="text-xs font-semibold text-slate-600">
                        학교명 *
                      </span>
                      <input
                        value={item.schoolName}
                        onChange={(event) =>
                          updateEducation(
                            index,
                            "schoolName",
                            event.target.value
                          )
                        }
                        maxLength={200}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-brand-navy"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">
                          전공
                        </span>
                        <input
                          value={item.major || ""}
                          onChange={(event) =>
                            updateEducation(
                              index,
                              "major",
                              event.target.value
                            )
                          }
                          maxLength={200}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-brand-navy"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">
                          학위
                        </span>
                        <input
                          value={item.degree || ""}
                          onChange={(event) =>
                            updateEducation(
                              index,
                              "degree",
                              event.target.value
                            )
                          }
                          maxLength={100}
                          placeholder="예: 학사"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-brand-navy"
                        />
                      </label>
                    </div>

                    <label className="space-y-1 block">
                      <span className="text-xs font-semibold text-slate-600">
                        재학 기간
                      </span>
                      <input
                        value={item.period || ""}
                        onChange={(event) =>
                          updateEducation(
                            index,
                            "period",
                            event.target.value
                          )
                        }
                        maxLength={100}
                        placeholder="예: 2017.03 - 2021.02"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-brand-navy"
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-brand-navy text-brand-gold text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              관리 정보
            </h2>

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-slate-400">Candidate ID</dt>
                <dd className="mt-1 text-slate-700 font-mono break-all">
                  {candidate.candidateId}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Organization</dt>
                <dd className="mt-1 font-semibold text-slate-700">
                  {candidate.organizationId}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">등록자</dt>
                <dd className="mt-1 font-semibold text-slate-700">
                  {candidate.createdByName || candidate.createdBy}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">최초 등록</dt>
                <dd className="mt-1 text-slate-700">
                  {formatDateTime(candidate.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">최근 후보자 갱신</dt>
                <dd className="mt-1 text-slate-700">
                  {formatDateTime(candidate.updatedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">최근 프로필 갱신</dt>
                <dd className="mt-1 text-slate-700">
                  {formatDateTime(candidate.profileUpdatedAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              경력 / 학력 데이터
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400">
                  경력 항목
                </div>
                <div className="text-lg font-black text-brand-navy mt-1">
                  {candidate.careers.length}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400">
                  학력 항목
                </div>
                <div className="text-lg font-black text-brand-navy mt-1">
                  {candidate.education.length}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              경력·학력 항목은 좌측 프로필 편집 영역에서 관리할 수 있습니다.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

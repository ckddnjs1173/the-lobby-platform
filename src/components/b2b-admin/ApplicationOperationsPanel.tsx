"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import type {
  ApplicationView,
} from "../../types";

import {
  ApplicationOperationsApiError,
  assignApplicationRecruiterViaApi,
  cancelApplicationInterviewViaApi,
  completeApplicationInterviewViaApi,
  fetchApplicationInterviews,
  fetchAssignableRecruiters,
  scheduleApplicationInterviewViaApi,
  updateApplicationInterviewViaApi,
  type ApplicationInterviewView,
  type AssignableRecruiter,
  type InterviewMethod,
  type InterviewResult,
  type InterviewStatus,
} from "../../lib/applicationOperationsApi";

interface ApplicationOperationsPanelProps {
  application: ApplicationView;
  onActivityChanged?: () => void;
}

const METHOD_LABELS: Record<
  InterviewMethod,
  string
> = {
  ONSITE: "대면",
  VIDEO: "화상",
  PHONE: "전화",
};

const STATUS_LABELS: Record<
  InterviewStatus,
  string
> = {
  SCHEDULED: "예정",
  COMPLETED: "완료",
  CANCELED: "취소",
};

const RESULT_LABELS: Record<
  InterviewResult,
  string
> = {
  PASS: "합격",
  FAIL: "불합격",
  HOLD: "보류",
  NO_SHOW: "불참",
};

function formatInterviewDate(
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

function toDateTimeLocalValue(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() -
      timezoneOffset
  )
    .toISOString()
    .slice(0, 16);
}

function sortInterviews(
  interviews: ApplicationInterviewView[]
): ApplicationInterviewView[] {
  return [...interviews].sort(
    (a, b) =>
      Date.parse(a.scheduledAt) -
      Date.parse(b.scheduledAt)
  );
}

export default function ApplicationOperationsPanel({
  application,
  onActivityChanged,
}: ApplicationOperationsPanelProps) {
  const [
    recruiters,
    setRecruiters,
  ] = useState<AssignableRecruiter[]>([]);

  const [
    currentRecruiterId,
    setCurrentRecruiterId,
  ] = useState(
    application.recruiterId
  );

  const [
    selectedRecruiterId,
    setSelectedRecruiterId,
  ] = useState(
    application.recruiterId
  );

  const [
    assigneeNote,
    setAssigneeNote,
  ] = useState("");

  const [
    assigning,
    setAssigning,
  ] = useState(false);

  const [
    interviews,
    setInterviews,
  ] = useState<ApplicationInterviewView[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState("");

  const [
    method,
    setMethod,
  ] = useState<InterviewMethod>(
    "ONSITE"
  );

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    interviewer,
    setInterviewer,
  ] = useState("");

  const [
    interviewNote,
    setInterviewNote,
  ] = useState("");

  const [
    editingInterviewId,
    setEditingInterviewId,
  ] = useState<string | null>(null);

  const [
    savingInterview,
    setSavingInterview,
  ] = useState(false);

  const [
    completingInterviewId,
    setCompletingInterviewId,
  ] = useState<string | null>(null);

  const [
    completionResult,
    setCompletionResult,
  ] = useState<InterviewResult>(
    "PASS"
  );

  const [
    completionNote,
    setCompletionNote,
  ] = useState("");

  const [
    cancelingInterviewId,
    setCancelingInterviewId,
  ] = useState<string | null>(null);

  const [
    cancelReason,
    setCancelReason,
  ] = useState("");

  const [
    lifecycleUpdatingInterviewId,
    setLifecycleUpdatingInterviewId,
  ] = useState<string | null>(null);

  const currentRecruiter = useMemo(
    () =>
      recruiters.find(
        (item) =>
          item.uid ===
          currentRecruiterId
      ) || null,
    [
      recruiters,
      currentRecruiterId,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setCurrentRecruiterId(
      application.recruiterId
    );
    setSelectedRecruiterId(
      application.recruiterId
    );
    setAssigneeNote("");
    setEditingInterviewId(null);
    setCompletingInterviewId(null);
    setCancelingInterviewId(null);

    Promise.all([
      fetchAssignableRecruiters(
        application.organizationId
      ),
      fetchApplicationInterviews(
        application.applicationId
      ),
    ])
      .then(
        ([recruiterData, interviewData]) => {
          if (cancelled) {
            return;
          }

          setRecruiters(
            recruiterData
          );
          setInterviews(
            interviewData
          );
        }
      )
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Application operations load failed:",
          error
        );

        if (
          error instanceof
          ApplicationOperationsApiError
        ) {
          toast.error(
            error.message
          );
        } else {
          toast.error(
            "담당자/면접 운영 정보를 불러오지 못했습니다."
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
  }, [
    application.applicationId,
    application.organizationId,
    application.recruiterId,
  ]);

  const replaceInterview = (
    updated: ApplicationInterviewView
  ) => {
    setInterviews(
      (previous) =>
        sortInterviews(
          previous.map(
            (interview) =>
              interview.interviewId ===
              updated.interviewId
                ? updated
                : interview
          )
        )
    );
  };

  const resetInterviewForm = () => {
    setEditingInterviewId(null);
    setScheduledAt("");
    setMethod("ONSITE");
    setLocation("");
    setInterviewer("");
    setInterviewNote("");
  };

  const handleAssign = async () => {
    if (
      !selectedRecruiterId ||
      assigning
    ) {
      return;
    }

    setAssigning(true);

    try {
      const result =
        await assignApplicationRecruiterViaApi(
          application.applicationId,
          selectedRecruiterId,
          assigneeNote
        );

      setCurrentRecruiterId(
        result.recruiterId
      );
      setSelectedRecruiterId(
        result.recruiterId
      );
      setAssigneeNote("");

      if (result.changed) {
        toast.success(
          "담당 Recruiter를 변경했습니다."
        );
        onActivityChanged?.();
      } else {
        toast(
          "이미 현재 담당자입니다."
        );
      }
    } catch (error) {
      console.error(
        "Assignee update failed:",
        error
      );

      if (
        error instanceof
        ApplicationOperationsApiError
      ) {
        toast.error(
          error.message
        );
      } else {
        toast.error(
          "담당자 변경 중 오류가 발생했습니다."
        );
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleStartEditInterview = (
    interview: ApplicationInterviewView
  ) => {
    setEditingInterviewId(
      interview.interviewId
    );
    setScheduledAt(
      toDateTimeLocalValue(
        interview.scheduledAt
      )
    );
    setMethod(
      interview.method
    );
    setLocation(
      interview.location || ""
    );
    setInterviewer(
      interview.interviewer || ""
    );
    setInterviewNote(
      interview.note || ""
    );
    setCompletingInterviewId(null);
    setCancelingInterviewId(null);
  };

  const handleSaveInterview = async () => {
    if (!scheduledAt) {
      toast.error(
        "면접 일시를 선택해주세요."
      );
      return;
    }

    if (
      method === "ONSITE" &&
      !location.trim()
    ) {
      toast.error(
        "대면 면접 장소를 입력해주세요."
      );
      return;
    }

    const date =
      new Date(scheduledAt);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      toast.error(
        "면접 일시를 확인해주세요."
      );
      return;
    }

    setSavingInterview(true);

    try {
      if (editingInterviewId) {
        const updated =
          await updateApplicationInterviewViaApi(
            application.applicationId,
            editingInterviewId,
            {
              scheduledAt:
                date.toISOString(),
              method,
              location,
              interviewer,
              note:
                interviewNote,
            }
          );

        replaceInterview(
          updated
        );
        resetInterviewForm();
        toast.success(
          "면접 일정을 수정했습니다."
        );
      } else {
        const created =
          await scheduleApplicationInterviewViaApi(
            application.applicationId,
            {
              scheduledAt:
                date.toISOString(),
              method,
              location,
              interviewer,
              note:
                interviewNote,
            }
          );

        setInterviews(
          (previous) =>
            sortInterviews([
              ...previous,
              created,
            ])
        );
        resetInterviewForm();
        toast.success(
          "면접 일정을 등록했습니다."
        );
      }

      onActivityChanged?.();
    } catch (error) {
      console.error(
        "Interview save failed:",
        error
      );

      if (
        error instanceof
        ApplicationOperationsApiError
      ) {
        toast.error(
          error.message
        );
      } else {
        toast.error(
          editingInterviewId
            ? "면접 일정 수정 중 오류가 발생했습니다."
            : "면접 일정 등록 중 오류가 발생했습니다."
        );
      }
    } finally {
      setSavingInterview(false);
    }
  };

  const handleCompleteInterview = async (
    interviewId: string
  ) => {
    setLifecycleUpdatingInterviewId(
      interviewId
    );

    try {
      const updated =
        await completeApplicationInterviewViaApi(
          application.applicationId,
          interviewId,
          completionResult,
          completionNote
        );

      replaceInterview(
        updated
      );
      setCompletingInterviewId(null);
      setCompletionResult("PASS");
      setCompletionNote("");
      toast.success(
        "면접 결과를 기록했습니다."
      );
      onActivityChanged?.();
    } catch (error) {
      console.error(
        "Interview completion failed:",
        error
      );

      if (
        error instanceof
        ApplicationOperationsApiError
      ) {
        toast.error(
          error.message
        );
      } else {
        toast.error(
          "면접 완료 처리 중 오류가 발생했습니다."
        );
      }
    } finally {
      setLifecycleUpdatingInterviewId(null);
    }
  };

  const handleCancelInterview = async (
    interviewId: string
  ) => {
    if (!cancelReason.trim()) {
      toast.error(
        "면접 취소 사유를 입력해주세요."
      );
      return;
    }

    setLifecycleUpdatingInterviewId(
      interviewId
    );

    try {
      const updated =
        await cancelApplicationInterviewViaApi(
          application.applicationId,
          interviewId,
          cancelReason
        );

      replaceInterview(
        updated
      );
      setCancelingInterviewId(null);
      setCancelReason("");
      toast.success(
        "면접 일정을 취소했습니다."
      );
      onActivityChanged?.();
    } catch (error) {
      console.error(
        "Interview cancellation failed:",
        error
      );

      if (
        error instanceof
        ApplicationOperationsApiError
      ) {
        toast.error(
          error.message
        );
      } else {
        toast.error(
          "면접 취소 처리 중 오류가 발생했습니다."
        );
      }
    } finally {
      setLifecycleUpdatingInterviewId(null);
    }
  };

  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
      <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
        <span>🧭</span>
        담당자 / 면접 운영
      </h3>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">
          운영 정보를 불러오는 중입니다...
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">
                현재 담당 Recruiter
              </div>
              <div className="mt-1 text-sm font-bold text-slate-800">
                {currentRecruiter?.name ||
                  currentRecruiterId}
              </div>
              {currentRecruiter?.email ? (
                <div className="text-[11px] text-slate-400">
                  {currentRecruiter.email}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <select
                value={
                  selectedRecruiterId
                }
                onChange={(event) =>
                  setSelectedRecruiterId(
                    event.target.value
                  )
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-navy"
              >
                {recruiters.map(
                  (recruiter) => (
                    <option
                      key={recruiter.uid}
                      value={recruiter.uid}
                    >
                      {recruiter.name}
                      {recruiter.email
                        ? ` (${recruiter.email})`
                        : ""}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                disabled={
                  assigning ||
                  !selectedRecruiterId
                }
                onClick={
                  handleAssign
                }
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {assigning
                  ? "변경 중..."
                  : "담당자 변경"}
              </button>
            </div>

            <input
              value={assigneeNote}
              onChange={(event) =>
                setAssigneeNote(
                  event.target.value
                )
              }
              maxLength={2000}
              placeholder="담당자 변경 사유 (선택)"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-800">
                {editingInterviewId
                  ? "면접 일정 수정"
                  : "면접 일정 등록"}
              </div>

              {editingInterviewId ? (
                <button
                  type="button"
                  onClick={
                    resetInterviewForm
                  }
                  disabled={savingInterview}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40"
                >
                  수정 취소
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) =>
                  setScheduledAt(
                    event.target.value
                  )
                }
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
              />

              <select
                value={method}
                onChange={(event) =>
                  setMethod(
                    event.target
                      .value as InterviewMethod
                  )
                }
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-brand-navy"
              >
                {Object.entries(
                  METHOD_LABELS
                ).map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <input
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
              maxLength={500}
              placeholder={
                method === "VIDEO"
                  ? "화상 면접 링크 (선택)"
                  : method === "PHONE"
                    ? "통화 정보 (선택)"
                    : "면접 장소"
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
            />

            <input
              value={interviewer}
              onChange={(event) =>
                setInterviewer(
                  event.target.value
                )
              }
              maxLength={200}
              placeholder="면접관 / 고객사 담당자 (선택)"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
            />

            <textarea
              value={interviewNote}
              onChange={(event) =>
                setInterviewNote(
                  event.target.value
                )
              }
              maxLength={2000}
              placeholder="면접 준비사항 또는 전달 메모 (선택)"
              className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy resize-none h-16"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={
                  handleSaveInterview
                }
                disabled={
                  savingInterview ||
                  !scheduledAt
                }
                className="px-3 py-2 rounded-lg bg-brand-navy text-brand-gold text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingInterview
                  ? "저장 중..."
                  : editingInterviewId
                    ? "면접 일정 저장"
                    : "면접 일정 등록"}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800">
                면접 타임라인
              </div>
              <span className="text-[11px] text-slate-400">
                {interviews.length}건
              </span>
            </div>

            {interviews.length > 0 ? (
              <div className="space-y-2">
                {interviews.map(
                  (interview) => {
                    const isLifecycleUpdating =
                      lifecycleUpdatingInterviewId ===
                      interview.interviewId;

                    return (
                      <div
                        key={
                          interview.interviewId
                        }
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-800">
                              {formatInterviewDate(
                                interview.scheduledAt
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                                {METHOD_LABELS[
                                  interview.method
                                ]}
                              </span>
                              <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                                {STATUS_LABELS[
                                  interview.status
                                ]}
                              </span>
                              {interview.result ? (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                  {RESULT_LABELS[
                                    interview.result
                                  ]}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {interview.status === "SCHEDULED" ? (
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                disabled={isLifecycleUpdating}
                                onClick={() =>
                                  handleStartEditInterview(
                                    interview
                                  )
                                }
                                className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                disabled={isLifecycleUpdating}
                                onClick={() => {
                                  setCompletingInterviewId(
                                    interview.interviewId
                                  );
                                  setCancelingInterviewId(null);
                                  setCompletionResult("PASS");
                                  setCompletionNote("");
                                }}
                                className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 disabled:opacity-40"
                              >
                                완료
                              </button>
                              <button
                                type="button"
                                disabled={isLifecycleUpdating}
                                onClick={() => {
                                  setCancelingInterviewId(
                                    interview.interviewId
                                  );
                                  setCompletingInterviewId(null);
                                  setCancelReason("");
                                }}
                                className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 disabled:opacity-40"
                              >
                                취소
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {interview.location ? (
                          <div className="mt-2 text-slate-500 break-all">
                            장소/링크: {interview.location}
                          </div>
                        ) : null}

                        {interview.interviewer ? (
                          <div className="mt-1 text-slate-500">
                            면접관: {interview.interviewer}
                          </div>
                        ) : null}

                        {interview.note ? (
                          <div className="mt-2 whitespace-pre-wrap text-slate-600">
                            {interview.note}
                          </div>
                        ) : null}

                        {interview.cancelReason ? (
                          <div className="mt-2 rounded bg-rose-50 px-2.5 py-2 text-rose-700">
                            취소 사유: {interview.cancelReason}
                          </div>
                        ) : null}

                        {completingInterviewId === interview.interviewId ? (
                          <div className="mt-3 space-y-2 rounded-lg border border-emerald-100 bg-white p-3">
                            <div className="text-[11px] font-bold text-slate-700">
                              면접 결과 기록
                            </div>
                            <select
                              value={completionResult}
                              onChange={(event) =>
                                setCompletionResult(
                                  event.target.value as InterviewResult
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs bg-white focus:outline-none focus:border-brand-navy"
                            >
                              {Object.entries(
                                RESULT_LABELS
                              ).map(([value, label]) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {label}
                                </option>
                              ))}
                            </select>
                            <textarea
                              value={completionNote}
                              onChange={(event) =>
                                setCompletionNote(
                                  event.target.value
                                )
                              }
                              maxLength={2000}
                              placeholder="면접 평가 메모 (선택)"
                              className="h-16 w-full resize-none rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-brand-navy"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setCompletingInterviewId(null)
                                }
                                className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500"
                              >
                                닫기
                              </button>
                              <button
                                type="button"
                                disabled={isLifecycleUpdating}
                                onClick={() =>
                                  handleCompleteInterview(
                                    interview.interviewId
                                  )
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
                              >
                                {isLifecycleUpdating
                                  ? "처리 중..."
                                  : "결과 확정"}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {cancelingInterviewId === interview.interviewId ? (
                          <div className="mt-3 space-y-2 rounded-lg border border-rose-100 bg-white p-3">
                            <div className="text-[11px] font-bold text-slate-700">
                              면접 취소
                            </div>
                            <textarea
                              value={cancelReason}
                              onChange={(event) =>
                                setCancelReason(
                                  event.target.value
                                )
                              }
                              maxLength={2000}
                              placeholder="취소 사유를 입력해주세요."
                              className="h-16 w-full resize-none rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-rose-300"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setCancelingInterviewId(null)
                                }
                                className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500"
                              >
                                닫기
                              </button>
                              <button
                                type="button"
                                disabled={
                                  isLifecycleUpdating ||
                                  !cancelReason.trim()
                                }
                                onClick={() =>
                                  handleCancelInterview(
                                    interview.interviewId
                                  )
                                }
                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
                              >
                                {isLifecycleUpdating
                                  ? "처리 중..."
                                  : "면접 취소"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                등록된 면접 일정이 없습니다.
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

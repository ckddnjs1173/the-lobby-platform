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
  fetchApplicationInterviews,
  fetchAssignableRecruiters,
  scheduleApplicationInterviewViaApi,
  type ApplicationInterviewView,
  type AssignableRecruiter,
  type InterviewMethod,
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
    scheduling,
    setScheduling,
  ] = useState(false);

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

  const handleSchedule = async () => {
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

    setScheduling(true);

    try {
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
          [
            ...previous,
            created,
          ].sort(
            (a, b) =>
              Date.parse(
                a.scheduledAt
              ) -
              Date.parse(
                b.scheduledAt
              )
          )
      );

      setScheduledAt("");
      setLocation("");
      setInterviewer("");
      setInterviewNote("");

      toast.success(
        "면접 일정을 등록했습니다."
      );
      onActivityChanged?.();
    } catch (error) {
      console.error(
        "Interview schedule failed:",
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
          "면접 일정 등록 중 오류가 발생했습니다."
        );
      }
    } finally {
      setScheduling(false);
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
            <div className="text-xs font-bold text-slate-800">
              면접 일정 등록
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
                  handleSchedule
                }
                disabled={
                  scheduling ||
                  !scheduledAt
                }
                className="px-3 py-2 rounded-lg bg-brand-navy text-brand-gold text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {scheduling
                  ? "등록 중..."
                  : "면접 일정 등록"}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800">
                등록된 면접 일정
              </div>
              <span className="text-[11px] text-slate-400">
                {interviews.length}건
              </span>
            </div>

            {interviews.length > 0 ? (
              <div className="space-y-2">
                {interviews.map(
                  (interview) => (
                    <div
                      key={
                        interview.interviewId
                      }
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-bold text-slate-800">
                          {formatInterviewDate(
                            interview.scheduledAt
                          )}
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                          {METHOD_LABELS[
                            interview.method
                          ]}
                        </span>
                      </div>

                      {interview.location ? (
                        <div className="mt-1 text-slate-500 break-all">
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
                    </div>
                  )
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

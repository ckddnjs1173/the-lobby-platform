"use client";

import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  ApplicationActivityApiError,
  addApplicationNoteViaApi,
  fetchApplicationActivity,
  type ApplicationActivityItem,
} from "../../lib/applicationActivityApi";

interface ApplicationActivityPanelProps {
  applicationId: string;
}

const EVENT_LABELS: Record<
  ApplicationActivityItem["type"],
  string
> = {
  APPLICATION_CREATED: "지원 생성",
  STAGE_CHANGED: "단계 변경",
  NOTE_ADDED: "메모",
  RECRUITER_ASSIGNED: "담당자 변경",
  EMAIL_SENT: "이메일 발송",
  INTERVIEW_SCHEDULED: "면접 일정",
  PROFILE_UPDATED: "프로필 갱신",
};

function formatActivityTime(
  value: string | null
): string {
  if (!value) {
    return "시간 정보 없음";
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
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function activitySummary(
  activity: ApplicationActivityItem
): string | null {
  if (
    activity.type === "STAGE_CHANGED" &&
    activity.fromStage &&
    activity.toStage
  ) {
    return `${activity.fromStage} → ${activity.toStage}`;
  }

  if (
    activity.type === "APPLICATION_CREATED" &&
    activity.toStage
  ) {
    return `초기 단계: ${activity.toStage}`;
  }

  return null;
}

export default function ApplicationActivityPanel({
  applicationId,
}: ApplicationActivityPanelProps) {
  const [activities, setActivities] =
    useState<ApplicationActivityItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [note, setNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setActivities([]);
    setNote("");

    fetchApplicationActivity(applicationId)
      .then((data) => {
        if (!cancelled) {
          setActivities(data);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Application activity load failed:",
          error
        );

        if (
          error instanceof ApplicationActivityApiError
        ) {
          toast.error(error.message);
        } else {
          toast.error(
            "지원 활동 내역을 불러오지 못했습니다."
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
  }, [applicationId]);

  const handleAddNote = async () => {
    const normalizedNote = note.trim();

    if (!normalizedNote) {
      toast.error(
        "메모 내용을 입력해주세요."
      );
      return;
    }

    setSaving(true);

    try {
      const created =
        await addApplicationNoteViaApi(
          applicationId,
          normalizedNote
        );

      setActivities((previous) => [
        created,
        ...previous.filter(
          (item) => item.eventId !== created.eventId
        ),
      ]);

      setNote("");

      toast.success(
        "활동 메모를 저장했습니다."
      );
    } catch (error) {
      console.error(
        "Application note create failed:",
        error
      );

      if (
        error instanceof ApplicationActivityApiError
      ) {
        toast.error(error.message);
      } else {
        toast.error(
          "활동 메모 저장 중 오류가 발생했습니다."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 border-b pb-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>🕒</span>
          활동 타임라인
        </h3>

        <span className="text-[11px] font-semibold text-slate-400">
          {activities.length}건
        </span>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-600">
          내부 활동 메모
        </label>

        <textarea
          value={note}
          onChange={(event) =>
            setNote(event.target.value)
          }
          maxLength={2000}
          placeholder="예: 지원자와 통화 완료. 다음 주 월요일 오전 면접 희망."
          className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy resize-none h-20"
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400">
            {note.length}/2000
          </span>

          <button
            type="button"
            onClick={handleAddNote}
            disabled={saving || !note.trim()}
            className="px-3 py-1.5 rounded-lg bg-brand-navy text-brand-gold text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중..." : "메모 저장"}
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          단계 변경 없이 남긴 메모도 Audit Event로 기록됩니다.
        </p>
      </div>

      <div className="pt-2 border-t border-slate-100">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">
            활동 내역을 불러오는 중입니다...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            아직 기록된 활동이 없습니다.
          </div>
        ) : (
          <ol className="space-y-3">
            {activities.map((activity) => {
              const summary = activitySummary(activity);

              return (
                <li
                  key={activity.eventId}
                  className="relative pl-4 border-l-2 border-slate-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800">
                        {EVENT_LABELS[activity.type]}
                      </div>

                      {summary ? (
                        <div className="text-[11px] text-brand-navy font-semibold mt-0.5">
                          {summary}
                        </div>
                      ) : null}
                    </div>

                    <time className="shrink-0 text-[10px] text-slate-400">
                      {formatActivityTime(activity.createdAt)}
                    </time>
                  </div>

                  {activity.note ? (
                    <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap break-words">
                      {activity.note}
                    </p>
                  ) : null}

                  <div className="mt-1 text-[10px] text-slate-400 font-mono truncate">
                    actor: {activity.changedBy}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

"use client";

import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import type {
  ApplicationView,
  HiringOutcomeStatus,
  HiringOutcomeView,
} from "../../types";

import {
  HiringOutcomeApiError,
  recordHiringOutcomeViaApi,
} from "../../lib/hiringOutcomeApi";

interface ApplicationHiringOutcomePanelProps {
  application: ApplicationView;
  onRecorded?: (
    outcome: HiringOutcomeView
  ) => void;
}

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

export default function ApplicationHiringOutcomePanel({
  application,
  onRecorded,
}: ApplicationHiringOutcomePanelProps) {
  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<HiringOutcomeStatus>(
    application.stage === "OFFER"
      ? "HIRED"
      : "REJECTED"
  );

  const [note, setNote] =
    useState("");

  const [
    plannedStartDate,
    setPlannedStartDate,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    setSelectedStatus(
      application.stage === "OFFER"
        ? "HIRED"
        : "REJECTED"
    );
    setNote("");
    setPlannedStartDate("");
  }, [
    application.applicationId,
    application.stage,
  ]);

  if (application.hiringOutcome) {
    const outcome =
      application.hiringOutcome;

    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <span>🏁</span>
            최종 채용 결과
          </h3>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              outcome.status === "HIRED"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {outcome.status === "HIRED"
              ? "입사 확정"
              : "불합격"}
          </span>
        </div>

        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-400">
              결정 시각
            </dt>
            <dd className="mt-1 font-medium text-slate-700">
              {formatDateTime(
                outcome.decidedAt
              )}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-400">
              결정자
            </dt>
            <dd className="mt-1 break-all font-mono text-slate-700">
              {outcome.decidedBy}
            </dd>
          </div>

          {outcome.plannedStartDate ? (
            <div>
              <dt className="font-semibold text-slate-400">
                입사 예정일
              </dt>
              <dd className="mt-1 font-bold text-emerald-700">
                {outcome.plannedStartDate}
              </dd>
            </div>
          ) : null}
        </dl>

        {outcome.note ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 whitespace-pre-wrap">
            {outcome.note}
          </div>
        ) : null}

        <p className="text-[11px] leading-5 text-slate-400">
          종료된 결과를 되돌리는 작업은 관리자 권한과 사유가 필요하며, 재오픈 시 기존 결과 메타데이터도 함께 정리됩니다.
        </p>
      </section>
    );
  }

  const canHire =
    application.stage === "OFFER";

  const canReject =
    ![
      "HIRED",
      "REJECTED",
      "CANCELED",
    ].includes(
      application.stage
    );

  if (!canHire && !canReject) {
    return null;
  }

  const handleSubmit = async () => {
    if (
      selectedStatus === "HIRED" &&
      !canHire
    ) {
      toast.error(
        "입사 확정은 처우협의 단계에서만 처리할 수 있습니다."
      );
      return;
    }

    if (
      selectedStatus === "REJECTED" &&
      !canReject
    ) {
      toast.error(
        "현재 단계에서는 불합격 처리를 할 수 없습니다."
      );
      return;
    }

    if (
      selectedStatus === "REJECTED" &&
      !note.trim()
    ) {
      toast.error(
        "불합격 사유를 입력해주세요."
      );
      return;
    }

    setSaving(true);

    try {
      const outcome =
        await recordHiringOutcomeViaApi(
          application.applicationId,
          {
            status:
              selectedStatus,
            note,
            plannedStartDate:
              selectedStatus === "HIRED"
                ? plannedStartDate
                : undefined,
          }
        );

      toast.success(
        outcome.status === "HIRED"
          ? "입사 확정 결과를 기록했습니다."
          : "불합격 결과를 기록했습니다."
      );

      onRecorded?.(
        outcome
      );
    } catch (error) {
      console.error(
        "Hiring outcome update failed:",
        error
      );

      if (
        error instanceof
        HiringOutcomeApiError
      ) {
        toast.error(
          error.message
        );
      } else {
        toast.error(
          "최종 채용 결과 처리 중 오류가 발생했습니다."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span>🏁</span>
          최종 채용 결과
        </h3>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">
          입사 확정과 불합격은 일반 Stage 변경이 아니라 결정 정보와 함께 서버 transaction으로 기록합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={
            saving ||
            !canHire
          }
          onClick={() =>
            setSelectedStatus(
              "HIRED"
            )
          }
          className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            selectedStatus === "HIRED"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          입사 확정
        </button>

        <button
          type="button"
          disabled={
            saving ||
            !canReject
          }
          onClick={() =>
            setSelectedStatus(
              "REJECTED"
            )
          }
          className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            selectedStatus === "REJECTED"
              ? "border-rose-300 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          불합격 확정
        </button>
      </div>

      {selectedStatus === "HIRED" ? (
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-600">
            입사 예정일
          </span>
          <input
            type="date"
            value={
              plannedStartDate
            }
            onChange={(event) =>
              setPlannedStartDate(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-brand-navy"
          />
        </label>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">
          {selectedStatus === "REJECTED"
            ? "결정 사유 *"
            : "결정 메모"}
        </span>
        <textarea
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value
            )
          }
          maxLength={2000}
          placeholder={
            selectedStatus === "REJECTED"
              ? "불합격 사유를 입력해주세요."
              : "입사 확정 관련 메모 (선택)"
          }
          className="h-20 w-full resize-none rounded-lg border border-slate-200 p-3 text-xs focus:outline-none focus:border-brand-navy"
        />
      </label>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={
            saving ||
            (selectedStatus === "HIRED" && !canHire) ||
            (selectedStatus === "REJECTED" &&
              (!canReject || !note.trim()))
          }
          onClick={handleSubmit}
          className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-brand-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "결과 저장 중..."
            : "최종 결과 확정"}
        </button>
      </div>
    </section>
  );
}

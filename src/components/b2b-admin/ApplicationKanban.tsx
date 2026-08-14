"use client";

import {
  useState,
  type DragEvent,
} from "react";

import {
  ApplicationStage,
  ApplicationView,
} from "../../types";

interface ApplicationKanbanProps {
  applications: ApplicationView[];
  recruiterNames?: Record<string, string>;
  staleApplicationIds?: ReadonlySet<string>;
  onStageChange: (
    applicationId: string,
    newStage: ApplicationStage
  ) => Promise<void> | void;
  onSelectApplication: (
    application: ApplicationView
  ) => void;
}

interface KanbanColumn {
  stage: ApplicationStage;
  label: string;
  className: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    stage: "NEW",
    label: "신규지원",
    className:
      "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    stage: "REVIEWING",
    label: "검토중",
    className:
      "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    stage: "CONTACTED",
    label: "연락완료",
    className:
      "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    stage: "RECOMMEND_PENDING",
    label: "추천예정",
    className:
      "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    stage: "RECOMMENDED",
    label: "고객사추천",
    className:
      "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    stage: "DOCUMENT_SCREEN",
    label: "서류전형",
    className:
      "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    stage: "INTERVIEW",
    label: "면접진행",
    className:
      "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    stage: "OFFER",
    label: "처우협의",
    className:
      "bg-pink-50 text-pink-700 border-pink-200",
  },
  {
    stage: "HIRED",
    label: "합격/입사",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

const TERMINAL_STAGE_LABELS: Partial<
  Record<ApplicationStage, string>
> = {
  HOLD: "보류",
  REJECTED: "탈락",
  CANCELED: "지원취소",
};

function formatCompactDate(
  isoDate: string
): string {
  if (!isoDate) {
    return "";
  }

  const parsedDate = new Date(isoDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString(
    "ko-KR",
    {
      month: "numeric",
      day: "numeric",
    }
  );
}

export default function ApplicationKanban({
  applications,
  recruiterNames = {},
  staleApplicationIds,
  onStageChange,
  onSelectApplication,
}: ApplicationKanbanProps) {
  const [
    draggingApplicationId,
    setDraggingApplicationId,
  ] = useState<string | null>(null);

  const [
    dropTargetStage,
    setDropTargetStage,
  ] = useState<ApplicationStage | null>(null);

  const [
    movingApplicationId,
    setMovingApplicationId,
  ] = useState<string | null>(null);

  const terminalApplications =
    applications.filter((application) =>
      ["HOLD", "REJECTED", "CANCELED"].includes(
        application.stage
      )
    );

  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    application: ApplicationView
  ) => {
    if (movingApplicationId) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      application.applicationId
    );

    setDraggingApplicationId(
      application.applicationId
    );
  };

  const handleDragEnd = () => {
    setDraggingApplicationId(null);
    setDropTargetStage(null);
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    stage: ApplicationStage
  ) => {
    if (!draggingApplicationId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetStage(stage);
  };

  const handleDrop = async (
    event: DragEvent<HTMLDivElement>,
    stage: ApplicationStage
  ) => {
    event.preventDefault();

    const applicationId =
      event.dataTransfer.getData("text/plain") ||
      draggingApplicationId;

    setDraggingApplicationId(null);
    setDropTargetStage(null);

    if (!applicationId || movingApplicationId) {
      return;
    }

    const application = applications.find(
      (item) => item.applicationId === applicationId
    );

    if (!application || application.stage === stage) {
      return;
    }

    setMovingApplicationId(applicationId);

    try {
      await onStageChange(applicationId, stage);
    } finally {
      setMovingApplicationId(null);
    }
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs font-bold text-slate-700">
            드래그해서 지원 단계를 이동할 수 있습니다.
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            단계 변경은 서버 권한 검증과 활동 로그 기록을 그대로 거칩니다.
          </p>
        </div>

        {movingApplicationId && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
            단계 변경 중...
          </span>
        )}
      </div>

      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnApplications =
            applications.filter(
              (application) =>
                application.stage === column.stage
            );

          const isDropTarget =
            dropTargetStage === column.stage;

          return (
            <div
              key={column.stage}
              onDragOver={(event) =>
                handleDragOver(event, column.stage)
              }
              onDrop={(event) =>
                void handleDrop(event, column.stage)
              }
              className={`bg-slate-100/80 rounded-2xl p-4 flex flex-col min-w-[260px] w-[260px] h-full border shrink-0 transition-all ${
                isDropTarget
                  ? "border-brand-navy ring-2 ring-brand-navy/10 bg-brand-navy/[0.03]"
                  : "border-slate-200/60"
              }`}
            >
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold mb-3 ${column.className}`}
              >
                <span>{column.label}</span>
                <span className="bg-white/80 px-2 py-0.5 rounded-full text-slate-700 font-mono">
                  {columnApplications.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {columnApplications.length > 0 ? (
                  columnApplications.map((application) => {
                    const isDragging =
                      draggingApplicationId ===
                      application.applicationId;
                    const isMoving =
                      movingApplicationId ===
                      application.applicationId;
                    const isStale =
                      staleApplicationIds?.has(
                        application.applicationId
                      ) || false;
                    const recruiterName =
                      recruiterNames[
                        application.recruiterId
                      ] || application.recruiterId;

                    return (
                      <button
                        type="button"
                        draggable={!movingApplicationId}
                        key={application.applicationId}
                        onDragStart={(event) =>
                          handleDragStart(
                            event,
                            application
                          )
                        }
                        onDragEnd={handleDragEnd}
                        onClick={() =>
                          onSelectApplication(application)
                        }
                        className={`w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-2 group ${
                          isDragging
                            ? "opacity-40 cursor-grabbing"
                            : isMoving
                              ? "opacity-60 cursor-wait"
                              : "cursor-grab active:cursor-grabbing"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-navy transition-colors truncate">
                            {application.candidateName}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatCompactDate(
                              application.appliedAt
                            )}
                          </span>
                        </div>

                        <div className="text-xs font-medium text-brand-navy bg-brand-gold/10 px-2 py-1 rounded truncate">
                          {application.jobTitle}
                        </div>

                        <div className="text-[11px] text-slate-500 truncate">
                          🏢 {application.company}
                        </div>

                        <div className="text-[10px] text-slate-400 truncate">
                          담당 · {recruiterName}
                        </div>

                        <div className="text-[10px] text-slate-400 truncate">
                          📞 {application.candidatePhone}
                        </div>

                        {isStale && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                            3일+ 미처리
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div
                    className={`h-32 flex items-center justify-center text-xs border border-dashed rounded-xl transition-colors ${
                      isDropTarget
                        ? "border-brand-navy text-brand-navy bg-white"
                        : "border-slate-200 text-slate-400"
                    }`}
                  >
                    {isDropTarget
                      ? "여기에 놓아 단계 이동"
                      : "지원자 없음"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {terminalApplications.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-500">
              종료 / 예외 상태
            </span>

            {(
              [
                "HOLD",
                "REJECTED",
                "CANCELED",
              ] as ApplicationStage[]
            ).map((stage) => {
              const count = terminalApplications.filter(
                (application) =>
                  application.stage === stage
              ).length;

              if (count === 0) {
                return null;
              }

              return (
                <span
                  key={stage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-600"
                >
                  <span>
                    {TERMINAL_STAGE_LABELS[stage]}
                  </span>
                  <strong>{count}</strong>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

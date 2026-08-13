"use client";

import {
  ApplicationStage,
  ApplicationView,
} from "../../types";

interface ApplicationKanbanProps {
  applications: ApplicationView[];

  onStageChange: (
    applicationId: string,
    newStage: ApplicationStage
  ) => void;

  onSelectApplication: (
    application: ApplicationView
  ) => void;
}

interface KanbanColumn {
  stage: ApplicationStage;
  label: string;
  className: string;
}

/**
 * Phase 4에서 실제 Drag & Drop Pipeline으로 확장한다.
 *
 * 현재 Phase 1에서는 데이터 모델 및 타입 안정성 확보가 목적이므로
 * 주요 Stage에 대한 Read-only Pipeline View 역할만 담당한다.
 */
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
  onStageChange,
  onSelectApplication,
}: ApplicationKanbanProps) {
  /**
   * Phase 4 Drag & Drop 구현 전까지는
   * stage 변경 함수를 의도적으로 실행하지 않는다.
   *
   * 부모와의 인터페이스 호환성을 유지하되,
   * 현재 Kanban이 상태 변경 기능을 가진 것처럼 보이지 않게 한다.
   */
  void onStageChange;

  const terminalApplications =
    applications.filter((application) =>
      ["HOLD", "REJECTED", "CANCELED"].includes(
        application.stage
      )
    );

  return (
    <div className="space-y-4 h-full">
      {/* Active Pipeline */}
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnApplications =
            applications.filter(
              (application) =>
                application.stage ===
                column.stage
            );

          return (
            <div
              key={column.stage}
              className="bg-slate-100/80 rounded-2xl p-4 flex flex-col min-w-[260px] w-[260px] h-full border border-slate-200/60 shrink-0"
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold mb-3 ${column.className}`}
              >
                <span>{column.label}</span>

                <span className="bg-white/80 px-2 py-0.5 rounded-full text-slate-700 font-mono">
                  {
                    columnApplications.length
                  }
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {columnApplications.length >
                0 ? (
                  columnApplications.map(
                    (application) => (
                      <button
                        type="button"
                        key={
                          application.applicationId
                        }
                        onClick={() =>
                          onSelectApplication(
                            application
                          )
                        }
                        className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-navy transition-colors truncate">
                            {
                              application.candidateName
                            }
                          </h3>

                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatCompactDate(
                              application.appliedAt
                            )}
                          </span>
                        </div>

                        <div className="text-xs font-medium text-brand-navy bg-brand-gold/10 px-2 py-1 rounded truncate">
                          {
                            application.jobTitle
                          }
                        </div>

                        <div className="text-[11px] text-slate-500 truncate">
                          🏢{" "}
                          {application.company}
                        </div>

                        <div className="text-[10px] text-slate-400 truncate">
                          📞{" "}
                          {
                            application.candidatePhone
                          }
                        </div>
                      </button>
                    )
                  )
                ) : (
                  <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    지원자 없음
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Status Summary */}
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
              const count =
                terminalApplications.filter(
                  (application) =>
                    application.stage ===
                    stage
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
                    {
                      TERMINAL_STAGE_LABELS[
                        stage
                      ]
                    }
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
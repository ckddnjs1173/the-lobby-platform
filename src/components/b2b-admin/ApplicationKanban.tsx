"use client";

import { ApplicationStage } from "../../types";

interface ApplicationKanbanProps {
  applications: any[];
  onStageChange: (applicationId: string, newStage: ApplicationStage) => void;
  onSelectApplication: (app: any) => void;
}

const KANBAN_COLUMNS: { stage: ApplicationStage; label: string; color: string }[] = [
  { stage: "NEW", label: "신규지원", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { stage: "REVIEWING", label: "검토중", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { stage: "DOCUMENT_SCREEN", label: "서류전형", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { stage: "INTERVIEW", label: "면접진행", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { stage: "OFFER", label: "처우협의", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { stage: "HIRED", label: "합격입사", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export default function ApplicationKanban({
  applications,
  onStageChange,
  onSelectApplication,
}: ApplicationKanbanProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 h-full overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((col) => {
        const columnApps = applications.filter((app) => app.stage === col.stage);

        return (
          <div key={col.stage} className="bg-slate-100/80 rounded-2xl p-4 flex flex-col min-w-[260px] h-full border border-slate-200/60">
            {/* 컬럼 헤더 */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold mb-3 ${col.color}`}>
              <span>{col.label}</span>
              <span className="bg-white/80 px-2 py-0.5 rounded-full text-slate-700 font-mono">
                {columnApps.length}
              </span>
            </div>

            {/* 카드 리스트 */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {columnApps.length > 0 ? (
                columnApps.map((app) => (
                  <div
                    key={app.applicationId}
                    onClick={() => onSelectApplication(app)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-navy transition-colors">
                        {app.candidateName}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : ""}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-brand-navy bg-brand-gold/10 px-2 py-1 rounded truncate">
                      {app.jobTitle}
                    </div>

                    <div className="text-[11px] text-slate-500 truncate">
                      🏢 {app.company}
                    </div>
                  </div>
                ))
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
  );
}
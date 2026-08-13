"use client";

import { useState } from "react";
import { Application, ApplicationStage } from "../../types";

interface ApplicationKanbanProps {
  applications: (Application & { candidateName?: string; jobTitle?: string; company?: string })[];
  onStageChange: (applicationId: string, newStage: ApplicationStage) => void;
  onSelectApplication: (app: any) => void;
}

// 칸반에 노출할 핵심 단계 정의
const KANBAN_COLUMNS: { stage: ApplicationStage; label: string; color: string }[] = [
  { stage: "NEW", label: "신규 지원", color: "border-blue-200 bg-blue-50/50" },
  { stage: "REVIEWING", label: "검토 중", color: "border-indigo-200 bg-indigo-50/50" },
  { stage: "CONTACTED", label: "연락 완료", color: "border-purple-200 bg-purple-50/50" },
  { stage: "RECOMMENDED", label: "고객사 추천", color: "border-cyan-200 bg-cyan-50/50" },
  { stage: "INTERVIEW", label: "면접 진행", color: "border-orange-200 bg-orange-50/50" },
  { stage: "HIRED", label: "입사 확정", color: "border-emerald-200 bg-emerald-50/50" },
];

export default function ApplicationKanban({
  applications,
  onStageChange,
  onSelectApplication,
}: ApplicationKanbanProps) {
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, applicationId: string) => {
    setDraggedAppId(applicationId);
    e.dataTransfer.setData("text/plain", applicationId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Drop 허용을 위해 필수
  };

  const handleDrop = (e: React.DragEvent, targetStage: ApplicationStage) => {
    e.preventDefault();
    if (draggedAppId) {
      onStageChange(draggedAppId, targetStage);
      setDraggedAppId(null);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[600px] items-start">
      {KANBAN_COLUMNS.map((col) => {
        const columnApps = applications.filter((app) => app.stage === col.stage);

        return (
          <div
            key={col.stage}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.stage)}
            className={`w-80 flex-shrink-0 bg-slate-100 rounded-2xl border ${col.color} flex flex-col max-h-full shadow-sm`}
          >
            {/* 컬럼 헤더 */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/60 rounded-t-2xl">
              <span className="font-bold text-sm text-slate-800">{col.label}</span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 text-xs font-bold rounded-full text-slate-600 shadow-xs">
                {columnApps.length}
              </span>
            </div>

            {/* 카드 리스트 영역 */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {columnApps.length > 0 ? (
                columnApps.map((app) => (
                  <div
                    key={app.applicationId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.applicationId)}
                    onClick={() => onSelectApplication(app)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2 group"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 group-hover:text-brand-navy text-sm">
                        {app.candidateName || "지원자 이름 없음"}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 line-clamp-1">{app.jobTitle}</div>
                      <div className="text-[11px] text-slate-500">{app.company}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-24 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/30">
                  지원 내역 없음
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
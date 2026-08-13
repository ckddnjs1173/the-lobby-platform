"use client";

import { useState } from "react";
import { Application, ApplicationStage } from "../../types";

interface ApplicationTableProps {
  applications: (Application & { candidateName?: string; candidatePhone?: string; jobTitle?: string; company?: string })[];
  onSelectApplication: (app: any) => void;
  onStageChange: (applicationId: string, newStage: ApplicationStage) => void;
}

// 단계별 한글 명칭 및 스타일 맵핑
const STAGE_LABELS: Record<ApplicationStage, { label: string; color: string }> = {
  NEW: { label: "신우 신규", color: "bg-blue-50 text-blue-700 border-blue-200" },
  REVIEWING: { label: "검토중", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  CONTACTED: { label: "연락완료", color: "bg-purple-50 text-purple-700 border-purple-200" },
  RECOMMEND_PENDING: { label: "추천예정", color: "bg-amber-50 text-amber-700 border-amber-200" },
  RECOMMENDED: { label: "고객사추천", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  DOCUMENT_SCREEN: { label: "서류전형", color: "bg-teal-50 text-teal-700 border-teal-200" },
  INTERVIEW: { label: "면접진행", color: "bg-orange-50 text-orange-700 border-orange-200" },
  OFFER: { label: "처우협의", color: "bg-pink-50 text-pink-700 border-pink-200" },
  HIRED: { label: "입사확정", color: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold" },
  HOLD: { label: "보류", color: "bg-slate-100 text-slate-600 border-slate-200" },
  REJECTED: { label: "탈락", color: "bg-red-50 text-red-600 border-red-200" },
  CANCELED: { label: "지원취소", color: "bg-slate-100 text-slate-400 border-slate-200" },
};

export default function ApplicationTable({
  applications,
  onSelectApplication,
  onStageChange,
}: ApplicationTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("ALL");

  // 검색 및 필터 적용
  const filteredApps = applications.filter((app) => {
    const matchSearch =
      app.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStage = selectedStageFilter === "ALL" || app.stage === selectedStageFilter;

    return matchSearch && matchStage;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      {/* 툴바 (검색 및 필터) */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <input
            type="text"
            placeholder="지원자 이름, 공고 제목, 기업명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy text-slate-700 font-medium"
          >
            <option value="ALL">전체 단계 보기</option>
            {Object.keys(STAGE_LABELS).map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage as ApplicationStage].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 고밀도 테이블 (High-Density Application Table) */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">지원자</th>
              <th className="py-3 px-4">연락처</th>
              <th className="py-3 px-4">지원 공고 / 기업</th>
              <th className="py-3 px-4">현재 진행 단계</th>
              <th className="py-3 px-4">지원일시</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredApps.length > 0 ? (
              filteredApps.map((app) => {
                const stageInfo = STAGE_LABELS[app.stage] || { label: app.stage, color: "bg-slate-100 text-slate-700" };
                return (
                  <tr
                    key={app.applicationId}
                    onClick={() => onSelectApplication(app)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-brand-navy">
                      {app.candidateName || "이름 없음"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {app.candidatePhone || "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{app.jobTitle || "직무 정보 없음"}</div>
                      <div className="text-xs text-slate-500">{app.company || "기업명 미공개"}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${stageInfo.color}`}>
                        {stageInfo.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                      {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                  조건에 일치하는 지원 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
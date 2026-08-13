"use client";

import { useState } from "react";
import { Application, ApplicationStage, Profile } from "../../types";

interface ApplicationSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApp: (Application & { candidateName?: string; candidatePhone?: string; candidateEmail?: string; jobTitle?: string; company?: string }) | null;
  candidateProfile: Profile | null;
  otherApplications: Application[];
  onStageChange: (applicationId: string, newStage: ApplicationStage, note?: string) => void;
}

const STAGE_OPTIONS: { value: ApplicationStage; label: string }[] = [
  { value: "NEW", label: "신규" },
  { value: "REVIEWING", label: "검토중" },
  { value: "CONTACTED", label: "연락완료" },
  { value: "RECOMMEND_PENDING", label: "추천예정" },
  { value: "RECOMMENDED", label: "고객사추천" },
  { value: "DOCUMENT_SCREEN", label: "서류전형" },
  { value: "INTERVIEW", label: "면접진행" },
  { value: "OFFER", label: "처우협의" },
  { value: "HIRED", label: "입사확정" },
  { value: "HOLD", label: "보류" },
  { value: "REJECTED", label: "탈락" },
  { value: "CANCELED", label: "지원취소" },
];

export default function ApplicationSlideOver({
  isOpen,
  onClose,
  selectedApp,
  candidateProfile,
  otherApplications,
  onStageChange,
}: ApplicationSlideOverProps) {
  const [noteText, setNoteText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !selectedApp) return null;

  const handleStageUpdate = async (newStage: ApplicationStage) => {
    setIsUpdating(true);
    await onStageChange(selectedApp.applicationId, newStage, noteText);
    setNoteText("");
    setIsUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        
        {/* 헤더 영역 (연락처 전진 배치 & 닫기 버튼) */}
        <div className="px-6 py-5 bg-brand-navy text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{selectedApp.candidateName || "지원자"}</h2>
              <span className="px-2.5 py-0.5 bg-brand-gold text-brand-navy text-xs font-bold rounded">
                {selectedApp.stage}
              </span>
            </div>
            <div className="text-sm text-slate-300 mt-1 flex items-center gap-4 font-mono">
              <span>📞 {selectedApp.candidatePhone || "연락처 없음"}</span>
              <span>✉️ {selectedApp.candidateEmail || "이메일 없음"}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">

          {/* 1. Current Application (현재 지원 건 및 상태 변경 제어) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <span className="text-brand-gold">🎯</span> 현재 지원 공고
            </h3>
            <div>
              <div className="text-base font-bold text-slate-800">{selectedApp.jobTitle}</div>
              <div className="text-sm text-slate-500">{selectedApp.company}</div>
            </div>

            {/* 상태 변경 컨트롤 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600">진행 단계 변경</label>
              <div className="grid grid-cols-3 gap-2">
                {STAGE_OPTIONS.slice(0, 9).map((opt) => (
                  <button
                    key={opt.value}
                    disabled={isUpdating}
                    onClick={() => handleStageUpdate(opt.value)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all ${
                      selectedApp.stage === opt.value
                        ? "bg-brand-navy text-brand-gold border-brand-navy font-bold shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 메모 입력 */}
            <div className="space-y-1 pt-2">
              <label className="block text-xs font-semibold text-slate-600">상태 변경 메모 / 통화 이력</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="예: 지원자와 통화 완료. 다음 주 월요일 면접 희망."
                className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy resize-none h-16"
              />
            </div>
          </div>

          {/* 2. Candidate Profile (구직자 커리어 정보) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <span className="text-brand-gold">👤</span> 구직자 프로필 요약
            </h3>
            {candidateProfile ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Headline</span>
                  <p className="font-semibold text-slate-800">{candidateProfile.headline || "등록된 헤드라인 없음"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">핵심 역량 및 스킬</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {candidateProfile.skills?.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">경력 요약</span>
                  <p className="text-slate-600 text-xs whitespace-pre-wrap mt-0.5">{candidateProfile.careerSummary || "내용 없음"}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">연동된 프로필 상세 정보가 없습니다.</p>
            )}
          </div>

          {/* 3. Other Applications (다른 지원 건) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <span className="text-brand-gold">📂</span> 해당 지원자의 다른 지원 내역 ({otherApplications.length})
            </h3>
            {otherApplications.length > 0 ? (
              <div className="space-y-2">
                {otherApplications.map((app) => (
                  <div key={app.applicationId} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800">지원 ID: {app.jobId.slice(0, 8)}...</span>
                      <span className="text-slate-400 ml-2">({new Date(app.appliedAt).toLocaleDateString()})</span>
                    </div>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 font-semibold rounded text-slate-700">
                      {app.stage}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">이외의 다른 지원 내역이 없습니다.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
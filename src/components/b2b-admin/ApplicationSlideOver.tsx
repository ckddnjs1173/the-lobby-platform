"use client";

import {
  useState,
} from "react";

import type {
  ApplicationStage,
  ApplicationView,
} from "../../types";

import type {
  B2BCandidateProfile,
} from "../../lib/b2bApi";

import ApplicationActivityPanel from "./ApplicationActivityPanel";
import ApplicationOperationsPanel from "./ApplicationOperationsPanel";

interface ApplicationSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApp: ApplicationView | null;
  candidateProfile: B2BCandidateProfile | null;
  profileLoading: boolean;
  otherApplications: ApplicationView[];
  onStageChange: (
    applicationId: string,
    newStage: ApplicationStage,
    note?: string
  ) => Promise<void> | void;
}

const STAGE_OPTIONS: {
  value: ApplicationStage;
  label: string;
}[] = [
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
  profileLoading,
  otherApplications,
  onStageChange,
}: ApplicationSlideOverProps) {
  const [noteText, setNoteText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [activityRevision, setActivityRevision] = useState(0);

  if (!isOpen || !selectedApp) {
    return null;
  }

  const handleStageUpdate = async (
    newStage: ApplicationStage
  ) => {
    if (newStage === selectedApp.stage) {
      return;
    }

    setIsUpdating(true);

    try {
      await onStageChange(
        selectedApp.applicationId,
        newStage,
        noteText.trim() || undefined
      );

      setNoteText("");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOperationsActivityChanged = () => {
    setActivityRevision(
      (previous) =>
        previous + 1
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        <div className="px-6 py-5 bg-brand-navy text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">
                {selectedApp.candidateName}
              </h2>

              <span className="px-2.5 py-0.5 bg-brand-gold text-brand-navy text-xs font-bold rounded">
                {selectedApp.stage}
              </span>
            </div>

            <div className="text-sm text-slate-300 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
              <span>📞 {selectedApp.candidatePhone}</span>
              <span>✉️ {selectedApp.candidateEmail}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 transition-colors"
            aria-label="패널 닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <span>🎯</span>
              현재 지원 공고
            </h3>

            <div>
              <div className="text-base font-bold text-slate-800">
                {selectedApp.jobTitle}
              </div>
              <div className="text-sm text-slate-500">
                {selectedApp.company}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                지원일 {selectedApp.appliedAt || "-"}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600">
                진행 단계 변경
              </label>

              <div className="grid grid-cols-3 gap-2">
                {STAGE_OPTIONS.map((option) => {
                  const isActive = selectedApp.stage === option.value;

                  return (
                    <button
                      type="button"
                      key={option.value}
                      disabled={isUpdating || isActive}
                      onClick={() => handleStageUpdate(option.value)}
                      className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all ${
                        isActive
                          ? "bg-brand-navy text-brand-gold border-brand-navy font-bold shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      } disabled:cursor-not-allowed`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="block text-xs font-semibold text-slate-600">
                단계 변경 메모
              </label>

              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                maxLength={2000}
                placeholder="예: 지원자와 통화 완료 후 검토 단계로 변경."
                className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy resize-none h-16"
              />

              <p className="text-[11px] text-slate-400">
                이 메모는 단계 변경 이벤트와 함께 Audit Trail에 기록됩니다.
              </p>
            </div>
          </section>

          <ApplicationOperationsPanel
            application={selectedApp}
            onActivityChanged={
              handleOperationsActivityChanged
            }
          />

          <ApplicationActivityPanel
            applicationId={selectedApp.applicationId}
            refreshKey={`${selectedApp.stage}-${activityRevision}`}
          />

          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <span>👤</span>
              구직자 프로필 요약
            </h3>

            {profileLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                권한을 확인하고 프로필을 불러오는 중입니다...
              </div>
            ) : candidateProfile ? (
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400">
                    Headline
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {candidateProfile.headline || "등록된 헤드라인 없음"}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400">
                    핵심 역량 및 스킬
                  </span>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {candidateProfile.skills.length > 0 ? (
                      candidateProfile.skills.map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        등록된 스킬 없음
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400">
                    경력 요약
                  </span>
                  <p className="text-slate-600 text-xs whitespace-pre-wrap mt-0.5">
                    {candidateProfile.careerSummary || "내용 없음"}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500">
                      프로필 완성도
                    </span>
                    <span className="font-bold text-brand-navy">
                      {candidateProfile.profileCompleteness}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                등록된 상세 프로필이 없습니다.
              </p>
            )}
          </section>

          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
              <span>📂</span>
              다른 지원 내역 ({otherApplications.length})
            </h3>

            {otherApplications.length > 0 ? (
              <div className="space-y-2">
                {otherApplications.map((application) => (
                  <div
                    key={application.applicationId}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">
                        {application.jobTitle}
                      </div>
                      <div className="text-slate-500 truncate mt-0.5">
                        {application.company}
                      </div>
                      <div className="text-slate-400 mt-1">
                        {application.appliedAt || "-"}
                      </div>
                    </div>

                    <span className="shrink-0 px-2 py-0.5 bg-white border border-slate-200 font-semibold rounded text-slate-700">
                      {application.stage}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                이외의 다른 지원 내역이 없습니다.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

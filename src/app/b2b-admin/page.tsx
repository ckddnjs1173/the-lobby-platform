"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import { Application, ApplicationStage, Profile } from "../../types";
import { updateApplicationStageTransaction } from "../../lib/applicationEngine";
import ApplicationTable from "../../components/b2b-admin/ApplicationTable";
import ApplicationKanban from "../../components/b2b-admin/ApplicationKanban";
import ApplicationSlideOver from "../../components/b2b-admin/ApplicationSlideOver";
import toast from "react-hot-toast";

export default function B2BAdminPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"TABLE" | "KANBAN">("TABLE");
  
  // Slide-over 상태 관리
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<Profile | null>(null);
  const [otherApplications, setOtherApplications] = useState<Application[]>([]);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  // 1. 지원 내역(Applications) 실시간 동기화
  useEffect(() => {
    const q = query(collection(db, "applications"), orderBy("appliedAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const appsData = await Promise.all(
        snapshot.docs.map(async (appDoc) => {
          const app = appDoc.data() as Application;
          
          let candidateName = "이름 없음";
          let candidatePhone = "-";
          let candidateEmail = "-";
          if (app.candidateId) {
            const candRef = doc(db, "candidates", app.candidateId);
            const candSnap = await getDoc(candRef);
            if (candSnap.exists()) {
              const candData = candSnap.data();
              candidateName = candData.name;
              candidatePhone = candData.phone;
              candidateEmail = candData.email;
            }
          }

          let jobTitle = "공고명 없음";
          let company = "기업명 없음";
          if (app.jobId) {
            const jobRef = doc(db, "jobs", app.jobId);
            const jobSnap = await getDoc(jobRef);
            if (jobSnap.exists()) {
              const jobData = jobSnap.data();
              jobTitle = jobData.title;
              company = jobData.company;
            }
          }

          return {
            ...app,
            candidateName,
            candidatePhone,
            candidateEmail,
            jobTitle,
            company,
          };
        })
      );

      setApplications(appsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. 행 또는 카드 클릭 시 슬라이드 오버 오픈
  const handleSelectApplication = async (app: any) => {
    setSelectedApp(app);
    setIsSlideOverOpen(true);

    if (app.candidateId) {
      const profileRef = doc(db, "profile", app.candidateId);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setCandidateProfile(profileSnap.data() as Profile);
      } else {
        setCandidateProfile(null);
      }

      const others = applications.filter(
        (item) => item.candidateId === app.candidateId && item.applicationId !== app.applicationId
      );
      setOtherApplications(others);
    }
  };

  // 3. 상태 변경 핸들러 (Transaction 엔진 연동)
  const handleStageChange = async (applicationId: string, newStage: ApplicationStage, note?: string) => {
    const result = await updateApplicationStageTransaction(
      applicationId, 
      newStage, 
      "ADMIN_USER", 
      note
    );

    if (result.success) {
      toast.success("지원 단계가 성공적으로 변경되었습니다.");
      setSelectedApp((prev: any) => prev ? { ...prev, stage: newStage } : null);
    } else {
      toast.error(result.error || "상태 변경에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 font-medium">
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">지원자 진행관리 Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">
            총 <span className="font-semibold text-brand-navy">{applications.length}건</span>의 지원 내역이 실시간 연동되어 있습니다.
          </p>
        </div>

        {/* 뷰 전환 토글 버튼 */}
        <div className="bg-slate-200 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => setViewMode("TABLE")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === "TABLE"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 테이블 뷰
          </button>
          <button
            onClick={() => setViewMode("KANBAN")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === "KANBAN"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📊 칸반 보드 뷰
          </button>
        </div>
      </div>

      {/* 뷰 모드에 따른 컴포넌트 렌더링 */}
      <div className="flex-1 min-h-[500px]">
        {viewMode === "TABLE" ? (
          <ApplicationTable
            applications={applications}
            onSelectApplication={handleSelectApplication}
            onStageChange={(id, stage) => handleStageChange(id, stage)}
          />
        ) : (
          <ApplicationKanban
            applications={applications}
            onStageChange={(id, stage) => handleStageChange(id, stage)}
            onSelectApplication={handleSelectApplication}
          />
        )}
      </div>

      {/* Slide-over Detail Panel */}
      <ApplicationSlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        selectedApp={selectedApp}
        candidateProfile={candidateProfile}
        otherApplications={otherApplications}
        onStageChange={handleStageChange}
      />
    </div>
  );
}
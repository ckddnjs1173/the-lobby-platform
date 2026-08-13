"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Job } from "../../types";
import { createApplicationTransaction } from "../../lib/applicationEngine";
import toast from "react-hot-toast";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  // 1. 공고 목록 실시간 동기화 (OPEN 상태 공고 중심 필터링 가능)
  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map((doc) => ({
        jobId: doc.id,
        ...doc.data(),
      })) as Job[];
      setJobs(jobsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. 원클릭 지원 핸들러 (개선된 트랜잭션 엔진 및 OPEN 검증 연동)
  const handleOneClickApply = async (jobId: string) => {
    // 실제 서비스 환경에서는 로그인한 구직자의 내부 candidateId 및 authUid를 주입합니다.
    const candidateId = "cand_test_user_01"; 
    const authUid = "auth_user_uid_placeholder";

    setApplyingJobId(jobId);
    try {
      const result = await createApplicationTransaction(candidateId, jobId, "B2C_WEB", authUid);

      if (result.success) {
        toast.success("성공적으로 지원이 완료되었습니다! 헤드헌터가 곧 연락드립니다.");
      } else {
        toast.error(result.error || "지원에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      toast.error("지원 처리 중 오류가 발생했습니다.");
    } finally {
      setApplyingJobId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
        채용 공고를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">The Lobby 엄선된 커리어 기회</h1>
          <p className="text-slate-500 text-sm">완성된 프로필로 단 한 번의 클릭으로 지원하고 헤드헌터의 밀착 케어를 받으세요.</p>
        </div>

        <div className="grid gap-4 mt-8">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div 
                key={job.jobId}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-brand-gold/20 text-brand-navy text-xs font-bold rounded">
                      {job.company}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{job.location} | {job.salary}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{job.title}</h2>
                  <p className="text-sm text-slate-600 line-clamp-1">{job.description}</p>
                </div>

                <button
                  onClick={() => handleOneKeyApplyAction(job.jobId, job.status)}
                  disabled={applyingJobId === job.jobId || job.status !== "OPEN"}
                  className="w-full md:w-auto px-6 py-3 bg-brand-navy text-brand-gold text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
                >
                  {applyingJobId === job.jobId ? "지원 중..." : job.status === "OPEN" ? "원클릭 지원" : "마감된 공고"}
                </button>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              현재 등록된 채용 공고가 없습니다.
            </div>
          )}
        </div>

      </div>
    </div>
  );
  
  function handleOneKeyApplyAction(jobId: string, status: string) {
    if (status !== "OPEN") {
      toast.error("마감된 공고에는 지원할 수 없습니다.");
      return;
    }
    handleOneClickApply(jobId);
  }
}
"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

interface Job {
  id: string;
  company: string;
  title: string;
  learnPoints: string[];
  salary: string;
  location: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const jobsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];
        setJobs(jobsData);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-brand-navy mb-4">프리미엄 포지션</h1>
          <p className="text-slate-500">당신의 커리어를 한 단계 높여줄 엄선된 기회들입니다.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">공고를 불러오는 중입니다...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">현재 등록된 채용 공고가 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer">
                <div className="flex-1">
                  <span className="text-xs font-bold text-brand-gold tracking-wide mb-2 block">{job.company}</span>
                  <h3 className="text-xl font-bold text-brand-navy mb-3 group-hover:text-slate-600 transition-colors">{job.title}</h3>
                  <div className="bg-brand-light p-3 rounded-lg inline-block">
                    <span className="text-[12px] font-bold text-brand-navy block mb-1">💡 What you will learn</span>
                    <ul className="list-disc pl-4 text-sm text-slate-600 space-y-0.5">
                      {job.learnPoints?.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-3 min-w-[120px]">
                  <div className="text-sm font-medium text-slate-500">📍 {job.location}</div>
                  <div className="text-sm font-medium text-slate-500">💰 {job.salary}</div>
                  <button className="w-full md:w-auto mt-2 bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand-gold transition-colors">
                    원클릭 지원
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
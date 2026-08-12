"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

interface Applicant {
  id: string;
  name: string;
  phone: string;
  skill: string;
  status: string;
  createdAt: any;
}

export default function B2BDashboardHome() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const q = query(collection(db, "applicants"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Applicant[];
        setApplicants(data);
      } catch (error) {
        console.error("Error fetching applicants:", error);
      }
    };
    fetchApplicants();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">대시보드</h2>
          <p className="text-sm text-slate-500 mt-1">오늘 업데이트된 신규 지원자 현황입니다.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-800">최근 인입 지원자</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 font-medium w-12">ID</th>
                <th className="py-2.5 px-4 font-medium">지원자명</th>
                <th className="py-2.5 px-4 font-medium">연락처</th>
                <th className="py-2.5 px-4 font-medium">핵심 역량</th>
                <th className="py-2.5 px-4 font-medium">상태</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {applicants.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400">등록된 지원자가 없습니다.</td></tr>
              ) : (
                applicants.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <td className="py-2 px-4 text-xs font-mono text-slate-400">{i + 1}</td>
                    <td className="py-2 px-4 font-medium text-slate-900">{row.name}</td>
                    <td className="py-2 px-4 text-slate-600">{row.phone}</td>
                    <td className="py-2 px-4 text-slate-600">{row.skill}</td>
                    <td className="py-2 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-700">
                        {row.status || "미확인"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
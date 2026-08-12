"use client";

import { useState } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RegisterProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    skill: "해당 없음 (신입)"
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    // 1. 빈 값 및 공백 검증
    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedName || !trimmedPhone) {
      toast.error("이름과 연락처를 모두 입력해주세요.");
      return;
    }

    // 2. 이름 길이 검증 (최소 2자 이상)
    if (trimmedName.length < 2) {
      toast.error("이름은 2글자 이상 정확히 입력해주세요.");
      return;
    }

    // 3. 연락처 형식 검증 (정규식: 010-XXXX-XXXX 또는 010XXXXXXXX)
    const phoneRegex = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
    if (!phoneRegex.test(trimmedPhone)) {
      toast.error("올바른 연락처 형식을 입력해주세요.\n(예: 010-0000-0000)");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "applicants"), {
        name: trimmedName,
        phone: trimmedPhone, // 필요하다면 하이픈(-)을 자동 추가/제거하는 포맷팅도 가능합니다.
        skill: formData.skill,
        status: "미확인",
        createdAt: serverTimestamp()
      });

      toast.success("프로필이 성공적으로 등록되었습니다!");
      router.push("/jobs");
    } catch (error) {
      console.error("Error submitting profile:", error);
      toast.error("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        
        {/* Form Header */}
        <div className="bg-brand-navy px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold rounded-full opacity-20 blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <h2 className="text-2xl font-bold text-white mb-2">The Lobby 프로필 생성</h2>
          <p className="text-slate-300 text-sm">핵심 정보만으로 빠르게 지원을 완료하세요.</p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">이름 <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy focus:bg-white transition-colors" placeholder="홍길동" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">연락처 <span className="text-red-500">*</span></label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy focus:bg-white transition-colors" placeholder="010-0000-0000" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">핵심 스펙 (선택)</label>
              <select name="skill" value={formData.skill} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy focus:bg-white transition-colors text-slate-600">
                <option value="어학 능통 (영어, 중국어 등)">어학 능통 (영어, 중국어 등)</option>
                <option value="호텔/항공 서비스 전공">호텔/항공 서비스 전공</option>
                <option value="관련 서비스직 1년 이상 경력">관련 서비스직 1년 이상 경력</option>
                <option value="해당 없음 (신입)">해당 없음 (신입)</option>
              </select>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading} className="w-full bg-brand-navy text-brand-gold py-4 rounded-xl text-lg font-bold hover:bg-slate-900 transition-colors shadow-lg hover:shadow-xl mt-4 disabled:opacity-50">
            {loading ? "처리 중..." : "간편 프로필 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
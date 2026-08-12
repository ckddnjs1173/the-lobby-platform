"use client";

import { useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";

export default function RegisterProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    skill: "해당 없음 (신입)"
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !mediaFile) {
      alert("이름, 연락처, 미디어 파일을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 1. Storage에 파일 업로드
      const fileRef = ref(storage, `profiles/${Date.now()}_${mediaFile.name}`);
      await uploadBytes(fileRef, mediaFile);
      const mediaUrl = await getDownloadURL(fileRef);

      // 2. Firestore에 데이터 저장
      await addDoc(collection(db, "applicants"), {
        ...formData,
        mediaUrl,
        status: "미확인",
        createdAt: serverTimestamp()
      });

      alert("프로필이 성공적으로 등록되었습니다!");
      router.push("/jobs");
    } catch (error) {
      console.error("Error submitting profile:", error);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-brand-navy px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold rounded-full opacity-20 blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <h2 className="text-2xl font-bold text-white mb-2">The Lobby 프로필 생성</h2>
          <p className="text-slate-300 text-sm">복잡한 이력서 없이, 1분 만에 당신을 증명하세요.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">1분 자기소개 영상 (또는 사진) <span className="text-red-500">*</span></label>
            <label className="block border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-brand-gold transition-colors cursor-pointer group relative">
              <input type="file" accept="video/mp4,video/quicktime,image/jpeg" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-gold/20 transition-colors">
                <span className="text-2xl">{mediaFile ? "✅" : "📸"}</span>
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">{mediaFile ? mediaFile.name : "클릭하여 파일 업로드"}</p>
              <p className="text-xs text-slate-400">MP4, MOV 또는 JPG (최대 50MB)</p>
            </label>
          </div>

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
            {loading ? "처리 중..." : "프로필 등록 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
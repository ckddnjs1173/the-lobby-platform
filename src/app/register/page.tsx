"use client";

import { useState } from "react";
import { db } from "../../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RegisterProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState<"INPUT" | "PREVIEW">("INPUT");
  const [loading, setLoading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  
  // 기본 폼 및 파싱된 프로필 상태
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    headline: "",
    careerSummary: "",
    skills: "",
  });

  // 1. AI 파싱 요청 핸들러
  const handleAiParse = async () => {
    if (!resumeText.trim()) {
      toast.error("분석할 이력서 텍스트를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai-parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        setFormData((prev) => ({
          ...prev,
          headline: result.data.headline || "",
          careerSummary: result.data.careerSummary || "",
          skills: result.data.skills ? result.data.skills.join(", ") : "",
        }));
        setStep("PREVIEW");
        toast.success("AI가 이력서를 성공적으로 분석했습니다!");
      } else {
        toast.error("이력서 분석에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      toast.error("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 2. 최종 프로필 저장 핸들러 (Candidate & Profile 정규화 구조 반영)
  const handleSaveProfile = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("이름과 연락처는 필수 입력 항목입니다.");
      return;
    }

    setLoading(true);
    try {
      // 임시 구직자 ID (실제 서비스에서는 Firebase Auth UID 연동)
      const candidateId = `cand_${Date.now()}`;
      const now = new Date().toISOString();

      // Candidate 문서 생성
      await setDoc(doc(db, "candidates", candidateId), {
        candidateId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || "no-email@lobby.com",
        accountStatus: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });

      // Profile 문서 생성 (1:1 관계)
      const skillsArray = formData.skills.split(",").map((s) => s.trim()).filter(Boolean);
      await setDoc(doc(db, "profile", candidateId), {
        candidateId,
        headline: formData.headline,
        careerSummary: formData.careerSummary,
        skills: skillsArray,
        careers: [],
        education: [],
        profileCompleteness: 78, // Profile Completion Guidance 적용 점수
        updatedAt: now,
      });

      toast.success("프로필이 성공적으로 생성되었습니다!");
      router.push("/jobs");
    } catch (error) {
      console.error(error);
      toast.error("프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">The Lobby AI 프로필 빌더</h2>
          <p className="text-sm text-slate-500">기존 이력서를 붙여넣고 마찰 없이 커리어 프로필을 완성하세요.</p>
        </div>

        {step === "INPUT" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                기존 이력서 / 경력 기술서 텍스트 붙여넣기
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="여기에 기존 이력서 내용을 그대로 복사해서 붙여넣으세요. (개인정보 보호 정책에 따라 원문은 저장되지 않습니다.)"
                className="w-full h-48 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-navy resize-none font-mono"
              />
            </div>
            <button
              onClick={handleAiParse}
              disabled={loading}
              className="w-full bg-brand-navy text-brand-gold py-4 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-50"
            >
              {loading ? "AI 분석 중..." : "AI로 이력서 자동 구조화하기"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-brand-gold/10 border border-brand-gold/30 rounded-xl text-xs text-brand-navy font-medium">
              💡 프로필 완성도 가이드: <strong>78%</strong> — 세부 경력 항목을 보완하면 매칭 정확도가 더욱 높아집니다!
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">연락처 *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">이메일</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">프로필 헤드라인 (Headline)</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">핵심 역량 및 스킬 (콤마로 구분)</label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">경력 요약</label>
              <textarea
                value={formData.careerSummary}
                onChange={(e) => setFormData({ ...formData, careerSummary: e.target.value })}
                className="w-full h-24 p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep("INPUT")}
                className="w-1/3 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                다시 입력
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="w-2/3 bg-brand-navy text-brand-gold py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg disabled:opacity-50"
              >
                {loading ? "저장 중..." : "프로필 생성 및 완료"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
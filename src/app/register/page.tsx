"use client";

import { useState } from "react";
import { db, auth } from "../../lib/firebase"; // auth 객체 import 필요
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RegisterProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState<"INPUT" | "PREVIEW">("INPUT");
  const [loading, setLoading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "", // 최소 인증을 위한 비밀번호 필드 추가
    headline: "",
    careerSummary: "",
    skills: "",
  });

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

  const handleSaveProfile = async () => {
    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      toast.error("이름, 연락처, 이메일, 비밀번호는 필수 입력 항목입니다.");
      return;
    }

    setLoading(true);
    try {
      // 1. Firebase Auth 최소 인증 (점진적 가입)
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. The Lobby 내부 Candidate 고유 ID 생성
      const candidateRef = doc(collection(db, "candidates"));
      const candidateId = candidateRef.id;

      // 3. Candidate 문서 생성 (authUid 매핑)
      await setDoc(candidateRef, {
        candidateId,
        authUid: user.uid, // Firebase Auth UID 연동
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        accountStatus: "ACTIVE",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 4. Profile 문서 생성 (1:1 관계)
      const skillsArray = formData.skills.split(",").map((s) => s.trim()).filter(Boolean);
      await setDoc(doc(db, "profile", candidateId), {
        candidateId,
        headline: formData.headline,
        careerSummary: formData.careerSummary,
        skills: skillsArray,
        careers: [],
        education: [],
        profileCompleteness: 78,
        updatedAt: serverTimestamp(),
      });

      toast.success("프로필이 성공적으로 생성되었습니다!");
      router.push("/jobs");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("이미 사용 중인 이메일입니다.");
      } else {
        toast.error("프로필 저장 중 오류가 발생했습니다.");
      }
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
                className="w-full h-48 p-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-navy resize-none"
              />
            </div>
            <button
              onClick={handleAiParse}
              disabled={loading}
              className="w-full bg-brand-navy text-brand-gold py-4 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "AI 분석 중..." : "AI로 이력서 자동 구조화하기"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-brand-gold/10 border border-brand-gold/30 rounded-xl text-xs text-brand-navy font-medium">
              ✨ 프로필 완성도 가이드: <strong>78%</strong> - 세부 경력 항목을 보완하면 매칭 정확도가 더욱 높아집니다!
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

            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">계정 이메일 *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">비밀번호 *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
                  placeholder="최소 6자리 이상"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 mt-2">프로필 헤드라인 (Headline)</label>
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
                className="w-2/3 bg-brand-navy text-brand-gold py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
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
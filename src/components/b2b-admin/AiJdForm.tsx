"use client";

import { useState } from "react";

interface JdResult {
  company: string;
  title: string;
  learnPoints: string[];
  salary: string;
  location: string;
}

export default function AiJdForm() {
  const [inputText, setInputText] = useState("");
  const [maskCompany, setMaskCompany] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JdResult | null>(null);

  const handleFormat = async () => {
    if (!inputText) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalText: inputText, maskCompany }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("AI 변환에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-brand-gold">✨</span> AI 공고 자동 포맷팅
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">고객사 블라인드 처리</span>
          <button 
            onClick={() => setMaskCompany(!maskCompany)} 
            className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${maskCompany ? "bg-emerald-500" : "bg-slate-300"}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${maskCompany ? "right-0.5" : "left-0.5"}`}></div>
          </button>
        </div>
      </div>
      
      <div className="p-4 flex gap-4 h-[400px]">
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600 uppercase">Original JD (Paste here)</label>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 w-full p-3 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy resize-none font-mono"
            placeholder="고객사로부터 받은 채용 요강 텍스트를 그대로 붙여넣으세요..."
          />
          <button onClick={handleFormat} disabled={loading} className="w-full bg-slate-800 text-white py-2 rounded-md text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-50">
            {loading ? "AI 변환 중..." : "AI 변환 시작"}
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600 uppercase">The Lobby Formatted JD</label>
          <div className="flex-1 w-full p-4 border border-slate-200 rounded-md bg-white overflow-y-auto">
            {result ? (
              <>
                <div className="mb-4">
                  <span className="px-2 py-1 bg-brand-gold/20 text-brand-navy text-[10px] font-bold rounded-sm tracking-wider">{result.company}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{result.title}</h4>
                <div className="space-y-4 text-sm text-slate-700 mt-4">
                  <div>
                    <strong className="block text-brand-navy mb-1">🎯 What you will learn (스펙업 포인트)</strong>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      {result.learnPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong className="block text-brand-navy mb-1">💼 근무 조건</strong>
                    <p>연봉: {result.salary} / 위치: {result.location}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">변환 결과가 여기에 표시됩니다.</div>
            )}
          </div>
          <button disabled={!result} className="w-full bg-brand-navy text-brand-gold py-2 rounded-md text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:hover:bg-brand-navy">
            공고 즉시 발행
          </button>
        </div>
      </div>
    </div>
  );
}
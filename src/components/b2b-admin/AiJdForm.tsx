"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import {
  JobDescriptionApiError,
  parseJobDescriptionFileViaApi,
  parseJobDescriptionTextViaApi,
  type JobDescriptionParseResult,
} from "../../lib/jobDescriptionApi";

const MAX_JOB_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt"]);

interface AiJdFormProps {
  onParsed: (result: JobDescriptionParseResult) => void;
  disabled?: boolean;
}

function getExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function AiJdForm({ onParsed, disabled = false }: AiJdFormProps) {
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [maskCompany, setMaskCompany] = useState(false);
  const [loadingSource, setLoadingSource] = useState<"TEXT" | "FILE" | null>(null);

  const handleError = (error: unknown) => {
    console.error("AI JD transform failed:", error);
    toast.error(
      error instanceof JobDescriptionApiError || error instanceof Error
        ? error.message
        : "AI 공고 변환에 실패했습니다."
    );
  };

  const handleTextParse = async () => {
    if (!inputText.trim()) {
      toast.error("변환할 채용공고 원문을 붙여넣어주세요.");
      return;
    }

    setLoadingSource("TEXT");
    try {
      const parsed = await parseJobDescriptionTextViaApi({
        jobText: inputText.trim(),
        maskCompany,
      });
      onParsed(parsed);
      toast.success("공고 원문을 The Lobby 양식으로 변환했습니다. 내용을 확인해주세요.");
    } catch (error) {
      handleError(error);
    } finally {
      setLoadingSource(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) {
      setFile(null);
      return;
    }

    if (!ALLOWED_EXTENSIONS.has(getExtension(selected.name))) {
      toast.error("PDF, DOCX, TXT 공고 파일만 선택할 수 있습니다.");
      event.currentTarget.value = "";
      setFile(null);
      return;
    }

    if (selected.size > MAX_JOB_FILE_BYTES) {
      toast.error("공고 파일은 8MB 이하만 업로드할 수 있습니다.");
      event.currentTarget.value = "";
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleFileParse = async () => {
    if (!file) {
      toast.error("변환할 채용공고 파일을 선택해주세요.");
      return;
    }

    setLoadingSource("FILE");
    try {
      const parsed = await parseJobDescriptionFileViaApi({ file, maskCompany });
      onParsed(parsed);
      toast.success("공고 파일을 The Lobby 양식으로 변환했습니다. 내용을 확인해주세요.");
    } catch (error) {
      handleError(error);
    } finally {
      setLoadingSource(null);
    }
  };

  const busy = disabled || loadingSource !== null;

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-gold/25 bg-slate-950 text-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold">AI JD Intake</p>
          <h3 className="mt-1 text-base font-bold">받은 공고문을 그대로 넣어주세요</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            PDF·DOCX·TXT 또는 원문 텍스트를 분석해 현재 공고 등록 양식에 자동으로 채웁니다.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <span className="text-xs font-semibold text-slate-300">기업명 블라인드</span>
          <input
            type="checkbox"
            checked={maskCompany}
            onChange={(event) => setMaskCompany(event.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-amber-400"
          />
        </label>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <div className="flex min-h-[260px] flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">공고 원문 붙여넣기</p>
              <p className="mt-1 text-[10px] text-slate-400">메일·메신저·웹에서 받은 내용을 그대로 붙여넣습니다.</p>
            </div>
            <span className="text-[10px] text-slate-500">최대 40,000자</span>
          </div>
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            disabled={busy}
            className="min-h-[150px] flex-1 resize-y rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-brand-gold/60"
            placeholder="예) 고객사명, 모집 포지션, 담당업무, 자격요건, 우대사항, 근무지, 급여, 고용형태..."
          />
          <button
            type="button"
            onClick={() => void handleTextParse()}
            disabled={busy || !inputText.trim()}
            className="mt-3 rounded-xl bg-brand-gold px-4 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loadingSource === "TEXT" ? "AI가 양식화하는 중..." : "원문 AI 양식화"}
          </button>
        </div>

        <div className="flex min-h-[260px] flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div>
            <p className="text-xs font-bold text-white">공고 파일 업로드</p>
            <p className="mt-1 text-[10px] text-slate-400">PDF·DOCX·TXT, 최대 8MB. 원본 파일은 저장하지 않습니다.</p>
          </div>

          <label className="mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-slate-900/70 px-5 py-8 text-center hover:border-brand-gold/50">
            <input
              key={file ? `${file.name}-${file.size}` : "job-file-empty"}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              disabled={busy}
              className="sr-only"
            />
            <span className="text-2xl" aria-hidden="true">↥</span>
            <span className="mt-3 text-sm font-bold text-white">
              {file ? "다른 공고 파일 선택" : "공고 파일 선택"}
            </span>
            <span className="mt-1 max-w-full truncate text-xs text-slate-400">
              {file ? `${file.name} · ${formatFileSize(file.size)}` : "클릭해서 파일을 선택하세요"}
            </span>
          </label>

          {file ? (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <span className="min-w-0 truncate text-slate-300">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={busy}
                className="ml-3 shrink-0 font-bold text-slate-400 hover:text-white"
              >
                제거
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleFileParse()}
            disabled={busy || !file}
            className="mt-3 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loadingSource === "FILE" ? "AI가 파일을 분석하는 중..." : "파일 AI 양식화"}
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-3 text-[10px] leading-5 text-slate-500">
        AI 변환 결과는 즉시 공개되지 않습니다. 아래 등록 양식에 채워진 결과를 담당자가 검토한 뒤 초안 저장 또는 공개합니다.
      </div>
    </section>
  );
}

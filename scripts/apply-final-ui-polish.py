from pathlib import Path

path = Path("src/app/register/page.tsx")
source = path.read_text(encoding="utf-8")

old = '''                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleResumeFileChange}
                  disabled={loading}
                  className="mt-4 block w-full text-xs text-brand-muted file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-bronze"
                />
                {resumeFile ? (
                  <button
                    type="button"
                    onClick={() => void handleResumeFileParse()}
                    disabled={loading}
                    className="mt-4 w-full rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {loading ? "파일 분석 중..." : `${resumeFile.name} AI 분석`}
                  </button>
                ) : null}'''

new = '''                <label
                  className={`mt-4 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg border border-brand-line bg-white px-4 py-3 transition hover:border-brand-gold/55 hover:bg-brand-ivory ${loading ? "pointer-events-none opacity-50" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-brand-bronze">
                      {resumeFile ? "다른 파일 선택" : "이력서 파일 선택"}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-brand-muted">
                      {resumeFile ? resumeFile.name : "PDF, DOCX, TXT 파일을 선택해주세요."}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-brand-espresso px-3 py-2 text-[10px] font-bold text-white">
                    찾아보기
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleResumeFileChange}
                    disabled={loading}
                    className="sr-only"
                  />
                </label>
                {resumeFile ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-brand-line/80 bg-white/70 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-brand-ink">{resumeFile.name}</p>
                      <p className="mt-1 text-[9px] text-brand-muted">
                        {(resumeFile.size / 1024 / 1024).toFixed(2)} MB · 업로드 전 AI 분석
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      disabled={loading}
                      className="shrink-0 text-[10px] font-bold text-brand-muted transition hover:text-brand-danger disabled:opacity-50"
                    >
                      제거
                    </button>
                  </div>
                ) : null}
                {resumeFile ? (
                  <button
                    type="button"
                    onClick={() => void handleResumeFileParse()}
                    disabled={loading}
                    className="mt-3 w-full rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:opacity-50"
                  >
                    {loading ? "파일 분석 중..." : "선택한 이력서 AI 분석"}
                  </button>
                ) : null}'''

if old not in source:
    raise SystemExit("REGISTER_NATIVE_FILE_INPUT_BLOCK_NOT_FOUND")

source = source.replace(old, new, 1)
path.write_text(source, encoding="utf-8")

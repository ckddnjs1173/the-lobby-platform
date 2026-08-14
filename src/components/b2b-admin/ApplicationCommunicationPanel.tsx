"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  ApplicationView,
} from "../../types";

import {
  ApplicationCommunicationApiError,
  listApplicationCommunicationsViaApi,
  listApplicationCommunicationTemplatesViaApi,
  sendApplicationEmailViaApi,
  type ApplicationCommunicationTemplateView,
  type ApplicationCommunicationView,
} from "../../lib/applicationCommunicationApi";

interface ApplicationCommunicationPanelProps {
  application: ApplicationView;
  refreshKey?: number | string;
  onActivityChanged?: () => void;
}

function createRequestId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `mail_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(
  status: ApplicationCommunicationView["status"]
): string {
  if (status === "SENT") {
    return "발송완료";
  }

  if (status === "FAILED") {
    return "발송실패";
  }

  return "처리중";
}

export default function ApplicationCommunicationPanel({
  application,
  refreshKey = 0,
  onActivityChanged,
}: ApplicationCommunicationPanelProps) {
  const [communications, setCommunications] =
    useState<ApplicationCommunicationView[]>([]);
  const [templates, setTemplates] =
    useState<ApplicationCommunicationTemplateView[]>([]);
  const [subject, setSubject] =
    useState("");
  const [body, setBody] =
    useState("");
  const [requestId, setRequestId] =
    useState(createRequestId);
  const [loading, setLoading] =
    useState(false);
  const [templatesLoading, setTemplatesLoading] =
    useState(false);
  const [sending, setSending] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [notice, setNotice] =
    useState<string | null>(null);

  const loadCommunications =
    useCallback(async () => {
      setLoading(true);

      try {
        const items =
          await listApplicationCommunicationsViaApi(
            application.applicationId
          );

        setCommunications(items);
      } catch (loadError) {
        const message =
          loadError instanceof ApplicationCommunicationApiError
            ? loadError.message
            : "이메일 발송 이력을 불러오지 못했습니다.";

        setError(message);
      } finally {
        setLoading(false);
      }
    }, [application.applicationId]);

  const loadTemplates =
    useCallback(async () => {
      setTemplatesLoading(true);

      try {
        const items =
          await listApplicationCommunicationTemplatesViaApi(
            application.applicationId
          );

        setTemplates(items);
      } catch (loadError) {
        const message =
          loadError instanceof ApplicationCommunicationApiError
            ? loadError.message
            : "자동 이메일 초안을 불러오지 못했습니다.";

        setError(message);
      } finally {
        setTemplatesLoading(false);
      }
    }, [application.applicationId]);

  useEffect(() => {
    setCommunications([]);
    setTemplates([]);
    setSubject("");
    setBody("");
    setRequestId(createRequestId());
    setError(null);
    setNotice(null);

    void Promise.all([
      loadCommunications(),
      loadTemplates(),
    ]);
  }, [
    application.applicationId,
    loadCommunications,
    loadTemplates,
  ]);

  useEffect(() => {
    if (refreshKey === 0) {
      return;
    }

    void Promise.all([
      loadCommunications(),
      loadTemplates(),
    ]);
  }, [
    refreshKey,
    loadCommunications,
    loadTemplates,
  ]);

  const updateSubject = (
    value: string
  ) => {
    setSubject(value);
    setRequestId(createRequestId());
    setError(null);
    setNotice(null);
  };

  const updateBody = (
    value: string
  ) => {
    setBody(value);
    setRequestId(createRequestId());
    setError(null);
    setNotice(null);
  };

  const applyTemplate = (
    template: ApplicationCommunicationTemplateView
  ) => {
    setSubject(template.subject);
    setBody(template.body);
    setRequestId(createRequestId());
    setError(null);
    setNotice(
      template.recommended
        ? `현재 지원 단계에 추천되는 초안을 적용했습니다. ${template.reason}`
        : `${template.label} 초안을 적용했습니다. 발송 전 내용을 확인해주세요.`
    );
  };

  const handleSend = async () => {
    if (
      !subject.trim() ||
      !body.trim() ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError(null);
    setNotice(null);

    try {
      const sent =
        await sendApplicationEmailViaApi(
          application.applicationId,
          {
            requestId,
            subject: subject.trim(),
            body: body.trim(),
          }
        );

      setCommunications(
        (previous) => [
          sent,
          ...previous.filter(
            (item) =>
              item.communicationId !==
              sent.communicationId
          ),
        ]
      );
      setNotice(
        `${sent.to} 주소로 이메일을 발송했습니다.`
      );
      setSubject("");
      setBody("");
      setRequestId(createRequestId());
      onActivityChanged?.();
    } catch (sendError) {
      const message =
        sendError instanceof ApplicationCommunicationApiError
          ? sendError.message
          : "이메일 발송에 실패했습니다.";

      setError(
        `${message} 내용 수정 없이 다시 시도하면 동일 요청 ID를 재사용합니다.`
      );

      await loadCommunications();
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="border-b pb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>✉️</span>
          지원자 이메일
        </h3>

        <span className="text-[11px] text-slate-400 truncate">
          {application.candidateEmail || "이메일 없음"}
        </span>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">
              워크플로우 자동 초안
            </span>
            {templatesLoading ? (
              <span className="text-[10px] text-slate-400">
                최신 전형 정보 반영 중...
              </span>
            ) : null}
          </div>

          {templates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  type="button"
                  key={template.key}
                  onClick={() =>
                    applyTemplate(template)
                  }
                  disabled={sending}
                  title={template.reason}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border disabled:opacity-50 ${
                    template.recommended
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {template.recommended
                    ? "추천 · "
                    : ""}
                  {template.label}
                </button>
              ))}
            </div>
          ) : !templatesLoading ? (
            <p className="text-[11px] text-slate-400">
              현재 전형 정보로 생성할 수 있는 자동 초안이 없습니다. 직접 작성할 수 있습니다.
            </p>
          ) : null}
        </div>

        <input
          value={subject}
          onChange={(event) =>
            updateSubject(
              event.target.value
            )
          }
          maxLength={200}
          placeholder="이메일 제목"
          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy"
        />

        <textarea
          value={body}
          onChange={(event) =>
            updateBody(
              event.target.value
            )
          }
          maxLength={10_000}
          placeholder="지원자에게 전달할 내용을 입력해주세요."
          className="w-full min-h-36 px-3 py-2 text-xs leading-5 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-navy resize-y"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 leading-4">
            초안은 최신 지원·면접·채용 결과를 서버에서 읽어 생성합니다. 자동 발송하지 않으며 Recruiter가 최종 확인 후 발송합니다. 수신자는 지원서 이메일로 서버가 고정합니다.
          </p>

          <button
            type="button"
            onClick={handleSend}
            disabled={
              sending ||
              !subject.trim() ||
              !body.trim() ||
              !application.candidateEmail
            }
            className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-brand-navy text-brand-gold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending
              ? "발송 중..."
              : "이메일 발송"}
          </button>
        </div>
      </div>

      {notice ? (
        <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            최근 발송 이력
          </span>
          <button
            type="button"
            onClick={() =>
              void loadCommunications()
            }
            disabled={loading}
            className="text-[11px] font-semibold text-slate-500 hover:text-brand-navy disabled:opacity-40"
          >
            새로고침
          </button>
        </div>

        {loading &&
        communications.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">
            발송 이력을 불러오는 중입니다...
          </p>
        ) : communications.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">
            아직 기록된 이메일이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {communications
              .slice(0, 8)
              .map((item) => (
                <div
                  key={item.communicationId}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {item.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateTime(
                          item.sentAt ||
                            item.failedAt ||
                            item.createdAt
                        )}
                        {item.attempts > 1
                          ? ` · 시도 ${item.attempts}회`
                          : ""}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === "SENT"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "FAILED"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  {item.status === "FAILED" &&
                  item.errorMessage ? (
                    <p className="text-[11px] text-rose-600 line-clamp-2">
                      {item.errorMessage}
                    </p>
                  ) : null}
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}

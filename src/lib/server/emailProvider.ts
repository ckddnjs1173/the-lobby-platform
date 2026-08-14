export class EmailProviderError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    status = 502,
    code = "EMAIL_PROVIDER_ERROR",
    retryable = false
  ) {
    super(message);
    this.name = "EmailProviderError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export interface SendEmailProviderInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}

export interface SendEmailProviderResult {
  provider: "RESEND";
  messageId: string;
}

interface ResendResponseBody {
  id?: unknown;
  name?: unknown;
  message?: unknown;
}

function requireEnvironmentValue(
  key: "RESEND_API_KEY" | "COMMUNICATION_FROM_EMAIL"
): string {
  const value =
    process.env[key]?.trim();

  if (!value) {
    throw new EmailProviderError(
      `${key} 환경변수가 설정되지 않았습니다.`,
      503,
      "COMMUNICATION_PROVIDER_NOT_CONFIGURED",
      false
    );
  }

  return value;
}

function normalizeProviderErrorMessage(
  body: ResendResponseBody | null,
  status: number
): string {
  if (
    body &&
    typeof body.message === "string" &&
    body.message.trim()
  ) {
    return body.message.trim().slice(0, 500);
  }

  return `이메일 발송 서비스가 요청을 처리하지 못했습니다. (HTTP ${status})`;
}

async function sendWithResend(
  input: SendEmailProviderInput
): Promise<SendEmailProviderResult> {
  const apiKey =
    requireEnvironmentValue(
      "RESEND_API_KEY"
    );
  const from =
    requireEnvironmentValue(
      "COMMUNICATION_FROM_EMAIL"
    );

  let response: Response;

  try {
    response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
          "Idempotency-Key":
            input.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      }
    );
  } catch (error) {
    console.error(
      "Email provider network failure:",
      error instanceof Error
        ? error.message
        : "unknown"
    );

    throw new EmailProviderError(
      "이메일 발송 서비스에 연결할 수 없습니다.",
      502,
      "EMAIL_PROVIDER_NETWORK_ERROR",
      true
    );
  }

  let body:
    ResendResponseBody | null = null;

  try {
    body =
      (await response.json()) as ResendResponseBody;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const retryable =
      response.status === 408 ||
      response.status === 409 ||
      response.status === 429 ||
      response.status >= 500;

    throw new EmailProviderError(
      normalizeProviderErrorMessage(
        body,
        response.status
      ),
      response.status === 429
        ? 429
        : response.status >= 500
          ? 502
          : 400,
      typeof body?.name === "string" &&
      body.name.trim()
        ? `RESEND_${body.name.trim().toUpperCase()}`
        : "RESEND_REQUEST_FAILED",
      retryable
    );
  }

  if (
    !body ||
    typeof body.id !== "string" ||
    !body.id.trim()
  ) {
    throw new EmailProviderError(
      "이메일 발송 서비스의 응답에서 메시지 ID를 확인할 수 없습니다.",
      502,
      "EMAIL_PROVIDER_RESPONSE_INVALID",
      true
    );
  }

  return {
    provider: "RESEND",
    messageId:
      body.id.trim(),
  };
}

export async function sendEmailWithProvider(
  input: SendEmailProviderInput
): Promise<SendEmailProviderResult> {
  const configuredProvider =
    (
      process.env.COMMUNICATION_EMAIL_PROVIDER ||
      "RESEND"
    )
      .trim()
      .toUpperCase();

  if (configuredProvider !== "RESEND") {
    throw new EmailProviderError(
      "지원하지 않는 이메일 발송 provider입니다.",
      503,
      "COMMUNICATION_PROVIDER_UNSUPPORTED",
      false
    );
  }

  return sendWithResend(
    input
  );
}

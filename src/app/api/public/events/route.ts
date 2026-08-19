import { NextResponse } from "next/server";

import {
  PUBLIC_EVENT_NAMES,
  recordPublicEvent,
} from "../../../../lib/server/publicEventService";
import {
  consumeRateLimit,
  createRateLimitHeaders,
  getRequestClientKey,
} from "../../../../lib/server/requestRateLimit";

export const runtime = "nodejs";

const CLIENT_EVENT_NAMES = new Set(["page_view"]);

function normalizePath(value: unknown): string {
  if (typeof value !== "string") return "/";
  const path = value.trim();
  if (!path.startsWith("/") || path.length > 300) return "/";
  return path.split("?")[0].split("#")[0] || "/";
}

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(
    `public-event:${getRequestClientKey(request)}`,
    { limit: 120, windowMs: 60_000 }
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "요청이 너무 많습니다.", code: "RATE_LIMITED" },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "요청 형식이 올바르지 않습니다.", code: "INVALID_JSON_BODY" },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  const record = typeof body === "object" && body !== null
    ? body as Record<string, unknown>
    : {};
  const eventName = typeof record.eventName === "string" ? record.eventName.trim() : "";

  if (!CLIENT_EVENT_NAMES.has(eventName) || !PUBLIC_EVENT_NAMES.has(eventName)) {
    return NextResponse.json(
      { success: false, error: "허용되지 않은 이벤트입니다.", code: "INVALID_EVENT_NAME" },
      { status: 400, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    await recordPublicEvent(eventName, normalizePath(record.path));
    return NextResponse.json(
      { success: true },
      { status: 201, headers: createRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error("Public event write failed:", error);
    return NextResponse.json(
      { success: false, error: "이벤트 저장에 실패했습니다.", code: "EVENT_WRITE_FAILED" },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}

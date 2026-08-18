const JOB_IMAGES = {
  corporate: [
    "https://images.unsplash.com/photo-1775447665921-87fb172bf115?auto=format&fit=crop&w=1400&q=86",
  ],
  hotel: [
    "https://images.unsplash.com/photo-1758193783649-13371d7fb8dd?auto=format&fit=crop&w=1400&q=86",
  ],
  clinic: [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=86",
  ],
  showroom: [
    "https://images.unsplash.com/photo-1676288176820-a5a954d81e6e?auto=format&fit=crop&w=1400&q=86",
  ],
  lounge: [
    "https://images.unsplash.com/photo-1758448511255-ac2a24a135d7?auto=format&fit=crop&w=1400&q=86",
  ],
} as const;

export type JobVisualCategory = keyof typeof JOB_IMAGES;

interface JobPresentationSource {
  title: string;
  company?: string | null;
  displayCompany?: string | null;
}

export function normalizeJobText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function compactText(value: string, maxLength: number): string {
  const normalized = normalizeJobText(value);

  if (!normalized) {
    return "협의";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

export function getJobTimestampMillis(value: unknown): number {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value !== "object" || value === null) {
    return 0;
  }

  const timestamp = value as { toMillis?: () => number };

  if (typeof timestamp.toMillis !== "function") {
    return 0;
  }

  try {
    return timestamp.toMillis();
  } catch {
    return 0;
  }
}

export function getJobCategory(job: JobPresentationSource): JobVisualCategory {
  const text = `${job.title} ${job.company || ""} ${job.displayCompany || ""}`.toLocaleLowerCase(
    "ko-KR"
  );

  if (
    text.includes("자동차") ||
    text.includes("전시장") ||
    text.includes("쇼룸") ||
    text.includes("딜러") ||
    text.includes("모터")
  ) {
    return "showroom";
  }

  if (
    text.includes("병원") ||
    text.includes("의원") ||
    text.includes("클리닉") ||
    text.includes("clinic") ||
    text.includes("medical")
  ) {
    return "clinic";
  }

  if (
    text.includes("호텔") ||
    text.includes("리조트") ||
    text.includes("프론트") ||
    text.includes("컨시어지") ||
    text.includes("hotel")
  ) {
    return "hotel";
  }

  if (
    text.includes("vip") ||
    text.includes("라운지") ||
    text.includes("의전") ||
    text.includes("lounge")
  ) {
    return "lounge";
  }

  return "corporate";
}

export function getJobCategoryLabel(category: JobVisualCategory): string {
  switch (category) {
    case "hotel":
      return "호텔 · 프론트";
    case "clinic":
      return "병원 · 클리닉";
    case "showroom":
      return "전시장 · 쇼룸";
    case "lounge":
      return "VIP · 라운지";
    default:
      return "기업 리셉션";
  }
}

export function getJobImage(job: JobPresentationSource): string {
  const category = getJobCategory(job);
  return JOB_IMAGES[category][0];
}

export function formatJobLocation(value: string | null | undefined): string {
  const normalized = normalizeJobText(value);

  if (!normalized) {
    return "협의";
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const first = tokens[0] || "";
  const second = tokens[1] || "";
  const regionPrefix = /^(서울|경기|인천|부산|대구|대전|광주|울산|세종|제주|강원|충북|충남|전북|전남|경북|경남)/;

  if (regionPrefix.test(first) && second) {
    return `${first} ${second}`;
  }

  return compactText(normalized, 18);
}

export function formatJobEmploymentType(
  value: string | null | undefined
): string {
  const normalized = normalizeJobText(value);

  if (!normalized) {
    return "협의";
  }

  const employment =
    normalized.includes("정규")
      ? "정규직"
      : normalized.includes("파견")
        ? "파견계약직"
        : normalized.includes("계약")
          ? "계약직"
          : normalized.includes("인턴")
            ? "인턴"
            : normalized.includes("아르바이트") || normalized.includes("알바")
              ? "아르바이트"
              : "";

  const durationMatch = normalized.match(/(?:최초\s*)?(\d+)\s*년/);

  if (employment && durationMatch && employment !== "정규직") {
    return `${employment} · ${durationMatch[1]}년`;
  }

  if (employment) {
    return employment;
  }

  const firstSegment = normalized.split(/[·/|]/)[0]?.trim() || normalized;
  return compactText(firstSegment, 16);
}

export function formatJobSalary(value: string | null | undefined): string {
  const normalized = normalizeJobText(value);

  if (!normalized) {
    return "협의";
  }

  const monthly = normalized.match(/월\s*[0-9,.]+\s*(?:만원|원)(?:\s*이상)?/);

  if (monthly?.[0]) {
    return monthly[0].replace(/\s+/g, " ").trim();
  }

  const annual = normalized.match(
    /(?:연봉|연)\s*[0-9,.]+\s*(?:만원|원)?(?:\s*이상)?/
  );

  if (annual?.[0]) {
    return annual[0].replace(/\s+/g, " ").trim();
  }

  const firstSegment = normalized.split(/[·|]/)[0]?.trim() || normalized;
  return compactText(firstSegment, 20);
}

export function getJobDisplayCompany(job: JobPresentationSource): string {
  return (
    normalizeJobText(job.displayCompany) ||
    normalizeJobText(job.company) ||
    "The Lobby Partner"
  );
}

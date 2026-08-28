const { test, expect } = require("@playwright/test");

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchOpenJobs(request) {
  const response = await request.get("/api/public/jobs");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(
    metrics.scrollWidth,
    `Horizontal overflow detected: ${metrics.scrollWidth}px document on ${metrics.viewportWidth}px viewport`
  ).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

async function expectReadableTypography(page, label) {
  const violations = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll("header *, main *"));

    return candidates
      .filter((element) => {
        if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH"].includes(element.tagName)) return false;
        const directText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (!directText) return false;

        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const style = window.getComputedStyle(element);
        const directText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        return {
          tag: element.tagName.toLowerCase(),
          text: directText.slice(0, 80),
          fontSize: Number.parseFloat(style.fontSize),
        };
      })
      .filter((item) => Number.isFinite(item.fontSize) && item.fontSize < 10.5)
      .slice(0, 20);
  });

  expect(violations, `${label} has visible text below the 10.5px readability floor`).toEqual([]);
}

test("public acquisition and legal routes render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("THE LOBBY").first()).toBeVisible();

  await page.goto("/talent-pool");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "공고가 없어도, 먼저 연결될 준비를 하세요.",
    })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /인재풀 프로필 등록/ })).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "개인정보 처리방침" })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "The Lobby 이용약관" })).toBeVisible();
});

test("public typography keeps visible copy above the readability floor", async ({ page, request }) => {
  const routes = ["/", "/jobs", "/talent-pool", "/privacy", "/terms"];
  const jobs = await fetchOpenJobs(request);
  if (jobs[0]?.jobId) routes.push(`/jobs/${encodeURIComponent(jobs[0].jobId)}`);

  for (const route of routes) {
    await page.goto(route);
    await expectReadableTypography(page, route);
  }
});

test("talent-pool onboarding requires explicit registration consent", async ({ page }) => {
  await page.goto("/talent-pool/register");
  await expect(page).toHaveURL(/\/register\/consent$/);
  await expect(page.getByRole("heading", { name: "프로필 등록 전 확인해주세요" })).toBeVisible();

  const checkboxes = page.getByRole("checkbox");
  await expect(checkboxes).toHaveCount(2);
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();

  await page.getByRole("button", { name: "동의하고 프로필 등록 계속" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByText("프로필 등록").first()).toBeVisible();
  await expect(page.getByText("AI 이력서 분석 및 국외 처리 동의 (선택)")).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(1);
});

test("direct registration is gated by consent", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register\/consent$/);
});

test("AI resume parser rejects missing overseas-transfer consent", async ({ request }) => {
  const response = await request.post("/api/ai-parse-resume", {
    data: { resumeText: "이름: 테스트 후보자" },
  });
  expect(response.status()).toBe(400);
  const payload = await response.json();
  expect(payload?.code).toBe("AI_TRANSFER_CONSENT_REQUIRED");
});

test("search discovery endpoints are published", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  expect(xml).toContain("/jobs");
  expect(xml).toContain("/talent-pool");
});

test("public inventory contains only current publishable positions", async ({ request }) => {
  const jobs = await fetchOpenJobs(request);
  const today = todayInSeoul();

  expect(
    jobs.length,
    "Public launch inventory is empty. If a talent-pool-only launch is intended, change this gate explicitly instead of silently shipping zero jobs."
  ).toBeGreaterThan(0);

  const seenJobIds = new Set();

  for (const job of jobs) {
    const missingStructuredFields = [
      "workplaceName",
      "employingCompany",
      "salaryBase",
      "workSchedule",
      "workHours",
      "contractPeriod",
      "detailedLocation",
    ].filter((key) => !String(job?.[key] || "").trim());

    const expectedStartDatePast =
      /^\d{4}-\d{2}-\d{2}$/.test(job.expectedStartDate || "") &&
      job.expectedStartDate < today;

    console.log(
      "PUBLIC_JOB_AUDIT:",
      JSON.stringify({
        jobId: job.jobId,
        title: job.title,
        workplaceName: job.workplaceName || null,
        employingCompany: job.employingCompany || null,
        location: job.location,
        employmentType: job.employmentType,
        applicationDeadline: job.applicationDeadline || null,
        interviewSchedule: job.interviewSchedule || null,
        expectedStartDate: job.expectedStartDate || null,
        expectedStartDatePast,
        missingStructuredFields,
      })
    );

    expect(
      missingStructuredFields,
      `Public job is missing structured launch fields: ${job.jobId}`
    ).toEqual([]);
    expect(
      expectedStartDatePast,
      `Public job has a past expected start date: ${job.jobId}`
    ).toBeFalsy();

    expect(String(job.jobId || "").trim()).not.toBe("");
    expect(String(job.title || "").trim()).not.toBe("");
    expect(String(job.location || "").trim()).not.toBe("");
    expect(String(job.employmentType || "").trim()).not.toBe("");
    expect(String(job.salaryBase || job.salary || "").trim()).not.toBe("");
    expect(job.status).toBe("OPEN");
    expect(seenJobIds.has(job.jobId), `Duplicate public jobId: ${job.jobId}`).toBeFalsy();
    seenJobIds.add(job.jobId);

    expect(`${job.title} ${job.displayCompany || ""}`).not.toMatch(
      /\bE2E\b|Phase\s*\d+\s*Test|Test Company/i
    );

    if (/^\d{4}-\d{2}-\d{2}$/.test(job.applicationDeadline || "")) {
      expect(
        job.applicationDeadline >= today,
        `Expired OPEN job leaked publicly: ${job.jobId}`
      ).toBeTruthy();
    }
  }
});

test("open job detail exposes JobPosting structured data", async ({ page, request }) => {
  const jobs = await fetchOpenJobs(request);
  expect(jobs.length).toBeGreaterThan(0);

  const job = jobs[0];
  await page.goto(`/jobs/${encodeURIComponent(job.jobId)}`);
  await expect(page.getByRole("heading", { name: job.title })).toBeVisible();
  await expect(page.getByText("근무·고용 핵심조건")).toBeVisible();

  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const content = await jsonLd.textContent();
  expect(content).toContain('"@type":"JobPosting"');
});

test.describe("mobile public journey", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("home, mobile navigation, jobs and detail fit the viewport", async ({ page, request }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /리셉션·고객서비스/ })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectReadableTypography(page, "mobile home");

    await page.getByRole("button", { name: "메뉴 열기" }).click();
    const mobileNav = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "인재풀", exact: true })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "기업 로그인", exact: true })).toBeVisible();

    await mobileNav.getByRole("link", { name: "채용공고", exact: true }).click();
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByRole("heading", { level: 1, name: "채용공고 탐색" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectReadableTypography(page, "mobile jobs");

    const jobs = await fetchOpenJobs(request);
    expect(jobs.length).toBeGreaterThan(0);
    const job = jobs[0];

    await page.goto(`/jobs/${encodeURIComponent(job.jobId)}`);
    await expect(page.getByRole("heading", { name: job.title })).toBeVisible();
    await expect(page.getByText("근무·고용 핵심조건")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectReadableTypography(page, "mobile job detail");
  });
});

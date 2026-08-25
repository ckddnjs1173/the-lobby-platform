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
});

test("direct registration is gated by consent", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register\/consent$/);
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

    await page.getByRole("button", { name: "메뉴 열기" }).click();
    const mobileNav = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "인재풀", exact: true })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "기업 로그인", exact: true })).toBeVisible();

    await mobileNav.getByRole("link", { name: "채용공고", exact: true }).click();
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByRole("heading", { level: 1, name: "채용공고 탐색" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const jobs = await fetchOpenJobs(request);
    expect(jobs.length).toBeGreaterThan(0);
    const job = jobs[0];

    await page.goto(`/jobs/${encodeURIComponent(job.jobId)}`);
    await expect(page.getByRole("heading", { name: job.title })).toBeVisible();
    await expect(page.getByText("근무·고용 핵심조건")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

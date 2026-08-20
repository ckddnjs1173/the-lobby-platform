const { test, expect } = require("@playwright/test");

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

test("open job detail exposes JobPosting structured data when inventory exists", async ({ page, request }) => {
  const response = await request.get("/api/public/jobs");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const jobs = Array.isArray(payload?.data) ? payload.data : [];

  test.skip(jobs.length === 0, "No OPEN job exists in the release project.");

  const job = jobs[0];
  await page.goto(`/jobs/${encodeURIComponent(job.jobId)}`);
  await expect(page.getByRole("heading", { name: job.title })).toBeVisible();

  const jsonLd = page.locator('script[type="application/ld+json"]');
  await expect(jsonLd).toHaveCount(1);
  const content = await jsonLd.textContent();
  expect(content).toContain('"@type":"JobPosting"');
});
